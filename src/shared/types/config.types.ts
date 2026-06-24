export type AppMode = 'mock' | 'real';

export type ConnectionConfig = {
  type: 'modbus-rtu';
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  timeoutMs: number;
  retries: number;
};

export type DeviceConfig = {
  id: string;
  name: string;
  model: string;
  protocol: 'modbus-rtu';
  modbusAddress: number;
  active: boolean;
  connection: ConnectionConfig;
};

export type ChannelType = 'temperature' | 'level' | 'custom';
export type ChannelDataType = 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32';

export type NoScalingConfig = {
  type: 'none';
};

export type LinearScalingConfig = {
  type: 'linear';
  rawMin: number;
  rawMax: number;
  displayMin: number;
  displayMax: number;
};

export type ScalingConfig = NoScalingConfig | LinearScalingConfig;

export type ChannelConfig = {
  id: string;
  name: string;
  type: ChannelType;
  deviceId: string;
  moduleInputNumber: number;
  registerAddress: number;
  modbusFunction: 3 | 4;
  dataType: ChannelDataType;
  registerCount: number;
  byteOrder: 'ABCD' | 'BADC' | 'CDAB' | 'DCBA';
  rawUnit: string;
  displayUnit: string;
  decimals: number;
  scaling: ScalingConfig;
};

export type CardSize = 'small' | 'medium' | 'large';

export type BarrelConfig = {
  id: string;
  name: string;
  active: boolean;
  visible: boolean;
  temperatureChannelId: string;
  levelChannelId: string;
  displayOrder: number;
  cardSize: CardSize;
};

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

export type AppConfig = {
  app: {
    mode: AppMode;
    pollingIntervalMs: number;
  };
  devices: DeviceConfig[];
  channels: ChannelConfig[];
  barrels: BarrelConfig[];
  thresholds: ThresholdConfig;
  interface: InterfaceConfig;
};
