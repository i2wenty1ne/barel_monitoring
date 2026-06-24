import type { AppConfig } from '../types/config.types';

export const defaultConfig: AppConfig = {
  app: {
    mode: 'mock',
    pollingIntervalMs: 1000
  },
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
      scaling: {
        type: 'none'
      }
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
        displayMax: 100
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
