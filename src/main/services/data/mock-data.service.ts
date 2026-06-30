import type { AppConfig, Point, PointStatus } from '../../../shared/types/config.types';
import type {
  DataSourceStatus,
  DataServiceStatus,
  LiveSnapshot,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  Reading,
  RegisterScanRequest,
  RegisterScanResult,
  RegisterScanRow,
  TestConnectionResult
} from '../../../shared/types/monitoring.types';
import { applyScaling } from '../../../shared/lib/scaling';
import { getWorstStatus } from '../../../shared/lib/thresholds';
import type { DataService, MonitoringSnapshotListener } from './data-service.types';

export class MockDataService implements DataService {
  private config: AppConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: MonitoringSnapshot | null = null;
  private lastSuccessfulReadAt: string | null = null;
  private readonly listeners = new Set<MonitoringSnapshotListener>();
  private mockTruckWeightKg = 12000;

  public constructor(config: AppConfig) {
    this.config = config;
  }

  public async start(): Promise<void> {
    if (this.intervalId) {
      return;
    }

    await this.publishSnapshot();
    this.intervalId = setInterval(() => {
      void this.publishSnapshot();
    }, this.config.app.pollingIntervalMs);
  }

  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async restart(config: AppConfig): Promise<void> {
    await this.stop();
    this.config = config;
    await this.start();
  }

  public async readAllPoints(): Promise<MonitoringSnapshot> {
    const updatedAt = new Date().toISOString();
    const readings = this.config.points.map((point) => this.createPointReading(point, updatedAt));
    const status = getWorstStatus(readings.map((reading) => pointStatusToStatus(reading.status)));

    const snapshot: MonitoringSnapshot = {
      status,
      mode: this.config.app.mode,
      updatedAt,
      live: this.createLiveSnapshot(readings, updatedAt),
      activeWarningsCount: readings.filter((reading) => reading.status === 'warning').length,
      activeAlarmsCount: readings.filter((reading) => reading.status === 'alarm').length
    };

    this.lastSnapshot = snapshot;
    this.lastSuccessfulReadAt = updatedAt;
    return snapshot;
  }

  public async readRegisters(request: ManualReadRequest): Promise<ManualReadResult> {
    return {
      success: true,
      registers: Array.from({ length: request.registerCount }, (_, index) => 1000 + index),
      decodedValue: 42,
      message: 'Mock manual register read',
    };
  }

  public async scanRegisters(request: RegisterScanRequest): Promise<RegisterScanResult> {
    const normalizedRequest = normalizeRegisterScanRequest(request);
    const startedAt = new Date().toISOString();
    const rows: RegisterScanRow[] = [];

    normalizedRequest.modbusFunctions.forEach((modbusFunction) => {
      for (
        let registerAddress = normalizedRequest.startAddress;
        registerAddress <= normalizedRequest.endAddress;
        registerAddress += 1
      ) {
        const success = (registerAddress + modbusFunction) % 8 === 0;
        const registers = success
          ? Array.from(
              { length: normalizedRequest.registerCount },
              (_, index) => modbusFunction * 1000 + registerAddress + index
            )
          : undefined;

        rows.push({
          modbusFunction,
          registerAddress,
          success,
          attempts: success ? 1 : normalizedRequest.attemptsPerRegister,
          registers,
          decodedValue: success ? registers?.[0] : undefined,
          message: success ? 'Mock-регистр найден' : 'Mock-таймаут',
          error: success ? undefined : 'Mock-сканирование: нет ответа'
        });
      }
    });

    const finishedAt = new Date().toISOString();
    const successCount = rows.filter((row) => row.success).length;

    return {
      success: successCount > 0,
      startedAt,
      finishedAt,
      total: rows.length,
      successCount,
      errorCount: rows.length - successCount,
      rows
    };
  }

  public async testConnection(dataSourceId?: string): Promise<TestConnectionResult> {
    const source = dataSourceId
      ? this.config.dataSources.find((item) => item.id === dataSourceId)
      : this.config.dataSources[0];

    return {
      success: true,
      message: 'Mock connection is active',
      details: {
        mode: this.config.app.mode,
        dataSourceId: source?.id,
        dataSourceName: source?.name,
        points: this.config.points.length,
        assets: this.config.assets.length
      }
    };
  }

  public getStatus(): DataServiceStatus {
    return {
      mode: this.config.app.mode,
      connectionStatus: this.lastSnapshot?.status ?? 'ok',
      lastSuccessfulReadAt: this.lastSuccessfulReadAt
    };
  }

