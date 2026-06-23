import type { AppConfig } from '../../../../shared/types/config.types';
import type { EventLogEntry } from '../../../../shared/types/event.types';
import type { SystemInfo } from '../../../../shared/types/ipc.types';
import type {
  DataServiceStatus,
  MonitoringSnapshot,
  TestConnectionResult
} from '../../../../shared/types/monitoring.types';

export type DiagnosticsData = {
  config: AppConfig;
  snapshot: MonitoringSnapshot;
  serviceStatus: DataServiceStatus;
  systemInfo: SystemInfo;
  recentEvents: EventLogEntry[];
};

export type DiagnosticsActionResult = {
  type: 'success' | 'error';
  message: string;
};

export type DiagnosticsState = {
  data: DiagnosticsData | null;
  isLoading: boolean;
  error: string | null;
  actionResult: DiagnosticsActionResult | null;
  testConnectionResult: TestConnectionResult | null;
};
