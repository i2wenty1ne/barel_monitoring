import type { AppConfig } from '../../../shared/types/config.types';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  RegisterScanRequest,
  RegisterScanResult,
  TestConnectionResult,
  WriteControlPointResult
} from '../../../shared/types/monitoring.types';

export type MonitoringSnapshotListener = (snapshot: MonitoringSnapshot) => void;

export type DataService = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: (config: AppConfig) => Promise<void>;
  readAllPoints: () => Promise<MonitoringSnapshot>;
  readRegisters: (request: ManualReadRequest) => Promise<ManualReadResult>;
  writeControlPoint: (pointId: string, value: boolean | number | string) => Promise<WriteControlPointResult>;
  scanRegisters: (request: RegisterScanRequest) => Promise<RegisterScanResult>;
  testConnection: (dataSourceId?: string) => Promise<TestConnectionResult>;
  getStatus: () => DataServiceStatus;
  subscribe: (listener: MonitoringSnapshotListener) => () => void;
};
