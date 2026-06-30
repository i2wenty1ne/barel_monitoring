import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig } from '../shared/types/config.types';
import type {
  Command,
  CommandHistoryQuery,
  CommandResult,
  ExecuteCommandRequest,
  GraphValidationResult,
  ProcessGraph,
  ProcessJob
} from '../shared/types/config.types';
import type { EventLogEntry, EventLogFilter } from '../shared/types/event.types';
import type {
  BarrelMonitorApi,
  ConfigGetResult,
  ConfigSaveResult,
  IpcActionResult,
  SerialPortInfo,
  SystemInfo
} from '../shared/types/ipc.types';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  RegisterScanRequest,
  RegisterScanResult,
  TestConnectionResult
} from '../shared/types/monitoring.types';
import { IPC_CHANNELS } from '../main/ipc/ipc-channels';

const api: BarrelMonitorApi = {
  config: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.config.get) as Promise<ConfigGetResult>,
    save: (config: AppConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.config.save, config) as Promise<ConfigSaveResult>,
    reload: () => ipcRenderer.invoke(IPC_CHANNELS.config.reload) as Promise<ConfigGetResult>,
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.config.reset) as Promise<ConfigGetResult>
  },
  monitoring: {
    getSnapshot: () =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.getSnapshot) as Promise<MonitoringSnapshot>,
    readAllNow: () =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.readAllNow) as Promise<MonitoringSnapshot>,
    readRegisters: (request: ManualReadRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.readRegisters, request) as Promise<ManualReadResult>,
    scanRegisters: (request: RegisterScanRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.scanRegisters, request) as Promise<RegisterScanResult>,
    testConnection: (dataSourceId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.testConnection, dataSourceId) as Promise<TestConnectionResult>,
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.monitoring.getStatus) as Promise<DataServiceStatus>,
    subscribe: (callback: (snapshot: MonitoringSnapshot) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, snapshot: MonitoringSnapshot): void => {
        callback(snapshot);
      };

      ipcRenderer.on(IPC_CHANNELS.monitoring.snapshotUpdated, listener);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.monitoring.snapshotUpdated, listener);
      };
    }
  },
  events: {
    list: (filter?: EventLogFilter) =>
      ipcRenderer.invoke(IPC_CHANNELS.events.list, filter) as Promise<EventLogEntry[]>,
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.events.clear) as Promise<IpcActionResult>,
    subscribe: (callback: (entry: EventLogEntry) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, entry: EventLogEntry): void => {
        callback(entry);
      };

      ipcRenderer.on(IPC_CHANNELS.events.entryCreated, listener);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.events.entryCreated, listener);
      };
    }
  },
  commands: {
    execute: (request: ExecuteCommandRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.commands.execute, request) as Promise<CommandResult>,
    getHistory: (query?: CommandHistoryQuery) =>
      ipcRenderer.invoke(IPC_CHANNELS.commands.getHistory, query) as Promise<Command[]>
  },
  processes: {
    validateGraph: (graph: ProcessGraph) =>
      ipcRenderer.invoke(IPC_CHANNELS.processes.validateGraph, graph) as Promise<GraphValidationResult>,
    startJob: (processId: string, input?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.processes.startJob, processId, input ?? {}) as Promise<ProcessJob>,
    getJob: (jobId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.processes.getJob, jobId) as Promise<ProcessJob | null>
  },
  system: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.system.getInfo) as Promise<SystemInfo>,
    listSerialPorts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.system.listSerialPorts) as Promise<SerialPortInfo[]>,
    openConfigFolder: () =>
      ipcRenderer.invoke(IPC_CHANNELS.system.openConfigFolder) as Promise<IpcActionResult>,
    openLogsFolder: () =>
      ipcRenderer.invoke(IPC_CHANNELS.system.openLogsFolder) as Promise<IpcActionResult>
  }
};

contextBridge.exposeInMainWorld('barrelMonitor', api);
