import type { AppConfig } from './config.types';
import type { EventLogEntry, EventLogFilter } from './event.types';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
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
  electronVersion?: string;
  nodeVersion?: string;
  chromeVersion?: string;
  platform: NodeJS.Platform;
  arch: string;
  appMode?: string;
  configPath: string;
  logsPath: string;
  currentDeviceName?: string;
  currentDeviceModel?: string;
  currentDeviceAddress?: number;
  currentConnectionPort?: string;
  currentConnectionBaudRate?: number;
  currentConnectionParity?: string;
  currentConnectionStopBits?: number;
  currentConnectionDataBits?: number;
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
    testConnection: () => Promise<TestConnectionResult>;
    getStatus: () => Promise<DataServiceStatus>;
    subscribe: (callback: (snapshot: MonitoringSnapshot) => void) => () => void;
  };
  events: {
    list: (filter?: EventLogFilter) => Promise<EventLogEntry[]>;
    clear: () => Promise<IpcActionResult>;
    subscribe: (callback: (entry: EventLogEntry) => void) => () => void;
  };
  system: {
    getInfo: () => Promise<SystemInfo>;
    listSerialPorts: () => Promise<SerialPortInfo[]>;
    openConfigFolder: () => Promise<IpcActionResult>;
    openLogsFolder: () => Promise<IpcActionResult>;
  };
};
