import ModbusRTU from 'modbus-serial';
import type { AppConfig, ChannelConfig, DeviceConfig } from '../../../shared/types/config.types';
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
  private readonly clients = new Map<string, ModbusRTU>();
  private readonly connectionStates = new Map<string, ConnectionState>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isReading = false;
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

    await this.logEvent('info', 'real data service started', {
      devices: this.config.devices.map((device) => ({
        id: device.id,
        port: device.connection.port,
        baudRate: device.connection.baudRate
      }))
    });

    try {
      const device = this.getDefaultDevice();
      if (device) {
        await this.ensureConnected(device);
      }
    } catch (error) {
      const device = this.getDefaultDevice();
      this.lastError = mapModbusError(error, device?.connection.port ?? '');
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
    this.connectionStates.clear();
    await this.start();
  }

  public async readAllChannels(): Promise<MonitoringSnapshot> {
    if (this.isReading) {
      return this.lastSnapshot ?? this.createConnectionErrorSnapshot('Чтение уже выполняется');
    }

    this.isReading = true;

    try {
      const updatedAt = new Date().toISOString();
      const readingsByChannelId = new Map<string, ChannelReading>();
      for (const channelGroup of this.groupChannelsByDevice()) {
        for (const channel of channelGroup) {
          readingsByChannelId.set(channel.id, await this.readChannel(channel, updatedAt));
        }
      }
      const channels = this.config.channels
        .map((channel) => readingsByChannelId.get(channel.id))
        .filter((channel): channel is ChannelReading => Boolean(channel));
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
      const message = mapModbusError(error, this.getDefaultDevice()?.connection.port ?? '');
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
      const device = this.getDeviceById(request.deviceId);
      const client = await this.ensureConnected(device);
      const registers = await this.readRegisterValues(
        client,
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
      const device = this.getDeviceByIdOrNull(request.deviceId);
      const message = mapModbusError(error, device?.connection.port ?? '');
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
      // Keep persistent clients open for polling.
    }
  }

  public async scanRegisters(request: RegisterScanRequest): Promise<RegisterScanResult> {
    const normalizedRequest = this.normalizeRegisterScanRequest(request);
    const startedAt = new Date().toISOString();
    const rows: RegisterScanRow[] = [];

    try {
      const device = this.getDeviceById(normalizedRequest.deviceId);
      const client = await this.ensureConnected(device);

      for (const modbusFunction of normalizedRequest.modbusFunctions) {
        for (
          let registerAddress = normalizedRequest.startAddress;
          registerAddress <= normalizedRequest.endAddress;
          registerAddress += 1
        ) {
          try {
            const registers = await this.readRegisterValues(
              client,
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
              message: mapModbusError(error, device.connection.port),
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
        message: mapModbusError(error, this.getDeviceByIdOrNull(normalizedRequest.deviceId)?.connection.port ?? ''),
        error: getTechnicalErrorMessage(error)
      });
      await this.logEvent('error', 'register scan failed', {
        request: normalizedRequest,
        error: mapModbusError(error, this.getDeviceByIdOrNull(normalizedRequest.deviceId)?.connection.port ?? ''),
        technicalError: getTechnicalErrorMessage(error)
      });
    } finally {
      // Keep persistent clients open for polling.
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
    const device = this.getDefaultDevice();
    const firstChannel = device
      ? this.config.channels.find((channel) => channel.deviceId === device.id)
      : null;

    if (!device || !firstChannel) {
      return {
        success: false,
        message: 'No active device with configured channels for test read'
      };
    }

    try {
      const client = await this.ensureConnected(device);
      const registers = await this.readRegisterValues(
        client,
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
          port: device.connection.port,
          baudRate: device.connection.baudRate,
          modbusAddress: device.modbusAddress,
          deviceId: device.id,
          channelId: firstChannel.id,
          registers
        }
      };
    } catch (error) {
      const message = mapModbusError(error, device.connection.port);
      await this.logEvent('error', 'test connection failed', {
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });

      return {
        success: false,
        message,
        details: {
          port: device.connection.port,
          baudRate: device.connection.baudRate,
          modbusAddress: device.modbusAddress,
          deviceId: device.id
        }
      };
    }
  }

  public getStatus(): DataServiceStatus {
    const hasError = [...this.connectionStates.values()].some((state) => state === 'error');
    return {
      mode: this.config.app.mode,
      connectionStatus: !hasError && !this.lastError ? 'ok' : 'connection-error',
      lastSuccessfulReadAt: this.lastSuccessfulReadAt,
      lastError: this.lastError
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

  private async ensureConnected(device: DeviceConfig): Promise<ModbusRTU> {
    const existingClient = this.clients.get(device.id);
    if (existingClient?.isOpen) {
      existingClient.setID(device.modbusAddress);
      return existingClient;
    }

    if (this.connectionStates.get(device.id) === 'opening') {
      throw new Error(`Serial connection is opening for ${device.id}`);
    }

    this.connectionStates.set(device.id, 'opening');
    await this.closeClientsSharingPort(device);
    const client = new ModbusRTU();
    client.setTimeout(device.connection.timeoutMs);

    try {
      await client.connectRTUBuffered(device.connection.port, {
        baudRate: device.connection.baudRate,
        dataBits: device.connection.dataBits,
        stopBits: device.connection.stopBits,
        parity: device.connection.parity
      });
      client.setID(device.modbusAddress);
      client.setTimeout(device.connection.timeoutMs);
      client.on('error', (error) => {
        this.lastError = mapModbusError(error, device.connection.port);
        this.connectionStates.set(device.id, 'error');
        void this.logEventThrottled(`client-error-${device.id}`, 'error', 'serial client error', {
          deviceId: device.id,
          error: this.lastError,
          technicalError: getTechnicalErrorMessage(error)
        });
      });
      client.on('close', () => {
        this.connectionStates.set(device.id, 'closed');
        void this.logEvent('warning', 'serial port closed', { deviceId: device.id });
      });
      this.clients.set(device.id, client);
      this.connectionStates.set(device.id, 'open');
      await this.logEvent('info', 'serial port opened', {
        deviceId: device.id,
        port: device.connection.port,
        baudRate: device.connection.baudRate
      });
      return client;
    } catch (error) {
      this.connectionStates.set(device.id, 'error');
      this.clients.delete(device.id);
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
    for (const [deviceId, client] of this.clients) {
      if (client.isOpen) {
        await new Promise<void>((resolve) => {
          client.close(() => resolve());
        });
      }
      this.connectionStates.set(deviceId, 'closed');
    }
    this.clients.clear();
    await this.logEvent('info', 'serial ports closed');
  }

  private async closeClientsSharingPort(device: DeviceConfig): Promise<void> {
    for (const [deviceId, client] of this.clients) {
      if (deviceId === device.id) {
        continue;
      }

      const otherDevice = this.getDeviceByIdOrNull(deviceId);
      if (otherDevice?.connection.port !== device.connection.port) {
        continue;
      }

      if (client.isOpen) {
        await new Promise<void>((resolve) => {
          client.close(() => resolve());
        });
      }
      this.clients.delete(deviceId);
      this.connectionStates.set(deviceId, 'closed');
      await this.logEvent('info', 'serial port released before device switch', {
        previousDeviceId: deviceId,
        nextDeviceId: device.id,
        port: device.connection.port
      });
    }
  }

  private async readChannel(channel: ChannelConfig, updatedAt: string): Promise<ChannelReading> {
    const device = this.getDeviceByIdOrNull(channel.deviceId);
    if (!device) {
      return this.createChannelErrorReading(channel, updatedAt, `Устройство ${channel.deviceId} не найдено`);
    }

    if (!device.active) {
      return this.createChannelErrorReading(channel, updatedAt, `Устройство ${device.name} неактивно`);
    }

    const attempts = device.connection.retries + 1;
    let lastError: unknown = null;

    if (channel.dataType === 'float32' && channel.registerCount !== 2) {
      return this.createChannelErrorReading(channel, updatedAt, 'Некорректная конфигурация float32');
    }

    if (channel.registerCount < getRequiredRegisterCount(channel.dataType)) {
      return this.createChannelErrorReading(channel, updatedAt, 'Недостаточное количество регистров');
    }

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const client = await this.ensureConnected(device);
        const registers = await this.readRegisterValues(
          client,
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

    const message = mapModbusError(lastError, device.connection.port);
    await this.logEventThrottled(`channel-${channel.id}-${message}`, 'error', 'channel read error', {
      channelId: channel.id,
      error: message,
      technicalError: getTechnicalErrorMessage(lastError)
    });
    return this.createChannelErrorReading(channel, updatedAt, message);
  }

  private async readRegisterValues(
    client: ModbusRTU,
    modbusFunction: 3 | 4,
    registerAddress: number,
    registerCount: number
  ): Promise<number[]> {
    if (!client.isOpen) {
      throw new Error('Serial connection is not open');
    }

    const result =
      modbusFunction === 3
        ? await client.readHoldingRegisters(registerAddress, registerCount)
        : await client.readInputRegisters(registerAddress, registerCount);

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

  private getDefaultDevice(): DeviceConfig | null {
    return this.config.devices.find((device) => device.active) ?? this.config.devices[0] ?? null;
  }

  private getDeviceById(deviceId: string): DeviceConfig {
    const device = this.getDeviceByIdOrNull(deviceId);

    if (!device) {
      throw new Error(`Device '${deviceId}' not found`);
    }

    return device;
  }

  private getDeviceByIdOrNull(deviceId: string): DeviceConfig | null {
    return this.config.devices.find((device) => device.id === deviceId) ?? null;
  }

  private groupChannelsByDevice(): ChannelConfig[][] {
    const groups = new Map<string, ChannelConfig[]>();

    this.config.channels.forEach((channel) => {
      const group = groups.get(channel.deviceId) ?? [];
      group.push(channel);
      groups.set(channel.deviceId, group);
    });

    return [
      ...this.config.devices
        .map((device) => groups.get(device.id))
        .filter((group): group is ChannelConfig[] => Boolean(group)),
      ...[...groups].filter(([deviceId]) => !this.getDeviceByIdOrNull(deviceId)).map(([, channels]) => channels)
    ];
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
