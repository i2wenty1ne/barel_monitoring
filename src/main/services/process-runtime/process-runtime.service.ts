import type {
  CommandType,
  GraphValidationResult,
  ProcessGraph,
  ProcessGraphNode,
  ProcessJob
} from '../../../shared/types/config.types';
import type { CommandService } from '../command/command.service';
import type { ConfigService } from '../config/config.service';
import type { DataServiceManager } from '../data/data-service-manager';
import type { EventLogService } from '../event-log/event-log.service';

export class ProcessRuntimeService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly dataServiceManager: DataServiceManager,
    private readonly commandService: CommandService,
    private readonly eventLogService: EventLogService
  ) {}

  public validateGraph(graph: ProcessGraph): GraphValidationResult {
    const config = this.configService.getCurrentConfig();
    const errors: GraphValidationResult['errors'] = [];
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const startNodes = graph.nodes.filter((node) => node.type === 'start');
    const completeNodes = graph.nodes.filter((node) => node.type === 'complete');

    if (startNodes.length !== 1) {
      errors.push({ message: 'Граф должен иметь ровно один start node' });
    }

    if (completeNodes.length === 0) {
      errors.push({ message: 'Граф должен иметь хотя бы один complete node' });
    }

    graph.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        errors.push({ edgeId: edge.id, message: 'Edge ссылается на несуществующий node' });
      }
    });

    graph.nodes.forEach((node) => {
      if (node.type === 'input') {
        if (!isNonEmptyString(node.data.key)) {
          errors.push({ nodeId: node.id, message: 'Input node должен иметь key' });
        }
      }

      if (node.type === 'readPoint' || node.type === 'captureReading') {
        if (!isKnownPoint(config.points, node.data.pointId)) {
          errors.push({ nodeId: node.id, message: 'Node ссылается на несуществующий pointId' });
        }

        if (!isNonEmptyString(node.data.variable)) {
          errors.push({ nodeId: node.id, message: 'ReadPoint/CaptureReading node должен иметь variable' });
        }
      }

      if (node.type === 'command') {
        const actuator = config.actuators.find((item) => item.id === node.data.actuatorId);
        if (!actuator) {
          errors.push({ nodeId: node.id, message: 'Command node ссылается на несуществующий actuatorId' });
        } else if (!isNonEmptyString(node.data.commandType) || !actuator.supportedCommands.includes(node.data.commandType as CommandType)) {
          errors.push({ nodeId: node.id, message: 'Command node содержит неподдерживаемый commandType' });
        }
      }

      if (node.type === 'condition') {
        if (!isNonEmptyString(node.data.expression)) {
          errors.push({ nodeId: node.id, message: 'Condition node должен иметь expression' });
        }
        const outgoing = graph.edges.filter((edge) => edge.source === node.id);
        if (!outgoing.some((edge) => edge.sourceHandle === 'true') || !outgoing.some((edge) => edge.sourceHandle === 'false')) {
          errors.push({ nodeId: node.id, message: 'Condition node должен иметь true/false ветки' });
        }
      }

      if (node.type === 'wait') {
        if (typeof node.data.durationMs !== 'number' || node.data.durationMs < 0) {
          errors.push({ nodeId: node.id, message: 'Wait node должен иметь durationMs >= 0' });
        }
      }

      if (node.type === 'math') {
        if (!isNonEmptyString(node.data.variable) || !isNonEmptyString(node.data.expression)) {
          errors.push({ nodeId: node.id, message: 'Math node должен иметь variable и expression' });
        }
      }

      if (node.type === 'interlock' && !isNonEmptyString(node.data.expression)) {
        errors.push({ nodeId: node.id, message: 'Interlock node должен иметь expression' });
      }
    });

    if (startNodes.length === 1) {
      const startNode = startNodes[0];
      const reachableNodeIds = startNode ? getReachableNodeIds(graph, startNode.id) : new Set<string>();
      graph.nodes.forEach((node) => {
        if (!reachableNodeIds.has(node.id)) {
          errors.push({ nodeId: node.id, message: 'Node недоступен из start node' });
        }
      });
    }

    getCyclesWithoutWait(graph).forEach((cycle) => {
      errors.push({ nodeId: cycle[0], message: `Цикл без wait node: ${cycle.join(' -> ')}` });
    });

    return { valid: errors.length === 0, errors };
  }

  public async startJob(processId: string, input: Record<string, unknown> = {}): Promise<ProcessJob> {
    const config = this.configService.getCurrentConfig();
    const process = config.processes.find((item) => item.id === processId);
    const graph = config.processGraphs.find((item) => item.processId === processId || item.id === process?.graphId);
    const now = new Date().toISOString();
    const jobId = `job-${Date.now()}`;

    if (!process || !graph) {
      throw new Error('Process or graph not found');
    }

    const validation = this.validateGraph(graph);
    if (!validation.valid) {
      const failedJob: ProcessJob = {
        id: jobId,
        processId,
        status: 'failed',
        input,
        context: {},
        startedAt: now,
        completedAt: new Date().toISOString(),
        error: validation.errors.map((error) => error.message).join('; ')
      };
      await this.persistJob(failedJob);
      return failedJob;
    }

    const runningJob: ProcessJob = {
      id: jobId,
      processId,
      status: 'running',
      input,
      context: { ...input },
      startedAt: now
    };
    await this.persistJob(runningJob);
    await this.eventLogService.addEvent({
      level: 'info',
      source: 'process',
      entityId: processId,
      message: 'Process job started',
      details: { jobId, input }
    });

    try {
      const completedJob = await this.executeGraph(graph, runningJob);
      await this.persistJob(completedJob);
      await this.eventLogService.addEvent({
        level: completedJob.status === 'completed' ? 'info' : 'error',
        source: 'process',
        entityId: processId,
        message: completedJob.status === 'completed' ? 'Process job completed' : 'Process job failed',
        details: { job: completedJob }
      });
      return completedJob;
    } catch (error) {
      const failedJob: ProcessJob = {
        ...runningJob,
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown process runtime error'
      };
      await this.persistJob(failedJob);
      await this.eventLogService.addEvent({
        level: 'error',
        source: 'process',
        entityId: processId,
        message: 'Process job failed',
        details: { job: failedJob }
      });
      return failedJob;
    }
  }

  public getJob(jobId: string): ProcessJob | null {
    return this.configService.getCurrentConfig().processJobs.find((job) => job.id === jobId) ?? null;
  }

  private async executeGraph(graph: ProcessGraph, job: ProcessJob): Promise<ProcessJob> {
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    let current = graph.nodes.find((node) => node.type === 'start') ?? null;
    let steps = 0;
    const context: Record<string, unknown> = { ...job.context };

    while (current && steps < 100) {
      steps += 1;
      context.__currentNodeId = current.id;
      context.__stepCount = steps;
      await this.executeNode(current, context);

      if (current.type === 'complete') {
        const resultKey = typeof current.data.resultKey === 'string' && current.data.resultKey
          ? current.data.resultKey
          : null;
        return {
          ...job,
          status: 'completed',
          context,
          completedAt: new Date().toISOString(),
          result: resultKey ? { [resultKey]: context[resultKey] ?? null } : isRecord(current.data.result) ? current.data.result : context
        };
      }

      const nextEdge = this.selectNextEdge(graph, current, context);
      current = nextEdge ? nodesById.get(nextEdge.target) ?? null : null;
    }

    return {
      ...job,
      status: 'failed',
      context,
      completedAt: new Date().toISOString(),
      error: steps >= 100 ? 'Process exceeded max step count' : 'Process stopped before complete node'
    };
  }

  private async executeNode(node: ProcessGraphNode, context: Record<string, unknown>): Promise<void> {
    if (node.type === 'readPoint' || node.type === 'captureReading') {
      const pointId = typeof node.data.pointId === 'string' ? node.data.pointId : null;
      const variable = typeof node.data.variable === 'string' ? node.data.variable : pointId;
      if (!pointId || !variable) {
        throw new Error(`Node ${node.id} requires pointId and variable`);
      }

      const snapshot = await this.dataServiceManager.readAllChannels();
      const reading = snapshot.live.readingsByPointId[pointId] ?? null;
      context[variable] = reading?.displayValue ?? reading?.rawValue ?? null;
      context[`${variable}.quality`] = reading?.quality ?? 'bad';
      context[`${variable}.timestamp`] = reading?.timestamp ?? new Date().toISOString();
      return;
    }

    if (node.type === 'input') {
      const key = typeof node.data.key === 'string' ? node.data.key : null;
      if (!key) {
        throw new Error(`Node ${node.id} requires input key`);
      }

      const currentValue = context[key];
      if (currentValue === undefined) {
        if (node.data.defaultValue !== undefined) {
          context[key] = node.data.defaultValue;
        } else if (node.data.required === true) {
          throw new Error(`Required input ${key} is missing`);
        }
      }
      return;
    }

    if (node.type === 'command') {
      const actuatorId = typeof node.data.actuatorId === 'string' ? node.data.actuatorId : null;
      const commandType = typeof node.data.commandType === 'string' ? (node.data.commandType as CommandType) : null;
      if (!actuatorId || !commandType) {
        throw new Error(`Node ${node.id} requires actuatorId and commandType`);
      }

      const result = await this.commandService.execute({
        actuatorId,
        commandType,
        value: normalizeCommandValue(node.data.value),
        confirmed: node.data.confirmed === true,
        requestedBy: 'process-runtime'
      });
      context[`${node.id}.success`] = result.success;
      context[`${node.id}.commandId`] = result.commandId;
      context[`${node.id}.feedbackPointId`] = result.feedbackPointId ?? null;
      context[`${node.id}.feedbackValue`] = result.feedbackValue ?? null;
      if (!result.success) {
        throw new Error(result.error ?? 'Command failed');
      }
      return;
    }

    if (node.type === 'wait') {
      const durationMs = typeof node.data.durationMs === 'number' ? Math.min(node.data.durationMs, 5000) : 0;
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      context[`${node.id}.waitedMs`] = durationMs;
      return;
    }

    if (node.type === 'math') {
      const variable = typeof node.data.variable === 'string' ? node.data.variable : null;
      const expression = typeof node.data.expression === 'string' ? node.data.expression : null;
      if (!variable || !expression) {
        throw new Error(`Node ${node.id} requires variable and expression`);
      }

      context[variable] = evaluateMathExpression(expression, context);
      return;
    }

    if (node.type === 'interlock') {
      const expression = typeof node.data.expression === 'string' ? node.data.expression : '';
      const blocked = evaluateContextCondition(expression, context);
      context[`${node.id}.blocked`] = blocked;
      if (blocked) {
        throw new Error(typeof node.data.message === 'string' ? node.data.message : `Interlock ${node.id} blocked process`);
      }
      return;
    }

    if (node.type === 'event') {
      const message = typeof node.data.message === 'string' ? node.data.message : `Process event ${node.id}`;
      await this.eventLogService.addEvent({
        level: 'info',
        source: 'process',
        message,
        details: { nodeId: node.id, context }
      });
      context[`${node.id}.eventLogged`] = true;
    }
  }

  private selectNextEdge(graph: ProcessGraph, node: ProcessGraphNode, context: Record<string, unknown>) {
    const outgoing = graph.edges.filter((edge) => edge.source === node.id);

    if (node.type !== 'condition') {
      return outgoing[0] ?? null;
    }

    const expression = typeof node.data.expression === 'string' ? node.data.expression : '';
    const result = evaluateContextCondition(expression, context);
    return outgoing.find((edge) => edge.sourceHandle === String(result)) ?? outgoing[0] ?? null;
  }

  private async persistJob(job: ProcessJob): Promise<void> {
    const config = this.configService.getCurrentConfig();
    await this.configService.saveConfig({
      ...config,
      processJobs: [...config.processJobs.filter((item) => item.id !== job.id), job]
    });
  }
}

