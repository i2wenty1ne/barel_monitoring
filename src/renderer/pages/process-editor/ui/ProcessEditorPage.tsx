import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  AppConfig,
  CommandType,
  GraphValidationResult,
  ProcessGraph,
  ProcessGraphNode
} from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type ProcessNodeType = ProcessGraphNode['type'];

type ProcessNodeData = Record<string, unknown> & {
  processType: ProcessNodeType;
  label: string;
  subtitle: string;
};

type ProcessFlowNode = Node<ProcessNodeData>;

const processNodeTypes: ProcessNodeType[] = [
  'start',
  'input',
  'readPoint',
  'captureReading',
  'condition',
  'math',
  'command',
  'wait',
  'interlock',
  'event',
  'complete'
];

const commandTypes: CommandType[] = ['start', 'stop', 'open', 'close', 'turnOn', 'turnOff', 'reset', 'setValue', 'custom'];

const nodeTypes = {
  processNode: ProcessGraphNodeView
};

export function ProcessEditorPage(): React.JSX.Element {
  const { processId } = useParams<{ processId: string }>();
  const { config, isLoading, error, refresh } = useAppConfig();
  const [nodes, setNodes] = useState<ProcessFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [processName, setProcessName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validation, setValidation] = useState<GraphValidationResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const process = config?.processes.find((item) => item.id === processId) ?? null;
  const graph = config?.processGraphs.find((item) => item.processId === processId || item.id === process?.graphId) ?? null;
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  useEffect(() => {
    if (!process || !graph) {
      return;
    }

    setProcessName(process.name);
    setNodes(graph.nodes.map((node, index) => toFlowNode(node, index)));
    setEdges(graph.edges.map(toFlowEdge));
    setSelectedNodeId(null);
    setValidation(null);
  }, [process?.id, graph?.updatedAt]);

  const onNodesChange = useCallback<OnNodesChange<ProcessFlowNode>>((changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);
  const onEdgesChange = useCallback<OnEdgesChange>((changes) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, []);
  const onConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}-${Date.now()}`,
          type: 'smoothstep',
          markerEnd: { type: 'arrowclosed' }
        },
        currentEdges
      )
    );
  }, []);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!process || !graph) {
    return <ErrorState message="Process graph не найден" onRetry={() => void refresh()} />;
  }

  const currentConfig = config;
  const currentProcess = process;
  const currentGraph = graph;

  async function save(nextConfig: AppConfig, successMessage: string): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setSaveError(null);
    try {
      const result = await window.barrelMonitor.config.save(nextConfig);
      if (!result.success) {
        throw new Error(result.message ?? 'Не удалось сохранить config');
      }
      setMessage(successMessage);
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения config');
    } finally {
      setIsBusy(false);
    }
  }

  function buildGraph(): ProcessGraph {
    const now = new Date().toISOString();
    return {
      ...currentGraph,
      nodes: nodes.map(toProcessGraphNode),
      edges: edges.map(toProcessGraphEdge),
      updatedAt: now
    };
  }

  async function saveGraph(): Promise<void> {
    const nextGraph = buildGraph();
    await save(
      {
        ...currentConfig,
        processes: currentConfig.processes.map((item) =>
          item.id === currentProcess.id ? { ...item, name: processName.trim() || item.name, updatedAt: nextGraph.updatedAt } : item
        ),
        processGraphs: currentConfig.processGraphs.map((item) => item.id === currentGraph.id ? nextGraph : item)
      },
      'ProcessGraph сохранен'
    );
  }

  async function validateGraph(): Promise<GraphValidationResult> {
    const result = await window.barrelMonitor.processes.validateGraph(buildGraph());
    setValidation(result);
    setMessage(result.valid ? 'Graph validation passed' : null);
    setSaveError(result.valid ? null : result.errors.map((item) => item.message).join('; '));
    return result;
  }

  async function runSimulation(): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setSaveError(null);
    try {
      await saveGraph();
      const result = await validateGraph();
      if (!result.valid) {
        throw new Error('Граф не прошел validation');
      }
      const job = await window.barrelMonitor.processes.startJob(currentProcess.id, {});
      if (job.status !== 'completed') {
        throw new Error(job.error ?? `Job status: ${job.status}`);
      }
      setMessage(`Simulation completed: ${job.id}`);
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка запуска simulation');
    } finally {
      setIsBusy(false);
    }
  }

  function addProcessNode(type: ProcessNodeType): void {
    const id = createNodeId(type, nodes);
    const position = { x: 120 + (nodes.length % 4) * 260, y: 120 + Math.floor(nodes.length / 4) * 160 };
    const node = createFlowNode(type, id, position, currentConfig);
    setNodes((currentNodes) => [...currentNodes, node]);
    setSelectedNodeId(node.id);
  }

  function deleteSelectedNode(): void {
    if (!selectedNode) {
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNodeId(null);
  }

  function updateSelectedNodeData(patch: Record<string, unknown>): void {
    if (!selectedNode) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch
              }
            }
          : node
      )
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Process graph editor"
        title={processName || currentProcess.name}
        description="React Flow editor для сценариев Start, ReadPoint, Condition, Command, Wait и Complete."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/processes">
              <Button variant="ghost">К списку</Button>
            </Link>
            <Button disabled={isBusy} onClick={() => void validateGraph()} variant="secondary">
              Validate
            </Button>
            <Button disabled={isBusy} onClick={() => void saveGraph()} variant="primary">
              Save graph
            </Button>
            <Button disabled={isBusy} onClick={() => void runSimulation()} variant="secondary">
              Run simulation
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        {message ? <Alert type="success">{message}</Alert> : null}
        {saveError ? <Alert type="error">{saveError}</Alert> : null}
        {validation && !validation.valid ? (
          <Panel className="p-4" title="Validation errors">
            <div className="space-y-2 text-sm text-rose-100">
              {validation.errors.map((item, index) => (
                <div className="rounded-md border border-rose-300/20 bg-rose-500/10 p-2" key={`${item.nodeId ?? item.edgeId ?? 'graph'}-${index}`}>
                  {item.nodeId ? `[${item.nodeId}] ` : null}
                  {item.edgeId ? `[${item.edgeId}] ` : null}
                  {item.message}
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[220px_1fr_340px]">
          <Panel className="p-4" title="Nodes">
            <div className="space-y-2">
              <TextInput label="Process name" onChange={setProcessName} value={processName} />
              <div className="grid gap-2">
                {processNodeTypes.map((type) => (
                  <Button disabled={isBusy} key={type} onClick={() => addProcessNode(type)} variant="secondary">
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="p-3" title="ProcessGraph">
            {nodes.length === 0 ? (
              <EmptyState title="Graph is empty" description="Добавьте start и complete nodes." />
            ) : (
              <div className="h-[720px] overflow-hidden rounded-md border border-white/10 bg-slate-950">
                <ReactFlow
                  colorMode="dark"
                  defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: 'arrowclosed' } }}
                  edges={edges}
                  fitView
                  maxZoom={1.6}
                  minZoom={0.25}
                  nodes={nodes}
                  nodeTypes={nodeTypes}
                  nodesConnectable
                  nodesDraggable
                  onConnect={onConnect}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  onNodesChange={onNodesChange}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="rgba(148,163,184,0.22)" gap={24} />
                  <Controls showInteractive={false} />
                  <MiniMap
                    maskColor="rgba(15,23,42,0.72)"
                    nodeColor={(node) => getProcessMiniMapColor(node.data?.processType)}
                    pannable
                    zoomable
                  />
                </ReactFlow>
              </div>
            )}
          </Panel>

          <Panel className="p-4" title="Properties">
            {selectedNode ? (
              <ProcessNodeInspector
                config={currentConfig}
                node={selectedNode}
                onChange={updateSelectedNodeData}
                onDelete={deleteSelectedNode}
              />
            ) : (
              <EmptyState title="Node не выбран" description="Выберите node на графе для редактирования properties." />
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function ProcessNodeInspector({
  config,
  node,
  onChange,
  onDelete
}: {
  config: AppConfig;
  node: ProcessFlowNode;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}): React.JSX.Element {
  const type = node.data.processType;

  return (
    <div className="space-y-4">
      <div>
        <Badge tone="info">{type}</Badge>
        <div className="mt-2 font-mono text-xs text-slate-500">{node.id}</div>
      </div>
      <TextInput label="Label" onChange={(label) => onChange({ label })} value={String(node.data.label ?? '')} />

      {type === 'input' ? (
        <>
          <TextInput label="Input key" onChange={(key) => onChange({ key })} value={String(node.data.key ?? '')} />
          <TextInput label="Default value" onChange={(defaultValue) => onChange({ defaultValue })} value={String(node.data.defaultValue ?? '')} />
        </>
      ) : null}

      {type === 'readPoint' || type === 'captureReading' ? (
        <>
          <Select
            label="Point"
            onChange={(pointId) => onChange({ pointId })}
            options={[{ label: '-', value: '' }, ...config.points.map((point) => ({ label: point.name, value: point.id }))]}
            value={typeof node.data.pointId === 'string' ? node.data.pointId : ''}
          />
          <TextInput label="Variable" onChange={(variable) => onChange({ variable })} value={String(node.data.variable ?? '')} />
        </>
      ) : null}

      {type === 'condition' ? (
        <TextInput
          hint="Например: level < 10"
          label="Expression"
          onChange={(expression) => onChange({ expression })}
          value={String(node.data.expression ?? '')}
        />
      ) : null}

      {type === 'command' ? (
        <>
          <Select
            label="Actuator"
            onChange={(actuatorId) => onChange({ actuatorId })}
            options={[{ label: '-', value: '' }, ...config.actuators.map((actuator) => ({ label: actuator.name, value: actuator.id }))]}
            value={typeof node.data.actuatorId === 'string' ? node.data.actuatorId : ''}
          />
          <Select
            label="Command"
            onChange={(commandType) => onChange({ commandType })}
            options={commandTypes.map((commandType) => ({ label: commandType, value: commandType }))}
            value={typeof node.data.commandType === 'string' ? node.data.commandType : 'start'}
          />
          <TextInput label="Value" onChange={(value) => onChange({ value: parseCommandValue(value) })} value={String(node.data.value ?? '')} />
          <Checkbox
            checked={node.data.confirmed === true}
            label="Confirmed by process"
            onChange={(confirmed) => onChange({ confirmed })}
          />
        </>
      ) : null}

      {type === 'wait' ? (
        <NumberInput
          label="Duration, ms"
          max={5000}
          min={0}
          onChange={(durationMs) => onChange({ durationMs })}
          value={typeof node.data.durationMs === 'number' ? node.data.durationMs : 1000}
        />
      ) : null}

      {type === 'math' ? (
        <>
          <TextInput label="Variable" onChange={(variable) => onChange({ variable })} value={String(node.data.variable ?? '')} />
          <TextInput label="Expression" onChange={(expression) => onChange({ expression })} value={String(node.data.expression ?? '')} />
        </>
      ) : null}

      {type === 'interlock' ? (
        <>
          <TextInput
            hint="Например: level < 10"
            label="Expression"
            onChange={(expression) => onChange({ expression })}
            value={String(node.data.expression ?? '')}
          />
          <TextInput label="Message" onChange={(message) => onChange({ message })} value={String(node.data.message ?? '')} />
        </>
      ) : null}

      {type === 'event' ? (
        <TextInput label="Message" onChange={(message) => onChange({ message })} value={String(node.data.message ?? '')} />
      ) : null}

      {type === 'complete' ? (
        <TextInput label="Result key" onChange={(resultKey) => onChange({ resultKey })} value={String(node.data.resultKey ?? '')} />
      ) : null}

      <Button onClick={onDelete} variant="danger">
        Delete node
      </Button>
    </div>
  );
}

function ProcessGraphNodeView({ data, selected }: NodeProps<ProcessFlowNode>): React.JSX.Element {
  const type = data.processType;
  const tone = getProcessTone(type);
  const trueFalseHandles = type === 'condition';

  return (
    <div className={`min-w-[210px] max-w-[250px] rounded-md border p-3 shadow-lg shadow-black/25 ${tone} ${selected ? 'ring-2 ring-teal-300/70' : ''}`}>
      <Handle className="!bg-slate-300" position={Position.Left} type="target" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded-md bg-slate-950/65 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-300">
          {type}
        </span>
        <span className="text-[11px] text-slate-400">{getNodeBadge(type)}</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      <div className="mt-1 text-xs text-slate-300">{data.subtitle}</div>
      {trueFalseHandles ? (
        <>
          <Handle className="!top-[34%] !bg-teal-300" id="true" position={Position.Right} type="source" />
          <Handle className="!top-[70%] !bg-rose-300" id="false" position={Position.Right} type="source" />
          <div className="mt-3 flex justify-between text-[11px] text-slate-400">
            <span>true</span>
            <span>false</span>
          </div>
        </>
      ) : (
        <Handle className="!bg-teal-300" position={Position.Right} type="source" />
      )}
    </div>
  );
}

function toFlowNode(node: ProcessGraphNode, index: number): ProcessFlowNode {
  const position = isPosition(node.data.position)
    ? node.data.position
    : { x: 120 + (index % 4) * 260, y: 120 + Math.floor(index / 4) * 160 };
  return {
    id: node.id,
    type: 'processNode',
    position,
    data: {
      ...node.data,
      processType: node.type,
      label: typeof node.data.label === 'string' ? node.data.label : getDefaultLabel(node.type),
      subtitle: getNodeSubtitle(node)
    }
  };
}

function toFlowEdge(edge: ProcessGraph['edges'][number]): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    markerEnd: { type: 'arrowclosed' },
    label: edge.sourceHandle,
    labelStyle: { fill: 'rgb(203,213,225)', fontSize: 11 },
    labelBgStyle: { fill: 'rgba(15,23,42,0.9)' }
  };
}

function toProcessGraphNode(node: ProcessFlowNode): ProcessGraphNode {
  const processType = node.data.processType;
  const data: Record<string, unknown> = {};
  Object.entries(node.data).forEach(([key, value]) => {
    if (key !== 'processType' && key !== 'subtitle') {
      data[key] = value;
    }
  });
  data.position = node.position;
  data.label = typeof data.label === 'string' ? data.label : getDefaultLabel(processType);

  return {
    id: node.id,
    type: processType,
    data
  };
}

function toProcessGraphEdge(edge: Edge): ProcessGraph['edges'][number] {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined
  };
}

function createFlowNode(type: ProcessNodeType, id: string, position: { x: number; y: number }, config: AppConfig): ProcessFlowNode {
  const data = createDefaultNodeData(type, config);
  return {
    id,
    type: 'processNode',
    position,
    data: {
      ...data,
      processType: type,
      label: getDefaultLabel(type),
      subtitle: getNodeSubtitle({ type, data })
    }
  };
}

function createDefaultNodeData(type: ProcessNodeType, config: AppConfig): Record<string, unknown> {
  if (type === 'readPoint' || type === 'captureReading') {
    const point = config.points[0];
    return { pointId: point?.id ?? '', variable: point?.id ?? 'value' };
  }
  if (type === 'condition') {
    return { expression: 'value > 0' };
  }
  if (type === 'command') {
    return { actuatorId: config.actuators[0]?.id ?? '', commandType: 'start', value: true, confirmed: true };
  }
  if (type === 'wait') {
    return { durationMs: 1000 };
  }
  if (type === 'input') {
    return { key: 'inputValue', defaultValue: '' };
  }
  if (type === 'math') {
    return { variable: 'result', expression: 'value' };
  }
  if (type === 'interlock') {
    return { expression: 'value < 10', message: 'Interlock blocked process' };
  }
  if (type === 'event') {
    return { message: 'Process event' };
  }
  if (type === 'complete') {
    return { resultKey: '' };
  }
  return {};
}

function createNodeId(type: ProcessNodeType, nodes: ProcessFlowNode[]): string {
  const used = new Set(nodes.map((node) => node.id));
  let index = 1;
  let id = `${type}-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${type}-${index}`;
  }
  return id;
}

function getDefaultLabel(type: ProcessNodeType): string {
  const labels: Record<ProcessNodeType, string> = {
    start: 'Start',
    complete: 'Complete',
    input: 'Input',
    readPoint: 'Read point',
    captureReading: 'Capture reading',
    command: 'Command',
    condition: 'Condition',
    math: 'Math',
    wait: 'Wait',
    interlock: 'Interlock',
    event: 'Event'
  };
  return labels[type];
}

function getNodeSubtitle(node: Pick<ProcessGraphNode, 'type' | 'data'>): string {
  if (node.type === 'readPoint' || node.type === 'captureReading') {
    return String(node.data.pointId ?? 'pointId required');
  }
  if (node.type === 'command') {
    return `${String(node.data.commandType ?? 'command')} / ${String(node.data.actuatorId ?? 'actuator required')}`;
  }
  if (node.type === 'condition') {
    return String(node.data.expression ?? 'expression required');
  }
  if (node.type === 'wait') {
    return `${String(node.data.durationMs ?? 0)} ms`;
  }
  if (node.type === 'input') {
    return String(node.data.key ?? 'input');
  }
  return 'process node';
}

function getProcessTone(type: ProcessNodeType): string {
  if (type === 'start' || type === 'complete') {
    return 'border-teal-300/35 bg-teal-500/10';
  }
  if (type === 'condition' || type === 'interlock') {
    return 'border-amber-300/35 bg-amber-500/10';
  }
  if (type === 'command') {
    return 'border-rose-300/35 bg-rose-500/10';
  }
  if (type === 'readPoint' || type === 'captureReading') {
    return 'border-sky-300/35 bg-sky-500/10';
  }
  return 'border-violet-300/35 bg-violet-500/10';
}

function getProcessMiniMapColor(type: unknown): string {
  if (type === 'start' || type === 'complete') {
    return '#14b8a6';
  }
  if (type === 'condition' || type === 'interlock') {
    return '#f59e0b';
  }
  if (type === 'command') {
    return '#fb7185';
  }
  if (type === 'readPoint' || type === 'captureReading') {
    return '#38bdf8';
  }
  return '#a78bfa';
}

function getNodeBadge(type: ProcessNodeType): string {
  if (type === 'condition') {
    return 'true/false';
  }
  if (type === 'wait') {
    return 'delay';
  }
  if (type === 'command') {
    return 'actuator';
  }
  return 'flow';
}

function parseCommandValue(value: string): string | number | boolean | undefined {
  if (value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function isPosition(value: unknown): value is { x: number; y: number } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'x' in value &&
      'y' in value &&
      typeof value.x === 'number' &&
      typeof value.y === 'number'
  );
}