  public subscribe(listener: MonitoringSnapshotListener): () => void {
    this.listeners.add(listener);

    if (this.lastSnapshot) {
      listener(this.lastSnapshot);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private createLiveSnapshot(readings: Reading[], updatedAt: string): LiveSnapshot {
    const readingsByPointId = Object.fromEntries(readings.map((reading) => [reading.pointId, reading]));
    const dataSourceStatuses = Object.fromEntries(
      this.config.dataSources.map((source): [string, DataSourceStatus] => [
        source.id,
        {
          dataSourceId: source.id,
          status: source.enabled ? 'ok' : 'disabled',
          updatedAt
        }
      ])
    );

    return {
      timestamp: updatedAt,
      readingsByPointId,
      dataSourceStatuses,
      errors: readings
        .filter((reading) => reading.error)
        .map((reading) => ({
          source: reading.pointId,
          message: reading.error ?? 'Mock reading error',
          timestamp: updatedAt
        }))
    };
  }

  private createPointReading(point: Point, updatedAt: string): Reading {
    const rawValue = this.createPointRawValue(point);
    const displayValue = typeof rawValue === 'number' && point.scaling
      ? applyScaling(rawValue, point.scaling)
      : rawValue;

    return {
      pointId: point.id,
      assetId: point.assetId,
      rawValue,
      displayValue: typeof displayValue === 'number' ? Number(displayValue.toFixed(2)) : displayValue,
      rawUnit: point.rawUnit,
      displayUnit: point.displayUnit,
      status: point.enabled ? inferMockPointStatus(point, displayValue) : 'disabled',
      quality: point.enabled ? 'good' : 'bad',
      timestamp: updatedAt
    };
  }

  private createPointRawValue(point: Point): number | boolean | string | null {
    const normalized = `${point.id} ${point.name}`.toLowerCase();

    if (point.kind === 'control') {
      return null;
    }

    if (point.valueType === 'boolean') {
      if (normalized.includes('truck') || normalized.includes('грузовик')) {
        return true;
      }

      if (normalized.includes('pump') || normalized.includes('насос')) {
        return this.isActuatorRunning('pump');
      }

      if (normalized.includes('led') || normalized.includes('свет')) {
        return this.isActuatorRunning('led') || this.isActuatorRunning('indicator');
      }

      return true;
    }

    if (normalized.includes('weight') || normalized.includes('вес') || normalized.includes('масса')) {
      if (this.isActuatorRunning('pump')) {
        this.mockTruckWeightKg += 180 + Math.random() * 80;
      }

      return this.mockTruckWeightKg;
    }

    return Math.random() * 100;
  }

  private isActuatorRunning(type: string): boolean {
    const actuators = this.config.actuators.filter((actuator) => actuator.type === type);
    if (actuators.length === 0) {
      return false;
    }

    return actuators.some((actuator) => {
      const commands = this.config.commands.filter((command) => command.actuatorId === actuator.id);
      const lastCommand = commands.at(-1);
      if (!lastCommand || (lastCommand.status !== 'confirmed' && lastCommand.status !== 'sent')) {
        return false;
      }

      return ['start', 'turnOn', 'open', 'setValue'].includes(lastCommand.commandType) && lastCommand.value !== false;
    });
  }

  private async publishSnapshot(): Promise<void> {
    const snapshot = await this.readAllPoints();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

function inferMockPointStatus(point: Point, displayValue: Reading['displayValue']): PointStatus {
  if (typeof displayValue !== 'number') {
    return 'ok';
  }

  if (point.thresholds?.alarmLow !== undefined && displayValue <= point.thresholds.alarmLow) {
    return 'alarm';
  }

  if (point.thresholds?.alarmHigh !== undefined && displayValue >= point.thresholds.alarmHigh) {
    return 'alarm';
  }

  if (point.thresholds?.warningLow !== undefined && displayValue <= point.thresholds.warningLow) {
    return 'warning';
  }

  if (point.thresholds?.warningHigh !== undefined && displayValue >= point.thresholds.warningHigh) {
    return 'warning';
  }

  return 'ok';
}

function pointStatusToStatus(status: PointStatus): MonitoringSnapshot['status'] {
  if (status === 'error') {
    return 'connection-error';
  }

  if (status === 'stale' || status === 'disabled') {
    return 'no-data';
  }

  return status;
}

function normalizeRegisterScanRequest(request: RegisterScanRequest): RegisterScanRequest {
  const startAddress = Math.max(0, Math.trunc(request.startAddress));
  const requestedEndAddress = Math.max(startAddress, Math.trunc(request.endAddress));
  const endAddress = Math.min(requestedEndAddress, startAddress + 255);
  const registerCount = Math.min(8, Math.max(1, Math.trunc(request.registerCount)));
  const attemptsPerRegister = Math.min(10, Math.max(1, Math.trunc(request.attemptsPerRegister ?? 3)));
  const retryDelayMs = Math.min(5000, Math.max(0, Math.trunc(request.retryDelayMs ?? 80)));
  const modbusFunctions: Array<3 | 4> =
    request.modbusFunctions.length > 0 ? request.modbusFunctions : [3, 4];

  return {
    ...request,
    startAddress,
    endAddress,
    registerCount,
    modbusFunctions,
    attemptsPerRegister,
    retryDelayMs
  };
}
