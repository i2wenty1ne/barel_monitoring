import type { AppMode, PointStatus } from './config.types';
import type { ChannelDataType, ChannelConfig } from './config.types';

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

export type ChannelReading = {
  channelId: string;
  rawValue: number;
  displayValue: number;
  rawUnit: string;
  displayUnit: string;
  status: Status;
  updatedAt: string;
  error?: string;
};

export type BarrelReading = {
  barrelId: string;
  temperature: ChannelReading | null;
  level: ChannelReading | null;
  status: Status;
  updatedAt: string;
};

export type MonitoringSnapshot = {
  status: Status;
  mode: AppMode;
  updatedAt: string;
  live: LiveSnapshot;
  channels: ChannelReading[];
  barrels: BarrelReading[];
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
  deviceId: string;
  modbusFunction: 3 | 4;
  registerAddress: number;
  registerCount: number;
  dataType: ChannelDataType;
  byteOrder: ChannelConfig['byteOrder'];
};

export type ManualReadResult = {
  success: boolean;
  registers?: number[];
  decodedValue?: number;
  message: string;
  error?: string;
};

export type RegisterScanRequest = {
  deviceId: string;
  startAddress: number;
  endAddress: number;
  registerCount: number;
  modbusFunctions: Array<3 | 4>;
  dataType: ChannelDataType;
  byteOrder: ChannelConfig['byteOrder'];
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
