import type { AppConfig } from '../types/config.types';

const createdAt = '2026-06-30T00:00:00.000Z';

export const defaultConfig: AppConfig = {
  schemaVersion: 2,
  app: {
    mode: 'mock',
    pollingIntervalMs: 1000,
    simulationCommandsOnly: true,
    realWriteEnabled: false
  },
  dataSources: [
    {
      id: 'mv110-1',
      name: 'МВ110 №1',
      type: 'modbus-rtu',
      enabled: true,
      connection: {
        type: 'modbus-rtu',
        port: 'COM3',
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      },
      pollingIntervalMs: 1000,
      timeoutMs: 1000,
      retryCount: 3,
      metadata: {
        model: 'МВ110-224.8А',
        slaveId: 16
      },
      createdAt,
      updatedAt: createdAt
    }
  ],
  assets: [
    {
      id: 'barrel-1',
      name: 'Бочка 1',
      type: 'barrel',
      pointIds: ['temperature-barrel-1', 'level-barrel-1'],
      actuatorIds: [],
      metadata: {
        legacyCardSize: 'medium',
        displayOrder: 1,
        maxVolumeL: 1000,
        heightMm: 3000
      },
      createdAt,
      updatedAt: createdAt
    }
  ],
  points: [
    {
      id: 'temperature-barrel-1',
      name: 'Температура бочки 1',
      kind: 'telemetry',
      assetId: 'barrel-1',
      dataSourceId: 'mv110-1',
      valueType: 'float32',
      rawUnit: '°C',
      displayUnit: '°C',
      address: {
        protocol: 'modbus',
        slaveId: 16,
        area: 'input-register',
        functionCode: 4,
        registerAddress: 4,
        registerCount: 2,
        valueType: 'float32',
        byteOrder: 'ABCD'
      },
      scaling: { type: 'none' },
      thresholds: {
        warningLow: 10,
        alarmLow: 5,
        warningHigh: 60,
        alarmHigh: 80
      },
      recordable: true,
      enabled: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'level-barrel-1',
      name: 'Уровень бочки 1',
      kind: 'telemetry',
      assetId: 'barrel-1',
      dataSourceId: 'mv110-1',
      valueType: 'float32',
      rawUnit: 'mA',
      displayUnit: '%',
      address: {
        protocol: 'modbus',
        slaveId: 16,
        area: 'input-register',
        functionCode: 4,
        registerAddress: 10,
        registerCount: 2,
        valueType: 'float32',
        byteOrder: 'ABCD'
      },
      scaling: {
        type: 'linear',
        rawMin: 4,
        rawMax: 20,
        displayMin: 0,
        displayMax: 100,
        clamp: true
      },
      thresholds: {
        warningLow: 15,
        alarmLow: 5,
        warningHigh: 90,
        alarmHigh: 98
      },
      recordable: true,
      enabled: true,
      createdAt,
      updatedAt: createdAt
    }
  ],
  actuators: [],
  interlocks: [],
  commands: [],
  monitoringProfiles: [
    {
      id: 'barrel-1-monitoring-profile',
      assetId: 'barrel-1',
      name: 'Мониторинг Бочки 1',
      enabled: true,
      pointConfigs: [
        {
          pointId: 'temperature-barrel-1',
          enabled: true,
          mode: 'both',
          sampleIntervalMs: 10000,
          minChangeDelta: 0.2,
          retentionDays: 30
        },
        {
          pointId: 'level-barrel-1',
          enabled: true,
          mode: 'both',
          sampleIntervalMs: 5000,
          minChangeDelta: 1,
          retentionDays: 30
        }
      ],
      createdAt,
      updatedAt: createdAt
    }
  ],
  monitoringSessions: [],
  processes: [],
  processGraphs: [],
  processJobs: [],
  devices: [
    {
      id: 'mv110-1',
      name: 'МВ110 №1',
      model: 'МВ110-224.8А',
      protocol: 'modbus-rtu',
      modbusAddress: 16,
      active: true,
      connection: {
        type: 'modbus-rtu',
        port: 'COM3',
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        timeoutMs: 1000,
        retries: 3
      }
    }
  ],
  channels: [
    {
      id: 'temperature-barrel-1',
      name: 'Температура бочки 1',
      type: 'temperature',
      deviceId: 'mv110-1',
      moduleInputNumber: 1,
      registerAddress: 4,
      modbusFunction: 4,
      dataType: 'float32',
      registerCount: 2,
      byteOrder: 'ABCD',
      rawUnit: '°C',
      displayUnit: '°C',
      decimals: 1,
      scaling: { type: 'none' }
    },
    {
      id: 'level-barrel-1',
      name: 'Уровень бочки 1',
      type: 'level',
      deviceId: 'mv110-1',
      moduleInputNumber: 2,
      registerAddress: 10,
      modbusFunction: 4,
      dataType: 'float32',
      registerCount: 2,
      byteOrder: 'ABCD',
      rawUnit: 'mA',
      displayUnit: '%',
      decimals: 0,
      scaling: {
        type: 'linear',
        rawMin: 4,
        rawMax: 20,
        displayMin: 0,
        displayMax: 100,
        clamp: true
      }
    }
  ],
  barrels: [
    {
      id: 'barrel-1',
      name: 'Бочка 1',
      active: true,
      visible: true,
      temperatureChannelId: 'temperature-barrel-1',
      levelChannelId: 'level-barrel-1',
      displayOrder: 1,
      cardSize: 'medium'
    }
  ],
  thresholds: {
    temperature: {
      warningLow: 10,
      alarmLow: 5,
      warningHigh: 60,
      alarmHigh: 80
    },
    level: {
      warningLow: 15,
      alarmLow: 5,
      warningHigh: 90,
      alarmHigh: 98
    }
  },
  interface: {
    theme: 'dark',
    cardSize: 'medium',
    columns: 'auto',
    showLastUpdate: true,
    showRawValuesInDetails: true,
    fullscreenOnStart: false
  }
};
