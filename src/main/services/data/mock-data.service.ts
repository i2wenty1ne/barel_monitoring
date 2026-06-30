import type { AppConfig, ChannelConfig, Point } from '../../../shared/types/config.types';
import type {
  BarrelReading,
  ChannelReading,
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
  Status,
  TestConnectionResult
} from '../../../shared/types/monitoring.types';
import { applyScaling } from '../../../shared/lib/scaling';
import { getValueStatus, getWorstStatus } from '../../../shared/lib/thresholds';
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

  public async readAllChannels(): Promise<MonitoringSnapshot> {
    const updatedAt = new Date().toISOString();
    const channels = this.config.channels.map((channel) => this.createChannelReading(channel, updatedAt));
    const readingByChannelId = new Map(channels.map((reading) => [reading.channelId, reading]));
    const barrels = this.config.barrels.map((barrel) => {
      const temperature = readingByChannelId.get(barrel.temperatureChannelId) ?? null;
      const level = readingByChannelId.get(barrel.levelChannelId) ?? null;
      const barrelStatus = getWorstStatus([
        temperature?.status ?? 'no-data',
        level?.status ?? 'no-data'
      ]);

      return {
        barrelId: barrel.id,
        temperature,
        level,
        status: barrelStatus,
        updatedAt
      } satisfies BarrelReading;
    });
    const status = getWorstStatus(barrels.map((barrel) => barrel.status));

    const snapshot: MonitoringSnapshot = {
      status,
      mode: this.config.app.mode,
      updatedAt,
      live: this.createLiveSnapshot(channels, updatedAt),
      channels,
      barrels,
      activeWarningsCount: barrels.filter((barrel) => barrel.status === 'warning').length,
      activeAlarmsCount: barrels.filter((barrel) => barrel.status === 'alarm').length
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
        channels: this.config.channels.length,
        barrels: this.config.barrels.length
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

  private createChannelReading(channel: ChannelConfig, updatedAt: string): ChannelReading {
    const rawValue = this.createRawValue(channel);
    const displayValue = applyScaling(rawValue, channel.scaling);
    const roundedDisplayValue = Number(displayValue.toFixed(channel.decimals));

    return {
      channelId: channel.id,
      rawValue: Number(rawValue.toFixed(3)),
      displayValue: roundedDisplayValue,
      rawUnit: channel.rawUnit,
      displayUnit: channel.displayUnit,
      status: this.getChannelStatus(channel, roundedDisplayValue),
      updatedAt
    };
  }

  private createLiveSnapshot(channels: ChannelReading[], updatedAt: string): LiveSnapshot {
    const channelReadings = channels.map((channel) => [channel.channelId, this.channelReadingToPointReading(channel)] as const);
    const channelPointIds = new Set(channels.map((channel) => channel.channelId));
    const pointReadings = this.config.points
      .filter((point) => !channelPointIds.has(point.id))
      .map((point) => [point.id, this.createPointReading(point, updatedAt)] as const);
    const readingsByPointId = Object.fromEntries([...channelReadings, ...pointReadings]);
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
      errors: channels
        .filter((channel) => channel.error)
        .map((channel) => ({
          source: channel.channelId,
          message: channel.error ?? 'Mock reading error',
          timestamp: updatedAt
        }))
    };
  }

  private channelReadingToPointReading(channel: ChannelReading): Reading {
    const point = this.config.points.find((item) => item.id === channel.channelId);

    return {
      pointId: channel.channelId,
      assetId: point?.assetId,
      rawValue: channel.rawValue,
      displayValue: channel.displayValue,
      rawUnit: channel.rawUnit,
      displayUnit: channel.displayUnit,
      status: channel.status === 'connection-error' ? 'error' : channel.status === 'no-data' ? 'stale' : channel.status,
      quality: channel.status === 'ok' || channel.status === 'warning' || channel.status === 'alarm' ? 'good' : 'bad',
      timestamp: channel.updatedAt,
      error: channel.error
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
      status: point.enabled ? 'ok' : 'disabled',
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

  private createRawValue(channel: ChannelConfig): number {
    if (channel.type === 'temperature') {
      return 20 + Math.random() * 10;
    }

    if (channel.type === 'level') {
      return 4 + Math.random() * 16;
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

  private getChannelStatus(channel: ChannelConfig, displayValue: number): Status {
    if (channel.type === 'temperature') {
      return getValueStatus(displayValue, this.config.thresholds.temperature);
    }

    if (channel.type === 'level') {
      return getValueStatus(displayValue, this.config.thresholds.level);
    }

    return 'ok';
  }

  private async publishSnapshot(): Promise<void> {
    const snapshot = await this.readAllChannels();
    this.listeners.forEach((listener) => listener(snapshot));
  }
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
