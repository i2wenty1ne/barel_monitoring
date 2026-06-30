import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodesChange,
  applyNodeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Actuator, AppConfig, Asset, DataSource, Point } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

type AssetGraphNodeData = {
  label: string;
  subtitle: string;
  details: string;
  badge: string;
  status?: string;
};

type AssetGraphNode = Node<AssetGraphNodeData>;

const graphStorageKey = 'barrel-monitor.asset-graph.layout.v1';
const nodeTypes = {
  assetNode: AssetNode,
  dataSourceNode: DataSourceNode,
  telemetryPointNode: TelemetryPointNode,
  controlPointNode: ControlPointNode,
  actuatorNode: ActuatorNode
};

export function GraphsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [isEditMode, setIsEditMode] = useState(false);
  const [nodes, setNodes] = useState<AssetGraphNode[]>([]);

  const graph = useMemo(() => (config ? buildAssetGraph(config) : { nodes: [], edges: [] }), [config]);
  const edges = useMemo(() => graph.edges.map((edge) => ({ ...edge, animated: isEditMode })), [graph.edges, isEditMode]);
  const onNodesChange = useCallback<OnNodesChange<AssetGraphNode>>((changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  useEffect(() => {
    setNodes(mergeStoredPositions(graph.nodes));
  }, [graph.nodes]);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  function saveLayout(): void {
    const positions = Object.fromEntries(nodes.map((node) => [node.id, node.position]));
    window.localStorage.setItem(graphStorageKey, JSON.stringify(positions));
    setIsEditMode(false);
  }

  function resetLayout(): void {
    window.localStorage.removeItem(graphStorageKey);
    setNodes(graph.nodes);
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Asset graph"
        description="React Flow graph mode: объекты, точки, источники данных и исполнительные механизмы."
        actions={
          <div className="flex flex-wrap gap-2">
            {isEditMode ? (
              <Button onClick={saveLayout} variant="primary">
                Сохранить layout
              </Button>
            ) : null}
            <Button onClick={() => setIsEditMode((value) => !value)} variant="secondary">
              {isEditMode ? 'Read-only' : 'Edit layout'}
            </Button>
            <Button onClick={resetLayout} variant="ghost">
              Reset layout
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-5">
          <GraphMetric label="Assets" value={config.assets.length} />
          <GraphMetric label="DataSources" value={config.dataSources.length} />
          <GraphMetric label="Telemetry" value={config.points.filter((point) => point.kind !== 'control').length} />
          <GraphMetric label="Control" value={config.points.filter((point) => point.kind === 'control').length} />
          <GraphMetric label="Actuators" value={config.actuators.length} />
        </div>

        {graph.nodes.length === 0 ? (
          <Panel className="p-5">
            <EmptyState title="Граф пуст" description="Добавьте assets, points, dataSources или actuators в config." />
          </Panel>
        ) : (
          <Panel className="p-3" title="Связи модели">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={isEditMode ? 'warning' : 'success'}>{isEditMode ? 'edit mode' : 'read-only'}</Badge>
              <span className="text-sm text-slate-500">{nodes.length} nodes / {edges.length} edges</span>
            </div>
            <div className="h-[680px] overflow-hidden rounded-md border border-white/10 bg-slate-950">
              <ReactFlow
                colorMode="dark"
                defaultEdgeOptions={{ type: 'smoothstep' }}
                edges={edges}
                fitView
                maxZoom={1.6}
                minZoom={0.25}
                nodes={nodes.map((node) => ({ ...node, draggable: isEditMode, selectable: isEditMode }))}
                nodeTypes={nodeTypes}
                nodesDraggable={isEditMode}
                nodesConnectable={false}
                onNodesChange={onNodesChange}
                panOnDrag
                proOptions={{ hideAttribution: true }}
              >
                <Background color="rgba(148,163,184,0.22)" gap={24} />
                <Controls showInteractive={false} />
                <MiniMap
                  maskColor="rgba(15,23,42,0.72)"
                  nodeColor={(node) => getMiniMapColor(node.type)}
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>
          </Panel>
        )}

        <Alert type="info">
          Asset graph показывает связи Asset {'->'} Points, Asset {'->'} Actuators, Point {'->'} DataSource, Actuator {'->'} ControlPoints и Actuator {'->'} FeedbackPoints.
        </Alert>
      </div>
    </section>
  );
}

function buildAssetGraph(config: AppConfig): { nodes: AssetGraphNode[]; edges: Edge[] } {
  const nodes: AssetGraphNode[] = [];
  const edges: Edge[] = [];
  const pointIdsUsedByAssets = new Set(config.assets.flatMap((asset) => asset.pointIds));
  const actuatorIdsUsedByAssets = new Set(config.assets.flatMap((asset) => asset.actuatorIds));

  config.dataSources.forEach((source, index) => {
    nodes.push(createDataSourceNode(source, index));
  });

  config.assets.forEach((asset, index) => {
    nodes.push(createAssetNode(asset, index));
  });

  config.points.forEach((point, index) => {
    nodes.push(createPointNode(point, index));
  });

  config.actuators.forEach((actuator, index) => {
    nodes.push(createActuatorNode(actuator, index));
  });

  config.assets.forEach((asset) => {
    const assetPointIds = new Set([
      ...asset.pointIds,
      ...config.points.filter((point) => point.assetId === asset.id).map((point) => point.id)
    ]);
    const assetActuatorIds = new Set([
      ...asset.actuatorIds,
      ...config.actuators.filter((actuator) => actuator.assetId === asset.id).map((actuator) => actuator.id)
    ]);

    assetPointIds.forEach((pointId) => {
      if (config.points.some((point) => point.id === pointId)) {
        edges.push(createEdge(`asset-point:${asset.id}:${pointId}`, `asset:${asset.id}`, `point:${pointId}`, 'Asset -> Point'));
      }
    });

    assetActuatorIds.forEach((actuatorId) => {
      if (config.actuators.some((actuator) => actuator.id === actuatorId)) {
        edges.push(createEdge(`asset-actuator:${asset.id}:${actuatorId}`, `asset:${asset.id}`, `actuator:${actuatorId}`, 'Asset -> Actuator'));
      }
    });
  });

  config.points.forEach((point) => {
    if (point.dataSourceId && config.dataSources.some((source) => source.id === point.dataSourceId)) {
      edges.push(createEdge(`point-source:${point.id}:${point.dataSourceId}`, `point:${point.id}`, `source:${point.dataSourceId}`, 'Point -> DataSource'));
    }

    if (point.assetId && !pointIdsUsedByAssets.has(point.id) && config.assets.some((asset) => asset.id === point.assetId)) {
      edges.push(createEdge(`asset-point:${point.assetId}:${point.id}`, `asset:${point.assetId}`, `point:${point.id}`, 'Asset -> Point'));
    }
  });

  config.actuators.forEach((actuator) => {
    if (actuator.assetId && !actuatorIdsUsedByAssets.has(actuator.id) && config.assets.some((asset) => asset.id === actuator.assetId)) {
      edges.push(createEdge(`asset-actuator:${actuator.assetId}:${actuator.id}`, `asset:${actuator.assetId}`, `actuator:${actuator.id}`, 'Asset -> Actuator'));
    }

    actuator.commandPointIds.forEach((pointId) => {
      if (config.points.some((point) => point.id === pointId)) {
        edges.push(createEdge(`actuator-command:${actuator.id}:${pointId}`, `actuator:${actuator.id}`, `point:${pointId}`, 'Actuator -> ControlPoint'));
      }
    });

    actuator.feedbackPointIds.forEach((pointId) => {
      if (config.points.some((point) => point.id === pointId)) {
        edges.push(createEdge(`actuator-feedback:${actuator.id}:${pointId}`, `actuator:${actuator.id}`, `point:${pointId}`, 'Actuator -> FeedbackPoint'));
      }
    });
  });

  return { nodes, edges: uniqueEdges(edges) };
}

function createDataSourceNode(source: DataSource, index: number): AssetGraphNode {
  return {
    id: `source:${source.id}`,
    type: 'dataSourceNode',
    position: { x: 40, y: 120 + index * 150 },
    data: {
      label: source.name,
      subtitle: source.type,
      details: source.enabled ? 'enabled' : 'disabled',
      badge: 'DataSource',
      status: source.enabled ? 'ok' : 'disabled'
    }
  };
}

function createAssetNode(asset: Asset, index: number): AssetGraphNode {
  return {
    id: `asset:${asset.id}`,
    type: 'assetNode',
    position: { x: 380, y: 80 + index * 180 },
    data: {
      label: asset.name,
      subtitle: asset.type,
      details: `${asset.pointIds.length} points / ${asset.actuatorIds.length} actuators`,
      badge: 'Asset'
    }
  };
}

function createPointNode(point: Point, index: number): AssetGraphNode {
  const isControl = point.kind === 'control';
  return {
    id: `point:${point.id}`,
    type: isControl ? 'controlPointNode' : 'telemetryPointNode',
    position: { x: 720, y: 70 + index * 120 },
    data: {
      label: point.name,
      subtitle: `${point.kind} / ${point.valueType}`,
      details: point.displayUnit ?? point.rawUnit ?? point.dataSourceId ?? 'no unit',
      badge: isControl ? 'ControlPoint' : 'Point',
      status: point.enabled ? 'enabled' : 'disabled'
    }
  };
}

function createActuatorNode(actuator: Actuator, index: number): AssetGraphNode {
  return {
    id: `actuator:${actuator.id}`,
    type: 'actuatorNode',
    position: { x: 1060, y: 90 + index * 160 },
    data: {
      label: actuator.name,
      subtitle: actuator.type,
      details: actuator.supportedCommands.join(', ') || 'no commands',
      badge: 'Actuator',
      status: actuator.enabled ? 'enabled' : 'disabled'
    }
  };
}

function createEdge(id: string, source: string, target: string, label: string): Edge {
  return {
    id,
    source,
    target,
    label,
    markerEnd: { type: 'arrowclosed' },
    style: { stroke: 'rgba(45,212,191,0.72)', strokeWidth: 2 },
    labelStyle: { fill: 'rgb(203,213,225)', fontSize: 11 },
    labelBgStyle: { fill: 'rgba(15,23,42,0.9)' }
  };
}

function uniqueEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (seen.has(edge.id)) {
      return false;
    }
    seen.add(edge.id);
    return true;
  });
}