function isKnownPoint(points: Array<{ id: string }>, value: unknown): boolean {
  return typeof value === 'string' && points.some((point) => point.id === value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getReachableNodeIds(graph: ProcessGraph, startNodeId: string): Set<string> {
  const reachable = new Set<string>();
  const stack = [startNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || reachable.has(nodeId)) {
      continue;
    }

    reachable.add(nodeId);
    graph.edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => stack.push(edge.target));
  }

  return reachable;
}

function getCyclesWithoutWait(graph: ProcessGraph): string[][] {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const cycles: string[][] = [];
  const reported = new Set<string>();

  function visit(nodeId: string, path: string[]): void {
    const indexInPath = path.indexOf(nodeId);
    if (indexInPath >= 0) {
      const cycle = path.slice(indexInPath);
      const cycleKey = [...cycle].sort().join('|');
      const hasWait = cycle.some((id) => nodesById.get(id)?.type === 'wait');
      if (!hasWait && !reported.has(cycleKey)) {
        reported.add(cycleKey);
        cycles.push(cycle);
      }
      return;
    }

    const node = nodesById.get(nodeId);
    if (!node) {
      return;
    }

    graph.edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => visit(edge.target, [...path, nodeId]));
  }

  graph.nodes.forEach((node) => visit(node.id, []));
  return cycles;
}

