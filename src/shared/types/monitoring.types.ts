import type { AppMode, ModbusByteOrder, ModbusNumericValueType, PointStatus } from './config.types';

export type Status = 'ok' | 'warning' | 'alarm' | 'no-data' | 'connection-error';

export type Reading = {
  pointId: string;
  assetId?: string;
  rawValue: number | boolean | string | null;
  displayValue: number | boolean | string | null;
  rawUnit?: string;
  displayUnit?: string;
  status: PointStatus;
  quality: 'good' | 'bad' | 'uncertain' | 'stale';
  timestamp: string;
  error?: string;
};

export type DataSourceStatus = {
  dataSourceId: string;
  status: PointStatus;
  message?: string;
  updatedAt: string;
};

export type LiveSnapshot = {
  timestamp: string;
  readingsByPointId: Record<string, Reading>;
  dataSourceStatuses: Record<string, DataSourceStatus>;
  errors: Array<{
    source: string;
    message: string;
    timestamp: string;
  }>;
};

export type MonitoringSnapshot = {
  status: Status;
  mode: AppMode;
  updatedAt: string;
  live: LiveSnapshot;
  activeWarningsCount: number;
  activeAlarmsCount: number;
};

export type DataServiceStatus = {
  mode: AppMode;
  connectionStatus: Status;
  lastSuccessfulReadAt: string | null;
  lastError?: string;
};

export type TestConnectionResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type ManualReadRequest = {
  dataSourceId: string;
  modbusFunction: 3 | 4;
  registerAddress: number;
  registerCount: number;
  dataType: ModbusNumericValueType;
  byteOrder: ModbusByteOrder;
};

export type ManualReadResult = {
  success: boolean;
  registers?: number[];
  decodedValue?: number;
  message: string;
  error?: string;
};

export type WriteControlPointResult = {
  success: boolean;
  pointId: string;
  dataSourceId?: string;
  value: boolean | number | string;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
};

export type RegisterScanRequest = {
  dataSourceId: string;
  startAddress: number;
  endAddress: number;
  registerCount: number;
  modbusFunctions: Array<3 | 4>;
  dataType: ModbusNumericValueType;
  byteOrder: ModbusByteOrder;
  attemptsPerRegister?: number;
  retryDelayMs?: number;
};

export type RegisterScanRow = {
  modbusFunction: 3 | 4;
  registerAddress: number;
  success: boolean;
  attempts?: number;
  registers?: number[];
  decodedValue?: number;
  message: string;
  error?: string;
};

export type RegisterScanResult = {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  total: number;
  successCount: number;
  errorCount: number;
  rows: RegisterScanRow[];
};
