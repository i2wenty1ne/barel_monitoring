import type { AppConfig, ChannelConfig } from '../../../shared/types/config.types';
import type {
  BarrelReading,
  ChannelReading,
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
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
          registers,
          decodedValue: success ? registers?.[0] : undefined,
          message: success ? 'Mock register found' : 'Mock timeout',
          error: success ? undefined : 'Mock scan: no response'
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

  public async testConnection(): Promise<TestConnectionResult> {
    return {
      success: true,
      message: 'Mock connection is active',
      details: {
        mode: this.config.app.mode,
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

  private createRawValue(channel: ChannelConfig): number {
    if (channel.type === 'temperature') {
      return 20 + Math.random() * 10;
    }

    if (channel.type === 'level') {
      return 4 + Math.random() * 16;
    }

    return Math.random() * 100;
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
  const modbusFunctions: Array<3 | 4> =
    request.modbusFunctions.length > 0 ? request.modbusFunctions : [3, 4];

  return {
    ...request,
    startAddress,
    endAddress,
    registerCount,
    modbusFunctions
  };
}
