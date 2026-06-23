import type { AppConfig } from '../../../shared/types/config.types';
import type {
  DataServiceStatus,
  MonitoringSnapshot,
  TestConnectionResult
} from '../../../shared/types/monitoring.types';
import type { DataService, MonitoringSnapshotListener } from './data-service.types';

export class ModbusDataService implements DataService {
  private config: AppConfig;
  private readonly listeners = new Set<MonitoringSnapshotListener>();

  public constructor(config: AppConfig) {
    this.config = config;
  }

  public async start(): Promise<void> {
    await Promise.resolve();
  }

  public async stop(): Promise<void> {
    await Promise.resolve();
  }

  public async restart(config: AppConfig): Promise<void> {
    this.config = config;
    await Promise.resolve();
  }

  public async readAllChannels(): Promise<MonitoringSnapshot> {
    const updatedAt = new Date().toISOString();
    const snapshot: MonitoringSnapshot = {
      status: 'connection-error',
      mode: this.config.app.mode,
      updatedAt,
      channels: this.config.channels.map((channel) => ({
        channelId: channel.id,
        rawValue: 0,
        displayValue: 0,
        rawUnit: channel.rawUnit,
        displayUnit: channel.displayUnit,
        status: 'connection-error',
        updatedAt,
        error: 'Real Modbus service is not implemented yet'
      })),
      barrels: this.config.barrels.map((barrel) => ({
        barrelId: barrel.id,
        temperature: null,
        level: null,
        status: 'connection-error',
        updatedAt
      })),
      activeWarningsCount: 0,
      activeAlarmsCount: this.config.barrels.length
    };

    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  public async testConnection(): Promise<TestConnectionResult> {
    return {
      success: false,
      message: 'Real Modbus service is not implemented yet',
      details: {
        port: this.config.connection.port,
        baudRate: this.config.connection.baudRate
      }
    };
  }

  public getStatus(): DataServiceStatus {
    return {
      mode: this.config.app.mode,
      connectionStatus: 'connection-error',
      lastSuccessfulReadAt: null,
      lastError: 'Real Modbus service is not implemented yet'
    };
  }

  public subscribe(listener: MonitoringSnapshotListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
