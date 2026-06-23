import type { AppConfig } from './config.types';
import type { EventLogEntry, EventLogFilter } from './event.types';
import type {
  DataServiceStatus,
  MonitoringSnapshot,
  TestConnectionResult
} from './monitoring.types';

export type SystemInfo = {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
  configPath: string;
  logsPath: string;
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
    openConfigFolder: () => Promise<IpcActionResult>;
    openLogsFolder: () => Promise<IpcActionResult>;
  };
};
