import type {
  Command,
  CommandHistoryQuery,
  CommandResult,
  ControlPoint,
  ExecuteCommandRequest,
  Interlock
} from '../../../shared/types/config.types';
import type { Reading } from '../../../shared/types/monitoring.types';
import type { ConfigService } from '../config/config.service';
import type { DataServiceManager } from '../data/data-service-manager';
import type { EventLogService } from '../event-log/event-log.service';

export class CommandService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly dataServiceManager: DataServiceManager,
    private readonly eventLogService: EventLogService
  ) {}

  public async execute(request: ExecuteCommandRequest): Promise<CommandResult> {
    const config = this.configService.getCurrentConfig();
    const requestedAt = new Date().toISOString();
    const commandId = `command-${Date.now()}`;
    const actuator = config.actuators.find((item) => item.id === request.actuatorId);

    if (!actuator) {
      return this.persistCommand({
        id: commandId,
        actuatorId: request.actuatorId,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'failed',
        error: 'Actuator not found'
      });
    }

    if (!actuator.enabled) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'blocked',
        error: 'Actuator is disabled'
      });
    }

    if (!actuator.supportedCommands.includes(request.commandType)) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'rejected',
        error: 'Command is not supported by actuator'
      });
    }

    const controlPoint = this.findControlPoint(actuator.commandPointIds);
    if (!controlPoint) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'failed',
        error: 'ControlPoint not found'
      });
    }

    if (controlPoint.allowedValues && request.value !== undefined && !controlPoint.allowedValues.includes(request.value)) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'rejected',
        error: 'Command value is not allowed'
      });
    }

    if ((controlPoint.requiresConfirmation || controlPoint.safetyLevel !== 'normal') && !request.confirmed) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'pendingConfirmation',
        error: 'Command requires confirmation'
      });
    }

    const blockedBy = await this.findBlockingInterlock(actuator.id, request.commandType);
    if (blockedBy) {
      return this.persistCommand({
        id: commandId,
        actuatorId: actuator.id,
        commandType: request.commandType,
        value: request.value,
        requestedBy: request.requestedBy,
        requestedAt,
        status: 'blocked',
        error: blockedBy.message
      });
    }

    const now = new Date().toISOString();
    const result: CommandResult = {
      commandId,
      success: true,
      sentAt: now,
      confirmedAt: now
    };
    const command: Command = {
      id: commandId,
      actuatorId: actuator.id,
      commandType: request.commandType,
      value: request.value,
      requestedBy: request.requestedBy,
      requestedAt,
      status: config.app.realWriteEnabled ? 'sent' : 'confirmed',
      result
    };

    await this.persistCommand(command);
    await this.eventLogService.addEvent({
      level: config.app.realWriteEnabled ? 'warning' : 'info',
      source: 'command',
      entityId: actuator.id,
      message: config.app.realWriteEnabled
        ? 'Real write command accepted but hardware write is not implemented in this stage'
        : 'Simulation command completed',
      details: { command, controlPointId: controlPoint.id }
    });

    return result;
  }

  public getHistory(query: CommandHistoryQuery = {}): Command[] {
    const commands = this.configService.getCurrentConfig().commands;
    const filtered = query.actuatorId
      ? commands.filter((command) => command.actuatorId === query.actuatorId)
      : commands;

    return filtered.slice(-(query.limit ?? 100)).reverse();
  }

  private findControlPoint(pointIds: string[]): ControlPoint | null {
    const points = this.configService.getCurrentConfig().points;
    const point = points.find((item) => pointIds.includes(item.id) && item.kind === 'control');
    return point ? (point as ControlPoint) : null;
  }

  private async findBlockingInterlock(actuatorId: string, commandType: Command['commandType']): Promise<Interlock | null> {
    const config = this.configService.getCurrentConfig();
    const interlocks = config.interlocks.filter(
      (interlock) =>
        interlock.enabled &&
        interlock.targetActuatorId === actuatorId &&
        interlock.targetCommand === commandType &&
        interlock.effect === 'block'
    );

    if (interlocks.length === 0) {
      return null;
    }

    const snapshot = await this.dataServiceManager.readAllChannels();
    for (const interlock of interlocks) {
      if (evaluateCondition(interlock.condition, snapshot.live.readingsByPointId)) {
        return interlock;
      }
    }

    return null;
  }

  private async persistCommand(command: Command): Promise<CommandResult> {
    const config = this.configService.getCurrentConfig();
    const result = command.result ?? {
      commandId: command.id,
      success: command.status === 'confirmed' || command.status === 'sent',
      error: command.error
    };
    await this.configService.saveConfig({
      ...config,
      commands: [...config.commands, { ...command, result }]
    });
    await this.eventLogService.addEvent({
      level: result.success ? 'info' : command.status === 'pendingConfirmation' ? 'warning' : 'error',
      source: 'command',
      entityId: command.actuatorId,
      message: result.success ? 'Command completed' : `Command ${command.status}`,
      details: { command: { ...command, result } }
    });

    return result;
  }
}

export function evaluateCondition(condition: string, readingsByPointId: Record<string, Reading>): boolean {
  const match = condition.trim().match(/^([\w.-]+)\s*(<=|>=|<|>|==|!=)\s*(-?\d+(?:\.\d+)?|true|false)$/i);
  if (!match) {
    return false;
  }

  const [, pointId, operator, expectedRaw] = match;
  if (!pointId || !operator || !expectedRaw) {
    return false;
  }

  const reading = readingsByPointId[pointId];
  const current = reading?.displayValue ?? reading?.rawValue;
  const expected = expectedRaw === 'true' ? true : expectedRaw === 'false' ? false : Number(expectedRaw);

  switch (operator) {
    case '<':
      return Number(current) < Number(expected);
    case '<=':
      return Number(current) <= Number(expected);
    case '>':
      return Number(current) > Number(expected);
    case '>=':
      return Number(current) >= Number(expected);
    case '==':
      return current === expected;
    case '!=':
      return current !== expected;
    default:
      return false;
  }
}
