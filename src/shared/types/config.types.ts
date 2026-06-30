export type AppMode = 'mock' | 'real';

export type AppRuntimeConfig = {
  mode: AppMode;
  pollingIntervalMs: number;
  simulationCommandsOnly: boolean;
  realWriteEnabled: boolean;
};

export type AssetType =
  | 'tank'
  | 'barrel'
  | 'pump'
  | 'valve'
  | 'scale'
  | 'truck'
  | 'loadingStation'
  | 'indicator'
  | 'line'
  | 'room'
  | 'machine'
  | 'custom';

export type Asset = {
  id: string;
  name: string;
  type: AssetType;
  description?: string;
  parentAssetId?: string | null;
  childAssetIds?: string[];
  pointIds: string[];
  actuatorIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DataSourceType = 'mock' | 'modbus-rtu' | 'modbus-tcp' | 'http' | 'mqtt' | 'manual';

export type MockConnectionConfig = {
  type: 'mock';
};

export type ModbusRtuConnectionConfig = {
  type: 'modbus-rtu';
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
};

export type ModbusTcpConnectionConfig = {
  type: 'modbus-tcp';
  host: string;
  port: number;
};

export type HttpConnectionConfig = {
  type: 'http';
  baseUrl: string;
};

export type MqttConnectionConfig = {
  type: 'mqtt';
  brokerUrl: string;
};

export type ManualConnectionConfig = {
  type: 'manual';
};

export type DataSourceConnection =
  | MockConnectionConfig
  | ModbusRtuConnectionConfig
  | ModbusTcpConnectionConfig
  | HttpConnectionConfig
  | MqttConnectionConfig
  | ManualConnectionConfig;

export type DataSource = {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;
  connection: DataSourceConnection;
  pollingIntervalMs?: number;
  timeoutMs?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PointKind = 'telemetry' | 'control' | 'calculated';

export type PointValueType = 'boolean' | 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'string';

export type PointStatus = 'ok' | 'warning' | 'alarm' | 'error' | 'stale' | 'disabled';

export type ModbusDataAddress = {
  protocol: 'modbus';
  slaveId: number;
  area: 'holding-register' | 'input-register' | 'coil' | 'discrete-input';
  functionCode: 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16;
  registerAddress?: number;
  coilAddress?: number;
  bitIndex?: number;
  registerCount?: number;
  valueType: Exclude<PointValueType, 'string'>;
  byteOrder?: 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';
};

export type MockDataAddress = {
  protocol: 'mock';
  seed?: number;
};

export type ManualDataAddress = {
  protocol: 'manual';
};

export type HttpDataAddress = {
  protocol: 'http';
  path: string;
};

export type MqttDataAddress = {
  protocol: 'mqtt';
  topic: string;
};

export type DataAddress =
  | ModbusDataAddress
  | MockDataAddress
  | ManualDataAddress
  | HttpDataAddress
  | MqttDataAddress;

export type NoScalingConfig = {
  type: 'none';
};

export type LinearScalingConfig = {
  type: 'linear';
  rawMin: number;
  rawMax: number;
  displayMin: number;
  displayMax: number;
  clamp?: boolean;
};

export type FactorScalingConfig = {
  type: 'factor';
  factor: number;
  offset?: number;
};

export type ScalingConfig = NoScalingConfig | LinearScalingConfig | FactorScalingConfig;

export type PointThresholdConfig = {
  warningLow?: number;
  warningHigh?: number;
  alarmLow?: number;
  alarmHigh?: number;
};

export type Point = {
  id: string;
  name: string;
  kind: PointKind;
  assetId?: string;
  dataSourceId?: string;
  valueType: PointValueType;
  rawUnit?: string;
  displayUnit?: string;
  address?: DataAddress;
  scaling?: ScalingConfig;
  thresholds?: PointThresholdConfig;
  recordable: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelemetryPoint = Point & {
  kind: 'telemetry';
  address: DataAddress;
  recordable: boolean;
};

export type ControlPoint = Point & {
  kind: 'control';
  allowedValues?: Array<boolean | number | string>;
  requiresConfirmation: boolean;
  safetyLevel: 'normal' | 'dangerous' | 'critical';
  writeAddress: DataAddress;
};

export type ActuatorType = 'pump' | 'valve' | 'relay' | 'led' | 'motor' | 'heater' | 'fan' | 'alarm' | 'custom';
export type CommandType = 'start' | 'stop' | 'open' | 'close' | 'turnOn' | 'turnOff' | 'reset' | 'setValue' | 'custom';
export type CommandStatus =
  | 'created'
  | 'pendingConfirmation'
  | 'rejected'
  | 'blocked'
  | 'sent'
  | 'confirmed'
  | 'failed'
  | 'timeout';

export type Actuator = {
  id: string;
  name: string;
  type: ActuatorType;
  assetId?: string;
  commandPointIds: string[];
  feedbackPointIds: string[];
  supportedCommands: CommandType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Interlock = {
  id: string;
  name: string;
  targetActuatorId: string;
  targetCommand: CommandType;
  enabled: boolean;
  condition: string;
  effect: 'warn' | 'block';
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type CommandResult = {
  commandId: string;
  success: boolean;
  sentAt?: string;
  confirmedAt?: string;
  feedbackPointId?: string;
  feedbackValue?: number | boolean | string;
  error?: string;
};

export type Command = {
  id: string;
  actuatorId: string;
  commandType: CommandType;
  value?: boolean | number | string;
  requestedBy?: string;
  requestedAt: string;
  status: CommandStatus;
  result?: CommandResult;
  error?: string;
};

export type ExecuteCommandRequest = {
  actuatorId: string;
  commandType: CommandType;
  value?: boolean | number | string;
  confirmed?: boolean;
  requestedBy?: string;
};

export type CommandHistoryQuery = {
  actuatorId?: string;
  limit?: number;
};

export type GraphValidationResult = {
  valid: boolean;
  errors: Array<{
    nodeId?: string;
    edgeId?: string;
    message: string;
  }>;
};

export type MonitoringPointConfig = {
  pointId: string;
  enabled: boolean;
  mode: 'interval' | 'onChange' | 'both';
  sampleIntervalMs: number;
  minChangeDelta?: number;
  retentionDays?: number;
};

export type MonitoringProfile = {
  id: string;
  assetId: string;
  name: string;
  enabled: boolean;
  pointConfigs: MonitoringPointConfig[];
  createdAt: string;
  updatedAt: string;
};

export type MonitoringSession = {
  id: string;
  assetId: string;
  profileId: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  startedAt: string;
  stoppedAt?: string;
  startedBy?: string;
  note?: string;
};

export type ProcessInputSchema = {
  fields: Array<{
    key: string;
    label: string;
    valueType: 'string' | 'number' | 'boolean';
    required: boolean;
    unit?: string;
    min?: number;
    max?: number;
    defaultValue?: string | number | boolean;
  }>;
};

export type Process = {
  id: string;
  name: string;
  description?: string;
  graphId: string;
  inputSchema: ProcessInputSchema;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProcessGraphNode = {
  id: string;
  type:
    | 'start'
    | 'complete'
    | 'input'
    | 'readPoint'
    | 'captureReading'
    | 'command'
    | 'condition'
    | 'math'
    | 'wait'
    | 'interlock'
    | 'event';
  data: Record<string, unknown>;
};

export type ProcessGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type ProcessGraph = {
  id: string;
  processId: string;
  nodes: ProcessGraphNode[];
  edges: ProcessGraphEdge[];
  createdAt: string;
  updatedAt: string;
};

export type ProcessJob = {
  id: string;
  processId: string;
  status: 'created' | 'waiting' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  context: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
};

export type TimeSeriesRecord = {
  id: string;
  assetId: string;
  pointId: string;
  monitoringSessionId?: string;
  timestamp: string;
  rawValue: number | boolean | string | null;
  value: number | boolean | string | null;
  unit?: string;
  quality: 'good' | 'bad' | 'uncertain' | 'stale';
  source: 'modbus' | 'mock' | 'manual' | 'calculated';
  metadata?: Record<string, unknown>;
};

export type GetTrendQuery = {
  assetId?: string;
  pointIds: string[];
  from: string;
  to: string;
  aggregation?: 'raw' | 'avg' | 'min' | 'max' | 'last';
  bucketMs?: number;
};

export type TrendSeries = {
  pointId: string;
  pointName: string;
  unit?: string;
  values: Array<{
    timestamp: string;
    value: number | boolean | string | null;
    quality: 'good' | 'bad' | 'uncertain' | 'stale';
  }>;
};

export type ExportResult = {
  success: boolean;
  path?: string;
  rows: number;
  message?: string;
};

export type CardSize = 'small' | 'medium' | 'large';

export type ValueThresholdConfig = {
  warningLow: number;
  alarmLow: number;
  warningHigh: number;
  alarmHigh: number;
};

export type ThresholdConfig = {
  temperature: ValueThresholdConfig;
  level: ValueThresholdConfig;
};

export type InterfaceConfig = {
  theme: 'dark' | 'light' | 'system';
  cardSize: CardSize;
  columns: 'auto' | number;
  showLastUpdate: boolean;
  showRawValuesInDetails: boolean;
  fullscreenOnStart: boolean;
};

export type ModbusNumericValueType = Exclude<PointValueType, 'boolean' | 'string'>;
export type ModbusByteOrder = NonNullable<ModbusDataAddress['byteOrder']>;

export type AppConfig = {
  schemaVersion: 2;
  app: AppRuntimeConfig;
  dataSources: DataSource[];
  assets: Asset[];
  points: Point[];
  actuators: Actuator[];
  interlocks: Interlock[];
  commands: Command[];
  monitoringProfiles: MonitoringProfile[];
  monitoringSessions: MonitoringSession[];
  processes: Process[];
  processGraphs: ProcessGraph[];
  processJobs: ProcessJob[];
  thresholds: ThresholdConfig;
  interface: InterfaceConfig;
};