function normalizeCommandValue(value: unknown): boolean | number | string | undefined {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string' ? value : undefined;
}

function evaluateMathExpression(expression: string, context: Record<string, unknown>): number | string | boolean | null {
  const trimmed = expression.trim();
  const binary = trimmed.match(/^([\w.-]+|-?\d+(?:\.\d+)?)\s*([+\-*/])\s*([\w.-]+|-?\d+(?:\.\d+)?)$/);
  if (binary) {
    const [, leftRaw, operator, rightRaw] = binary;
    const left = Number(resolveContextValue(leftRaw ?? '', context));
    const right = Number(resolveContextValue(rightRaw ?? '', context));

    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }

    switch (operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return right === 0 ? null : left / right;
      default:
        return null;
    }
  }

  const resolved = resolveContextValue(trimmed, context);
  return typeof resolved === 'number' || typeof resolved === 'string' || typeof resolved === 'boolean' ? resolved : null;
}

function evaluateContextCondition(expression: string, context: Record<string, unknown>): boolean {
  const match = expression.trim().match(/^([\w.-]+)\s*(<=|>=|<|>|==|!=)\s*([\w.-]+|-?\d+(?:\.\d+)?|true|false)$/i);
  if (!match) {
    return false;
  }

  const [, key, operator, expectedRaw] = match;
  if (!key || !operator || !expectedRaw) {
    return false;
  }

  const current = resolveContextValue(key, context);
  const expected = resolveContextValue(expectedRaw, context);

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

function resolveContextValue(raw: string, context: Record<string, unknown>): unknown {
  const trimmed = raw.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  return context[trimmed];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