function mergeStoredPositions(nodes: AssetGraphNode[]): AssetGraphNode[] {
  const raw = window.localStorage.getItem(graphStorageKey);
  if (!raw) {
    return nodes;
  }

  try {
    const positions = JSON.parse(raw) as Record<string, { x: number; y: number }>;
    return nodes.map((node) => {
      const storedPosition = positions[node.id];
      return {
        ...node,
        position: isValidPosition(storedPosition) ? storedPosition : node.position
      };
    });
  } catch {
    return nodes;
  }
}

function isValidPosition(value: unknown): value is { x: number; y: number } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'x' in value &&
      'y' in value &&
      typeof value.x === 'number' &&
      typeof value.y === 'number'
  );
}

function GraphMetric({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function AssetNode(props: NodeProps<AssetGraphNode>): React.JSX.Element {
  return <GraphNode {...props} tone="asset" />;
}

function DataSourceNode(props: NodeProps<AssetGraphNode>): React.JSX.Element {
  return <GraphNode {...props} tone="source" />;
}

function TelemetryPointNode(props: NodeProps<AssetGraphNode>): React.JSX.Element {
  return <GraphNode {...props} tone="point" />;
}

function ControlPointNode(props: NodeProps<AssetGraphNode>): React.JSX.Element {
  return <GraphNode {...props} tone="control" />;
}

function ActuatorNode(props: NodeProps<AssetGraphNode>): React.JSX.Element {
  return <GraphNode {...props} tone="actuator" />;
}

function GraphNode({
  data,
  tone
}: NodeProps<AssetGraphNode> & { tone: 'asset' | 'source' | 'point' | 'control' | 'actuator' }): React.JSX.Element {
  const toneClasses = {
    asset: 'border-teal-300/35 bg-teal-500/10',
    source: 'border-sky-300/35 bg-sky-500/10',
    point: 'border-amber-300/35 bg-amber-500/10',
    control: 'border-rose-300/35 bg-rose-500/10',
    actuator: 'border-violet-300/35 bg-violet-500/10'
  };

  return (
    <div className={`min-w-[220px] max-w-[260px] rounded-md border p-3 shadow-lg shadow-black/20 ${toneClasses[tone]}`}>
      <Handle className="!bg-slate-300" position={Position.Left} type="target" />
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="rounded-md bg-slate-950/65 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-300">
          {data.badge}
        </span>
        {data.status ? <span className="text-[11px] text-slate-400">{data.status}</span> : null}
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      <div className="mt-1 text-xs text-slate-300">{data.subtitle}</div>
      <div className="mt-2 text-xs text-slate-500">{data.details}</div>
      <Handle className="!bg-teal-300" position={Position.Right} type="source" />
    </div>
  );
}

function getMiniMapColor(type?: string): string {
  if (type === 'assetNode') {
    return '#14b8a6';
  }
  if (type === 'dataSourceNode') {
    return '#38bdf8';
  }
  if (type === 'controlPointNode') {
    return '#fb7185';
  }
  if (type === 'actuatorNode') {
    return '#a78bfa';
  }
  return '#f59e0b';
}
