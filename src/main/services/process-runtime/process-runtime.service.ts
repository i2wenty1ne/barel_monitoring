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
      if ((node.type === 'readPoint' || node.type === 'captureReading') && !isKnownPoint(config.points, node.data.pointId)) {
        errors.push({ nodeId: node.id, message: 'Node ссылается на несуществующий pointId' });
      }

      if (node.type === 'command' && !isKnownActuator(config.actuators, node.data.actuatorId)) {
        errors.push({ nodeId: node.id, message: 'Command node ссылается на несуществующий actuatorId' });
      }

      if (node.type === 'condition') {
        const outgoing = graph.edges.filter((edge) => edge.source === node.id);
        if (!outgoing.some((edge) => edge.sourceHandle === 'true') || !outgoing.some((edge) => edge.sourceHandle === 'false')) {
          errors.push({ nodeId: node.id, message: 'Condition node должен иметь true/false ветки' });
        }
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
      await this.executeNode(current, context);

      if (current.type === 'complete') {
        return {
          ...job,
          status: 'completed',
          context,
          completedAt: new Date().toISOString(),
          result: isRecord(current.data.result) ? current.data.result : context
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
      context[variable] = snapshot.live.readingsByPointId[pointId]?.displayValue ?? null;
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
      if (!result.success) {
        throw new Error(result.error ?? 'Command failed');
      }
      return;
    }

    if (node.type === 'wait') {
      const durationMs = typeof node.data.durationMs === 'number' ? Math.min(node.data.durationMs, 5000) : 0;
      await new Promise((resolve) => setTimeout(resolve, durationMs));
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

function isKnownActuator(actuators: Array<{ id: string }>, value: unknown): boolean {
  return typeof value === 'string' && actuators.some((actuator) => actuator.id === value);
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

function evaluateContextCondition(expression: string, context: Record<string, unknown>): boolean {
  const match = expression.trim().match(/^([\w.-]+)\s*(<=|>=|<|>|==|!=)\s*(-?\d+(?:\.\d+)?|true|false)$/i);
  if (!match) {
    return false;
  }

  const [, key, operator, expectedRaw] = match;
  if (!key || !operator || !expectedRaw) {
    return false;
  }

  const current = context[key];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
