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
import type { EventLogService } from '../event-log/event-log.service';
import type { DataService, MonitoringSnapshotListener } from './data-service.types';
import { MockDataService } from './mock-data.service';
import { ModbusDataService } from './modbus-data.service';

export class DataServiceManager implements DataService {
  private readonly eventLogService: EventLogService;
  private service: DataService;
  private readonly listeners = new Set<MonitoringSnapshotListener>();
  private unsubscribeFromService: (() => void) | null = null;

  public constructor(config: AppConfig, eventLogService: EventLogService) {
    this.eventLogService = eventLogService;
    this.service = this.createService(config);
    this.bindService();
  }

  public async start(): Promise<void> {
    await this.service.start();
  }

  public async stop(): Promise<void> {
    await this.service.stop();
    this.unsubscribeFromService?.();
    this.unsubscribeFromService = null;
  }

  public async restart(config: AppConfig): Promise<void> {
    await this.stop();
    this.service = this.createService(config);
    this.bindService();
    await this.start();
  }

  public async readAllChannels(): Promise<MonitoringSnapshot> {
    return this.service.readAllChannels();
  }

  public async readRegisters(request: ManualReadRequest): Promise<ManualReadResult> {
    return this.service.readRegisters(request);
  }

  public async scanRegisters(request: RegisterScanRequest): Promise<RegisterScanResult> {
    return this.service.scanRegisters(request);
  }

  public async testConnection(dataSourceId?: string): Promise<TestConnectionResult> {
    return this.service.testConnection(dataSourceId);
  }

  public getStatus(): DataServiceStatus {
    return this.service.getStatus();
  }

  public subscribe(listener: MonitoringSnapshotListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private createService(config: AppConfig): DataService {
    if (config.app.mode === 'real') {
      return new ModbusDataService(config, this.eventLogService);
    }

    return new MockDataService(config);
  }

  private bindService(): void {
    this.unsubscribeFromService = this.service.subscribe((snapshot) => {
      this.listeners.forEach((listener) => listener(snapshot));
    });
  }
}
