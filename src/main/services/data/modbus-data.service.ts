import ModbusRTU from 'modbus-serial';
import type { AppConfig, ChannelConfig } from '../../../shared/types/config.types';
import {
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
import type { EventLogService } from '../event-log/event-log.service';
import type { DataService, MonitoringSnapshotListener } from './data-service.types';
import { getRequiredRegisterCount, decodeRegisters } from './modbus-register-decoder';
import { getTechnicalErrorMessage, mapModbusError } from './modbus-error-mapper';

type ConnectionState = 'closed' | 'opening' | 'open' | 'error';

export class ModbusDataService implements DataService {
  private config: AppConfig;
  private readonly eventLogService?: EventLogService;
  private readonly listeners = new Set<MonitoringSnapshotListener>();
  private readonly lastLoggedAtByKey = new Map<string, number>();
  private client: ModbusRTU | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isReading = false;
  private connectionState: ConnectionState = 'closed';
  private lastSuccessfulReadAt: string | null = null;
  private lastError?: string;
  private lastSnapshot: MonitoringSnapshot | null = null;

  public constructor(config: AppConfig, eventLogService?: EventLogService) {
    this.config = config;
    this.eventLogService = eventLogService;
  }

  public async start(): Promise<void> {
    if (this.intervalId) {
      return;
    }

    await this.logEvent('info', 'real data service started', { port: this.config.connection.port });

    try {
      await this.ensureConnected();
    } catch (error) {
      this.lastError = mapModbusError(error, this.config.connection.port);
      await this.logEvent('error', 'serial port open failed', {
        error: this.lastError,
        technicalError: getTechnicalErrorMessage(error)
      });
    }

    await this.publishSnapshot();
    this.intervalId = setInterval(() => {
      void this.publishSnapshot();
    }, Math.max(250, this.config.app.pollingIntervalMs));
  }

  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.closeClient();
    await this.logEvent('info', 'real data service stopped');
  }

  public async restart(config: AppConfig): Promise<void> {
    await this.stop();
    this.config = config;
    this.lastSuccessfulReadAt = null;
    this.lastError = undefined;
    this.lastSnapshot = null;
    await this.start();
  }

  public async readAllChannels(): Promise<MonitoringSnapshot> {
    if (this.isReading) {
      return this.lastSnapshot ?? this.createConnectionErrorSnapshot('Чтение уже выполняется');
    }

    this.isReading = true;

    try {
      await this.ensureConnected();
      const updatedAt = new Date().toISOString();
      const channels = await Promise.all(
        this.config.channels.map((channel) => this.readChannel(channel, updatedAt))
      );
      const snapshot = this.createSnapshot(channels, updatedAt);
      const hasConnectionErrors = channels.some((channel) => channel.status === 'connection-error');

      if (!hasConnectionErrors) {
        this.lastSuccessfulReadAt = updatedAt;
        if (this.lastError) {
          await this.logEvent('info', 'connection restored');
        }
        this.lastError = undefined;
      }

      this.lastSnapshot = snapshot;
      return snapshot;
    } catch (error) {
      const message = mapModbusError(error, this.config.connection.port);
      this.lastError = message;
      await this.logEventThrottled('connection-error', 'error', 'connection lost', {
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });
      const snapshot = this.createConnectionErrorSnapshot(message);
      this.lastSnapshot = snapshot;
      return snapshot;
    } finally {
      this.isReading = false;
    }
  }

  public async readRegisters(request: ManualReadRequest): Promise<ManualReadResult> {
    try {
      await this.ensureConnected(request.deviceAddress);
      const registers = await this.readRegisterValues(
        request.modbusFunction,
        request.registerAddress,
        request.registerCount
      );
      const decodedValue = decodeRegisters(registers, request.dataType, request.byteOrder);
      await this.logEvent('info', 'manual register read completed', {
        request,
        registers,
        decodedValue
      });

      return {
        success: true,
        registers,
        decodedValue,
        message: 'Manual register read completed'
      };
    } catch (error) {
      const message = mapModbusError(error, this.config.connection.port);
      await this.logEvent('error', 'manual register read failed', {
        request,
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });

      return {
        success: false,
        message,
        error: getTechnicalErrorMessage(error)
      };
    } finally {
      this.client?.setID(this.config.device.modbusAddress);
    }
  }

  public async scanRegisters(request: RegisterScanRequest): Promise<RegisterScanResult> {
    const normalizedRequest = this.normalizeRegisterScanRequest(request);
    const startedAt = new Date().toISOString();
    const rows: RegisterScanRow[] = [];

    try {
      await this.ensureConnected(normalizedRequest.deviceAddress);

      for (const modbusFunction of normalizedRequest.modbusFunctions) {
        for (
          let registerAddress = normalizedRequest.startAddress;
          registerAddress <= normalizedRequest.endAddress;
          registerAddress += 1
        ) {
          try {
            const registers = await this.readRegisterValues(
              modbusFunction,
              registerAddress,
              normalizedRequest.registerCount
            );
            rows.push({
              modbusFunction,
              registerAddress,
              success: true,
              registers,
              decodedValue: decodeRegisters(
                registers,
                normalizedRequest.dataType,
                normalizedRequest.byteOrder
              ),
              message: 'Read successful'
            });
          } catch (error) {
            rows.push({
              modbusFunction,
              registerAddress,
              success: false,
              message: mapModbusError(error, this.config.connection.port),
              error: getTechnicalErrorMessage(error)
            });
          }
        }
      }

      await this.logEvent('info', 'register scan completed', {
        request: normalizedRequest,
        total: rows.length,
        successCount: rows.filter((row) => row.success).length
      });
    } catch (error) {
      rows.push({
        modbusFunction: normalizedRequest.modbusFunctions[0] ?? 3,
        registerAddress: normalizedRequest.startAddress,
        success: false,
        message: mapModbusError(error, this.config.connection.port),
        error: getTechnicalErrorMessage(error)
      });
      await this.logEvent('error', 'register scan failed', {
        request: normalizedRequest,
        error: mapModbusError(error, this.config.connection.port),
        technicalError: getTechnicalErrorMessage(error)
      });
    } finally {
      this.client?.setID(this.config.device.modbusAddress);
    }

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
    const firstChannel = this.config.channels[0];

    if (!firstChannel) {
      return {
        success: false,
        message: 'No channels configured for test read'
      };
    }

    try {
      await this.ensureConnected();
      const registers = await this.readRegisterValues(
        firstChannel.modbusFunction,
        firstChannel.registerAddress,
        firstChannel.registerCount
      );
      await this.logEvent('info', 'test connection success', {
        channelId: firstChannel.id,
        registers
      });

      return {
        success: true,
        message: 'Connection successful',
        details: {
          port: this.config.connection.port,
          baudRate: this.config.connection.baudRate,
          modbusAddress: this.config.device.modbusAddress,
          channelId: firstChannel.id,
          registers
        }
      };
    } catch (error) {
      const message = mapModbusError(error, this.config.connection.port);
      await this.logEvent('error', 'test connection failed', {
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });

      return {
        success: false,
        message,
        details: {
          port: this.config.connection.port,
          baudRate: this.config.connection.baudRate,
          modbusAddress: this.config.device.modbusAddress
        }
      };
    }
  }

  public getStatus(): DataServiceStatus {
    return {
      mode: this.config.app.mode,
      connectionStatus: this.connectionState === 'open' && !this.lastError ? 'ok' : 'connection-error',
      lastSuccessfulReadAt: this.lastSuccessfulReadAt,
      lastError: this.lastError ?? `serial connection: ${this.connectionState}`
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

  private async ensureConnected(deviceAddress = this.config.device.modbusAddress): Promise<void> {
    if (this.client?.isOpen) {
      this.client.setID(deviceAddress);
      return;
    }

    if (this.connectionState === 'opening') {
      return;
    }

    this.connectionState = 'opening';
    const client = new ModbusRTU();
    client.setTimeout(this.config.connection.timeoutMs);

    try {
      await client.connectRTUBuffered(this.config.connection.port, {
        baudRate: this.config.connection.baudRate,
        dataBits: this.config.connection.dataBits,
        stopBits: this.config.connection.stopBits,
        parity: this.config.connection.parity
      });
      client.setID(deviceAddress);
      client.setTimeout(this.config.connection.timeoutMs);
      client.on('error', (error) => {
        this.lastError = mapModbusError(error, this.config.connection.port);
        this.connectionState = 'error';
        void this.logEventThrottled('client-error', 'error', 'serial client error', {
          error: this.lastError,
          technicalError: getTechnicalErrorMessage(error)
        });
      });
      client.on('close', () => {
        this.connectionState = 'closed';
        void this.logEvent('warning', 'serial port closed');
      });
      this.client = client;
      this.connectionState = 'open';
      await this.logEvent('info', 'serial port opened', {
        port: this.config.connection.port,
        baudRate: this.config.connection.baudRate
      });
    } catch (error) {
      this.connectionState = 'error';
      this.client = null;
      throw error;
    }
  }

  private normalizeRegisterScanRequest(request: RegisterScanRequest): RegisterScanRequest {
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

  private async closeClient(): Promise<void> {
    const client = this.client;
    this.client = null;

    if (!client) {
      this.connectionState = 'closed';
      return;
    }

    if (!client.isOpen) {
      this.connectionState = 'closed';
      return;
    }

    await new Promise<void>((resolve) => {
      client.close(() => resolve());
    });
    this.connectionState = 'closed';
    await this.logEvent('info', 'serial port closed', { port: this.config.connection.port });
  }

  private async readChannel(channel: ChannelConfig, updatedAt: string): Promise<ChannelReading> {
    const attempts = this.config.connection.retries + 1;
    let lastError: unknown = null;

    if (channel.dataType === 'float32' && channel.registerCount !== 2) {
      return this.createChannelErrorReading(channel, updatedAt, 'Некорректная конфигурация float32');
    }

    if (channel.registerCount < getRequiredRegisterCount(channel.dataType)) {
      return this.createChannelErrorReading(channel, updatedAt, 'Недостаточное количество регистров');
    }

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const registers = await this.readRegisterValues(
          channel.modbusFunction,
          channel.registerAddress,
          channel.registerCount
        );
        const rawValue = decodeRegisters(registers, channel.dataType, channel.byteOrder);
        const displayValue = Number(applyScaling(rawValue, channel.scaling).toFixed(channel.decimals));

        return {
          channelId: channel.id,
          rawValue: Number(rawValue.toFixed(6)),
          displayValue,
          rawUnit: channel.rawUnit,
          displayUnit: channel.displayUnit,
          status: this.getChannelStatus(channel, displayValue),
          updatedAt
        };
      } catch (error) {
        lastError = error;
      }
    }

    const message = mapModbusError(lastError, this.config.connection.port);
    await this.logEventThrottled(`channel-${channel.id}-${message}`, 'error', 'channel read error', {
      channelId: channel.id,
      error: message,
      technicalError: getTechnicalErrorMessage(lastError)
    });
    return this.createChannelErrorReading(channel, updatedAt, message);
  }

  private async readRegisterValues(
    modbusFunction: 3 | 4,
    registerAddress: number,
    registerCount: number
  ): Promise<number[]> {
    if (!this.client?.isOpen) {
      throw new Error('Serial connection is not open');
    }

    const result =
      modbusFunction === 3
        ? await this.client.readHoldingRegisters(registerAddress, registerCount)
        : await this.client.readInputRegisters(registerAddress, registerCount);

    return result.data;
  }

  private createSnapshot(channels: ChannelReading[], updatedAt: string): MonitoringSnapshot {
    const readingsByChannelId = new Map(channels.map((channel) => [channel.channelId, channel]));
    const barrels = this.config.barrels.map((barrel): BarrelReading => {
      const temperature = readingsByChannelId.get(barrel.temperatureChannelId) ?? null;
      const level = readingsByChannelId.get(barrel.levelChannelId) ?? null;
      const status = getWorstStatus([
        temperature?.status ?? 'no-data',
        level?.status ?? 'no-data'
      ]);

      return {
        barrelId: barrel.id,
        temperature,
        level,
        status,
        updatedAt
      };
    });
    const status = getWorstStatus([...barrels.map((barrel) => barrel.status), ...channels.map((channel) => channel.status)]);

    return {
      status,
      mode: this.config.app.mode,
      updatedAt,
      channels,
      barrels,
      activeWarningsCount: barrels.filter((barrel) => barrel.status === 'warning').length,
      activeAlarmsCount: barrels.filter((barrel) => barrel.status === 'alarm').length
    };
  }

  private createConnectionErrorSnapshot(message: string): MonitoringSnapshot {
    const updatedAt = new Date().toISOString();
    const channels = this.config.channels.map((channel) =>
      this.createChannelErrorReading(channel, updatedAt, message)
    );
    const snapshot = this.createSnapshot(channels, updatedAt);

    return {
      ...snapshot,
      status: 'connection-error'
    };
  }

  private createChannelErrorReading(
    channel: ChannelConfig,
    updatedAt: string,
    message: string
  ): ChannelReading {
    return {
      channelId: channel.id,
      rawValue: 0,
      displayValue: 0,
      rawUnit: channel.rawUnit,
      displayUnit: channel.displayUnit,
      status: 'connection-error',
      updatedAt,
      error: message
    };
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

  private async logEvent(
    level: 'info' | 'warning' | 'error',
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    if (!this.eventLogService) {
      return;
    }

    await this.eventLogService.addEvent({
      level,
      source: 'modbus',
      message,
      details
    });
  }

  private async logEventThrottled(
    key: string,
    level: 'info' | 'warning' | 'error',
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const now = Date.now();
    const lastLoggedAt = this.lastLoggedAtByKey.get(key) ?? 0;

    if (now - lastLoggedAt < 30_000) {
      return;
    }

    this.lastLoggedAtByKey.set(key, now);
    await this.logEvent(level, message, details);
  }
}
