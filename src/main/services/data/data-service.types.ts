import type { AppConfig } from '../../../shared/types/config.types';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  RegisterScanRequest,
  RegisterScanResult,
  TestConnectionResult
} from '../../../shared/types/monitoring.types';

export type MonitoringSnapshotListener = (snapshot: MonitoringSnapshot) => void;

export type DataService = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: (config: AppConfig) => Promise<void>;
  readAllChannels: () => Promise<MonitoringSnapshot>;
  readRegisters: (request: ManualReadRequest) => Promise<ManualReadResult>;
  scanRegisters: (request: RegisterScanRequest) => Promise<RegisterScanResult>;
  testConnection: () => Promise<TestConnectionResult>;
  getStatus: () => DataServiceStatus;
  subscribe: (listener: MonitoringSnapshotListener) => () => void;
};
