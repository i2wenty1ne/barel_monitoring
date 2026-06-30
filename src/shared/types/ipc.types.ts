import type { AppConfig } from './config.types';
import type {
  Asset,
  Command,
  CommandHistoryQuery,
  CommandResult,
  DataSource,
  DeviceConfig,
  ExecuteCommandRequest,
  GraphValidationResult,
  Point,
  ProcessGraph,
  ProcessJob
} from './config.types';
import type { EventLogEntry, EventLogFilter } from './event.types';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  RegisterScanRequest,
  RegisterScanResult,
  TestConnectionResult
} from './monitoring.types';

export type SerialPortInfo = {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  friendlyName?: string;
};

export type SystemInfo = {
  appName: string;
  appVersion: string;
  buildMode: 'development' | 'production';
  electronVersion?: string;
  nodeVersion?: string;
  chromeVersion?: string;
  platform: NodeJS.Platform;
  arch: string;
  appMode?: string;
  configPath: string;
  logsPath: string;
  devices: DeviceConfig[];
  dataSources: DataSource[];
  assets: Asset[];
  points: Point[];
};

export type IpcActionResult = {
  success: boolean;
  message?: string;
};

export type ConfigValidationError = {
  path: string;
  message: string;
};

export type ConfigGetResult = {
  config: AppConfig;
  validationError?: string;
};

export type ConfigSaveResult = IpcActionResult & {
  config?: AppConfig;
  validationErrors?: ConfigValidationError[];
};

export type BarrelMonitorApi = {
  config: {
    get: () => Promise<ConfigGetResult>;
    save: (config: AppConfig) => Promise<ConfigSaveResult>;
    reload: () => Promise<ConfigGetResult>;
    reset: () => Promise<ConfigGetResult>;
  };
  monitoring: {
    getSnapshot: () => Promise<MonitoringSnapshot>;
    readAllNow: () => Promise<MonitoringSnapshot>;
    readRegisters: (request: ManualReadRequest) => Promise<ManualReadResult>;
    scanRegisters: (request: RegisterScanRequest) => Promise<RegisterScanResult>;
    testConnection: (dataSourceId?: string) => Promise<TestConnectionResult>;
    getStatus: () => Promise<DataServiceStatus>;
    subscribe: (callback: (snapshot: MonitoringSnapshot) => void) => () => void;
  };
  events: {
    list: (filter?: EventLogFilter) => Promise<EventLogEntry[]>;
    clear: () => Promise<IpcActionResult>;
    subscribe: (callback: (entry: EventLogEntry) => void) => () => void;
  };
  commands: {
    execute: (request: ExecuteCommandRequest) => Promise<CommandResult>;
    getHistory: (query?: CommandHistoryQuery) => Promise<Command[]>;
  };
  processes: {
    validateGraph: (graph: ProcessGraph) => Promise<GraphValidationResult>;
    startJob: (processId: string, input?: Record<string, unknown>) => Promise<ProcessJob>;
    getJob: (jobId: string) => Promise<ProcessJob | null>;
  };
  system: {
    getInfo: () => Promise<SystemInfo>;
    listSerialPorts: () => Promise<SerialPortInfo[]>;
    openConfigFolder: () => Promise<IpcActionResult>;
    openLogsFolder: () => Promise<IpcActionResult>;
  };
};
