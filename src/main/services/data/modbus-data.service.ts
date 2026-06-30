import ModbusRTU from 'modbus-serial';
import type {
  AppConfig,
  DataSource,
  ModbusDataAddress,
  ModbusNumericValueType,
  Point,
  PointStatus,
  ControlPoint
} from '../../../shared/types/config.types';
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
  TestConnectionResult,
  WriteControlPointResult
} from '../../../shared/types/monitoring.types';
import { applyScaling } from '../../../shared/lib/scaling';
import { getWorstStatus } from '../../../shared/lib/thresholds';
import type { EventLogService } from '../event-log/event-log.service';
import type { DataService, MonitoringSnapshotListener } from './data-service.types';
import { getRequiredRegisterCount, decodeRegisters } from './modbus-register-decoder';
import { getTechnicalErrorMessage, mapModbusError } from './modbus-error-mapper';

type ConnectionState = 'closed' | 'opening' | 'open' | 'error';
type ModbusRtuDataSource = DataSource & { connection: Extract<DataSource['connection'], { type: 'modbus-rtu' }> };

export class ModbusDataService implements DataService {
  private config: AppConfig;
  private readonly eventLogService?: EventLogService;
  private readonly listeners = new Set<MonitoringSnapshotListener>();
  private readonly lastLoggedAtByKey = new Map<string, number>();
  private readonly clients = new Map<string, ModbusRTU>();
  private readonly connectionStates = new Map<string, ConnectionState>();
  private readonly writeLocks = new Map<string, Promise<void>>();
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
      dataSources: this.getModbusSources().map((source) => ({
        id: source.id,
        port: source.connection.port,
        baudRate: source.connection.baudRate
      }))
    });

    try {
      const source = this.getDefaultDataSource();
      if (source) {
        await this.ensureConnected(source);
      }
    } catch (error) {
      const source = this.getDefaultDataSource();
      this.lastError = mapModbusError(error, source?.connection.port ?? '');
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

  public async readAllPoints(): Promise<MonitoringSnapshot> {
    if (this.isReading) {
      return this.lastSnapshot ?? this.createConnectionErrorSnapshot('Чтение уже выполняется');
    }

    this.isReading = true;

    try {
      const updatedAt = new Date().toISOString();
      const readingsByPointId = new Map<string, Reading>();
      for (const pointGroup of this.groupPointsByDataSource()) {
        for (const point of pointGroup) {
          readingsByPointId.set(point.id, await this.readPoint(point, updatedAt));
        }
      }

      const readings = this.config.points
        .map((point) => readingsByPointId.get(point.id))
        .filter((reading): reading is Reading => Boolean(reading));
      const snapshot = this.createSnapshot(readings, updatedAt);
      const hasConnectionErrors = readings.some((reading) => reading.status === 'error');

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
      const message = mapModbusError(error, this.getDefaultDataSource()?.connection.port ?? '');
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
      const source = this.getDataSourceById(request.dataSourceId);
      const client = await this.ensureConnected(source);
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
      const source = this.getDataSourceByIdOrNull(request.dataSourceId);
      const message = mapModbusError(error, source?.connection.port ?? '');
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
    }
  }

  public async writeControlPoint(pointId: string, value: boolean | number | string): Promise<WriteControlPointResult> {
    const point = this.config.points.find((item): item is ControlPoint => item.id === pointId && item.kind === 'control');
    if (!point) {
      return {
        success: false,
        pointId,
        value,
        message: `ControlPoint '${pointId}' not found`,
        error: `ControlPoint '${pointId}' not found`
      };
    }

    try {
      if (!point.dataSourceId) {
        throw new Error(`ControlPoint '${point.id}' has no dataSourceId`);
      }

      const address = point.writeAddress;
      if (address.protocol !== 'modbus') {
        throw new Error(`ControlPoint '${point.id}' writeAddress protocol '${address.protocol}' is not supported`);
      }

      const source = this.getDataSourceById(point.dataSourceId);
      if (!source.enabled) {
        throw new Error(`DataSource '${source.id}' is disabled`);
      }

      await this.waitUntilIdle();
      const client = await this.ensureConnected(source);
      const slaveId = getSlaveId(source, address);
      client.setID(slaveId);

      if (isSingleCoilWriteAddress(address)) {
        await client.writeCoil(address.coilAddress, Boolean(value));
        await this.logEvent('warning', 'control point coil write completed', {
          pointId: point.id,
          dataSourceId: source.id,
          slaveId,
          coilAddress: address.coilAddress,
          value: Boolean(value)
        });

        return {
          success: true,
          pointId: point.id,
          dataSourceId: source.id,
          value: Boolean(value),
          message: 'Modbus coil write completed',
          details: {
            slaveId,
            coilAddress: address.coilAddress,
            functionCode: address.functionCode
          }
        };
      }

      if (!isRegisterMaskWriteAddress(address)) {
        throw new Error('Only Modbus single coil writes (function 5) and register mask writes (function 16) are supported');
      }

      const lockKey = `${source.id}:${slaveId}:${address.registerAddress}`;
      const maskResult = await this.runSerializedWrite(lockKey, async () => {
        client.setID(slaveId);
        const [previousMask = 0] = await this.readRegisterValues(client, 3, address.registerAddress, 1);
        const bitMask = 1 << address.bitIndex;
        const nextMask = Boolean(value)
          ? (previousMask | bitMask)
          : (previousMask & ~bitMask);

        await client.writeRegisters(address.registerAddress, [nextMask]);
        return {
          previousMask,
          nextMask,
          bitIndex: address.bitIndex,
          outputNumber: address.bitIndex + 1
        };
      });

      await this.logEvent('warning', 'control point register mask write completed', {
        pointId: point.id,
        dataSourceId: source.id,
        slaveId,
        registerAddress: address.registerAddress,
        value: Boolean(value),
        ...maskResult
      });

      return {
        success: true,
        pointId: point.id,
        dataSourceId: source.id,
        value: Boolean(value),
        message: 'Modbus register mask write completed',
        details: {
          slaveId,
          registerAddress: address.registerAddress,
          functionCode: address.functionCode,
          ...maskResult
        }
      };
    } catch (error) {
      const source = point.dataSourceId ? this.getDataSourceByIdOrNull(point.dataSourceId) : null;
      const message = mapModbusError(error, source?.connection.port ?? '');
      await this.logEvent('error', 'control point write failed', {
        pointId: point.id,
        dataSourceId: point.dataSourceId,
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });

      return {
        success: false,
        pointId: point.id,
        dataSourceId: point.dataSourceId,
        value,
        message,
        error: getTechnicalErrorMessage(error)
      };
    }
  }

  public async scanRegisters(request: RegisterScanRequest): Promise<RegisterScanResult> {
    await this.waitUntilIdle();
    this.isReading = true;

    const normalizedRequest = this.normalizeRegisterScanRequest(request);
    const startedAt = new Date().toISOString();
    const rows: RegisterScanRow[] = [];

    try {
      const source = this.getDataSourceById(normalizedRequest.dataSourceId);
      const client = await this.ensureConnected(source);

      for (const modbusFunction of normalizedRequest.modbusFunctions) {
        for (
          let registerAddress = normalizedRequest.startAddress;
          registerAddress <= normalizedRequest.endAddress;
          registerAddress += 1
        ) {
          const readResult = await this.scanRegisterWithRetries(
            client,
            source,
            modbusFunction,
            registerAddress,
            normalizedRequest
          );

          if (readResult.success) {
            try {
              rows.push({
                modbusFunction,
                registerAddress,
                success: true,
                attempts: readResult.attempts,
                registers: readResult.registers,
                decodedValue: decodeRegisters(
                  readResult.registers,
                  normalizedRequest.dataType,
                  normalizedRequest.byteOrder
                ),
                message: readResult.attempts === 1 ? 'Чтение успешно' : `Чтение успешно с ${readResult.attempts}-й попытки`
              });
            } catch (error) {
              rows.push({
                modbusFunction,
                registerAddress,
                success: false,
                attempts: readResult.attempts,
                registers: readResult.registers,
                message: 'Регистр прочитан, но значение не удалось расшифровать',
                error: getTechnicalErrorMessage(error)
              });
            }
          } else {
            rows.push({
              modbusFunction,
              registerAddress,
              success: false,
              attempts: readResult.attempts,
              message: mapModbusError(readResult.error, source.connection.port),
              error: getTechnicalErrorMessage(readResult.error)
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
        message: mapModbusError(error, this.getDataSourceByIdOrNull(normalizedRequest.dataSourceId)?.connection.port ?? ''),
        error: getTechnicalErrorMessage(error)
      });
      await this.logEvent('error', 'register scan failed', {
        request: normalizedRequest,
        error: mapModbusError(error, this.getDataSourceByIdOrNull(normalizedRequest.dataSourceId)?.connection.port ?? ''),
        technicalError: getTechnicalErrorMessage(error)
      });
    } finally {
      this.isReading = false;
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

  public async testConnection(dataSourceId?: string): Promise<TestConnectionResult> {
    const source = dataSourceId ? this.getDataSourceByIdOrNull(dataSourceId) : this.getDefaultDataSource();
    const firstPoint = source
      ? this.config.points.find((point): point is Point & { address: ModbusDataAddress } => point.dataSourceId === source.id && isReadableModbusPoint(point))
      : null;

    if (!source) {
      return {
        success: false,
        message: 'No active Modbus RTU data source for connection test'
      };
    }

    try {
      const client = await this.ensureConnected(source);
      if (!firstPoint) {
        await this.logEvent('info', 'test connection opened without points', {
          dataSourceId: source.id,
          port: source.connection.port
        });

        return {
          success: true,
          message: 'Connection opened; no points configured for read test',
          details: {
            port: source.connection.port,
            baudRate: source.connection.baudRate,
            slaveId: getSlaveId(source),
            dataSourceId: source.id,
            readTest: false
          }
        };
      }

      const registers = await this.readRegisterValues(
        client,
        firstPoint.address.functionCode === 3 ? 3 : 4,
        firstPoint.address.registerAddress ?? 0,
        firstPoint.address.registerCount ?? getRequiredRegisterCount(getModbusDataType(firstPoint))
      );
      await this.logEvent('info', 'test connection success', {
        pointId: firstPoint.id,
        registers
      });

      return {
        success: true,
        message: 'Connection successful',
        details: {
          port: source.connection.port,
          baudRate: source.connection.baudRate,
          slaveId: getSlaveId(source, firstPoint.address),
          dataSourceId: source.id,
          pointId: firstPoint.id,
          registers
        }
      };
    } catch (error) {
      const message = mapModbusError(error, source.connection.port);
      await this.logEvent('error', 'test connection failed', {
        error: message,
        technicalError: getTechnicalErrorMessage(error)
      });

      return {
        success: false,
        message,
        details: {
          port: source.connection.port,
          baudRate: source.connection.baudRate,
          slaveId: firstPoint ? getSlaveId(source, firstPoint.address) : getSlaveId(source),
          dataSourceId: source.id
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

  private async ensureConnected(source: ModbusRtuDataSource): Promise<ModbusRTU> {
    const existingClient = this.clients.get(source.id);
    if (existingClient?.isOpen) {
      return existingClient;
    }

    if (this.connectionStates.get(source.id) === 'opening') {
      throw new Error(`Serial connection is opening for ${source.id}`);
    }

    this.connectionStates.set(source.id, 'opening');
    await this.closeClientsSharingPort(source);
    const client = new ModbusRTU();
    client.setTimeout(source.timeoutMs ?? 1000);

    try {
      await client.connectRTUBuffered(source.connection.port, {
        baudRate: source.connection.baudRate,
        dataBits: source.connection.dataBits,
        stopBits: source.connection.stopBits,
        parity: source.connection.parity
      });
      client.setTimeout(source.timeoutMs ?? 1000);
      client.on('error', (error) => {
        this.lastError = mapModbusError(error, source.connection.port);
        this.connectionStates.set(source.id, 'error');
        void this.logEventThrottled(`client-error-${source.id}`, 'error', 'serial client error', {
          dataSourceId: source.id,
          error: this.lastError,
          technicalError: getTechnicalErrorMessage(error)
        });
      });
      client.on('close', () => {
        this.connectionStates.set(source.id, 'closed');
        void this.logEvent('warning', 'serial port closed', { dataSourceId: source.id });
      });
      this.clients.set(source.id, client);
      this.connectionStates.set(source.id, 'open');
      await this.logEvent('info', 'serial port opened', {
        dataSourceId: source.id,
        port: source.connection.port,
        baudRate: source.connection.baudRate
      });
      return client;
    } catch (error) {
      this.connectionStates.set(source.id, 'error');
      this.clients.delete(source.id);
      throw error;
    }
  }

  private normalizeRegisterScanRequest(request: RegisterScanRequest): RegisterScanRequest {
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

  private async scanRegisterWithRetries(
    client: ModbusRTU,
    source: ModbusRtuDataSource,
    modbusFunction: 3 | 4,
    registerAddress: number,
    request: RegisterScanRequest
  ): Promise<{ success: true; attempts: number; registers: number[] } | { success: false; attempts: number; error: unknown }> {
    let lastError: unknown = new Error('Register scan did not run');
    const attemptsPerRegister = request.attemptsPerRegister ?? 1;
    const retryDelayMs = request.retryDelayMs ?? 0;

    for (let attempt = 1; attempt <= attemptsPerRegister; attempt += 1) {
      try {
        client.setID(getSlaveId(source));
        const registers = await this.readRegisterValues(
          client,
          modbusFunction,
          registerAddress,
          request.registerCount
        );
        return { success: true, attempts: attempt, registers };
      } catch (error) {
        lastError = error;
        if (attempt < attemptsPerRegister && retryDelayMs > 0) {
          await sleep(retryDelayMs);
        }
      }
    }

    return { success: false, attempts: attemptsPerRegister, error: lastError };
  }

  private async waitUntilIdle(): Promise<void> {
    const startedAt = Date.now();
    while (this.isReading && Date.now() - startedAt < 5000) {
      await sleep(50);
    }

    if (this.isReading) {
      throw new Error('Modbus read is already running');
    }
  }

  private async closeClient(): Promise<void> {
    for (const [dataSourceId, client] of this.clients) {
      if (client.isOpen) {
        await new Promise<void>((resolve) => {
          client.close(() => resolve());
        });
      }
      this.connectionStates.set(dataSourceId, 'closed');
    }
    this.clients.clear();
    await this.logEvent('info', 'serial ports closed');
  }

  private async closeClientsSharingPort(source: ModbusRtuDataSource): Promise<void> {
    for (const [dataSourceId, client] of this.clients) {
      if (dataSourceId === source.id) {
        continue;
      }

      const otherSource = this.getDataSourceByIdOrNull(dataSourceId);
      if (otherSource?.connection.port !== source.connection.port) {
        continue;
      }

      if (client.isOpen) {
        await new Promise<void>((resolve) => {
          client.close(() => resolve());
        });
      }
      this.clients.delete(dataSourceId);
      this.connectionStates.set(dataSourceId, 'closed');
      await this.logEvent('info', 'serial port released before data source switch', {
        previousDataSourceId: dataSourceId,
        nextDataSourceId: source.id,
        port: source.connection.port
      });
    }
  }

  private async readPoint(point: Point, updatedAt: string): Promise<Reading> {
    if (!isReadableModbusPoint(point)) {
      return this.createPointErrorReading(point, updatedAt, 'Точка не является читаемой Modbus telemetry point');
    }

    const source = point.dataSourceId ? this.getDataSourceByIdOrNull(point.dataSourceId) : null;
    if (!source) {
      return this.createPointErrorReading(point, updatedAt, `Источник данных ${point.dataSourceId ?? ''} не найден`);
    }

    if (!source.enabled) {
      return this.createPointErrorReading(point, updatedAt, `Источник данных ${source.name} отключен`, 'disabled');
    }

    const dataType = getModbusDataType(point);
    const registerCount = point.address.registerCount ?? getRequiredRegisterCount(dataType);
    const attempts = (source.retryCount ?? 1) + 1;
    let lastError: unknown = null;

    if (registerCount < getRequiredRegisterCount(dataType)) {
      return this.createPointErrorReading(point, updatedAt, 'Недостаточное количество регистров');
    }

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const client = await this.ensureConnected(source);
        client.setID(getSlaveId(source, point.address));
        const registers = await this.readRegisterValues(
          client,
          point.address.functionCode === 3 ? 3 : 4,
          point.address.registerAddress ?? 0,
          registerCount
        );
        const rawValue = decodeRegisters(registers, dataType, point.address.byteOrder ?? 'ABCD');
        const scaledValue = point.scaling ? applyScaling(rawValue, point.scaling) : rawValue;
        const displayValue = Number(scaledValue.toFixed(getPointDecimals(point, dataType)));
        const status = getPointStatus(point, displayValue);

        return {
          pointId: point.id,
          assetId: point.assetId,
          rawValue: Number(rawValue.toFixed(6)),
          displayValue,
          rawUnit: point.rawUnit,
          displayUnit: point.displayUnit,
          status,
          quality: status === 'ok' || status === 'warning' || status === 'alarm' ? 'good' : 'bad',
          timestamp: updatedAt
        };
      } catch (error) {
        lastError = error;
      }
    }

    const message = mapModbusError(lastError, source.connection.port);
    await this.logEventThrottled(`point-${point.id}-${message}`, 'error', 'point read error', {
      pointId: point.id,
      error: message,
      technicalError: getTechnicalErrorMessage(lastError)
    });
    return this.createPointErrorReading(point, updatedAt, message);
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

  private async runSerializedWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.writeLocks.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => current);
    this.writeLocks.set(key, queued);

    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (this.writeLocks.get(key) === queued) {
        this.writeLocks.delete(key);
      }
    }
  }

  private createSnapshot(readings: Reading[], updatedAt: string): MonitoringSnapshot {
    const status = getWorstStatus(readings.map((reading) => pointStatusToStatus(reading.status)));

    return {
      status,
      mode: this.config.app.mode,
      updatedAt,
      live: this.createLiveSnapshot(readings, updatedAt),
      activeWarningsCount: readings.filter((reading) => reading.status === 'warning').length,
      activeAlarmsCount: readings.filter((reading) => reading.status === 'alarm').length
    };
  }

  private createConnectionErrorSnapshot(message: string): MonitoringSnapshot {
    const updatedAt = new Date().toISOString();
    const readings = this.config.points
      .filter((point) => point.kind === 'telemetry')
      .map((point) => this.createPointErrorReading(point, updatedAt, message));
    const snapshot = this.createSnapshot(readings, updatedAt);

    return {
      ...snapshot,
      status: 'connection-error'
    };
  }

  private createPointErrorReading(
    point: Point,
    updatedAt: string,
    message: string,
    status: PointStatus = 'error'
  ): Reading {
    return {
      pointId: point.id,
      assetId: point.assetId,
      rawValue: null,
      displayValue: null,
      rawUnit: point.rawUnit,
      displayUnit: point.displayUnit,
      status,
      quality: 'bad',
      timestamp: updatedAt,
      error: message
    };
  }

  private createLiveSnapshot(readings: Reading[], updatedAt: string): LiveSnapshot {
    const readingsByPointId = Object.fromEntries(readings.map((reading) => [reading.pointId, reading]));
    const dataSourceStatuses = Object.fromEntries(
      this.config.dataSources.map((source): [string, DataSourceStatus] => {
        const state = this.connectionStates.get(source.id);
        const status = source.enabled === false ? 'disabled' : state === 'error' ? 'error' : 'ok';
        return [
          source.id,
          {
            dataSourceId: source.id,
            status,
            message: state ? `serial connection: ${state}` : undefined,
            updatedAt
          }
        ];
      })
    );

    return {
      timestamp: updatedAt,
      readingsByPointId,
      dataSourceStatuses,
      errors: readings
        .filter((reading) => reading.error)
        .map((reading) => ({
          source: reading.pointId,
          message: reading.error ?? 'Modbus reading error',
          timestamp: updatedAt
        }))
    };
  }

  private getDefaultDataSource(): ModbusRtuDataSource | null {
    return this.getModbusSources().find((source) => source.enabled) ?? this.getModbusSources()[0] ?? null;
  }

  private getDataSourceById(dataSourceId: string): ModbusRtuDataSource {
    const source = this.getDataSourceByIdOrNull(dataSourceId);

    if (!source) {
      throw new Error(`DataSource '${dataSourceId}' not found`);
    }

    return source;
  }

  private getDataSourceByIdOrNull(dataSourceId: string): ModbusRtuDataSource | null {
    const source = this.config.dataSources.find((item) => item.id === dataSourceId);
    return source && source.type === 'modbus-rtu' && source.connection.type === 'modbus-rtu'
      ? source as ModbusRtuDataSource
      : null;
  }

  private getModbusSources(): ModbusRtuDataSource[] {
    return this.config.dataSources.filter(
      (source): source is ModbusRtuDataSource => source.type === 'modbus-rtu' && source.connection.type === 'modbus-rtu'
    );
  }

  private groupPointsByDataSource(): Point[][] {
    const groups = new Map<string, Point[]>();

    this.config.points.filter(isReadableModbusPoint).forEach((point) => {
      const dataSourceId = point.dataSourceId ?? '';
      const group = groups.get(dataSourceId) ?? [];
      group.push(point);
      groups.set(dataSourceId, group);
    });

    return [
      ...this.getModbusSources()
        .map((source) => groups.get(source.id))
        .filter((group): group is Point[] => Boolean(group)),
      ...[...groups].filter(([dataSourceId]) => !this.getDataSourceByIdOrNull(dataSourceId)).map(([, points]) => points)
    ];
  }

  private async publishSnapshot(): Promise<void> {
    const snapshot = await this.readAllPoints();
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

function isReadableModbusPoint(point: Point): point is Point & { address: ModbusDataAddress } {
  return (
    point.kind === 'telemetry' &&
    point.enabled &&
    point.address?.protocol === 'modbus' &&
    (point.address.functionCode === 3 || point.address.functionCode === 4) &&
    point.valueType !== 'boolean' &&
    point.valueType !== 'string'
  );
}

function isSingleCoilWriteAddress(address: ModbusDataAddress): address is ModbusDataAddress & { coilAddress: number } {
  return address.area === 'coil' && address.functionCode === 5 && address.coilAddress !== undefined;
}

function isRegisterMaskWriteAddress(address: ModbusDataAddress): address is ModbusDataAddress & { registerAddress: number; bitIndex: number } {
  return (
    address.area === 'holding-register' &&
    address.functionCode === 16 &&
    address.registerAddress !== undefined &&
    address.bitIndex !== undefined
  );
}

function getModbusDataType(point: Point & { address: ModbusDataAddress }): ModbusNumericValueType {
  const valueType = point.address.valueType === 'boolean' ? point.valueType : point.address.valueType;
  return valueType === 'boolean' || valueType === 'string' ? 'uint16' : valueType;
}

function getSlaveId(source: ModbusRtuDataSource, address?: ModbusDataAddress): number {
  if (typeof address?.slaveId === 'number') {
    return address.slaveId;
  }

  return typeof source.metadata?.slaveId === 'number' ? source.metadata.slaveId : 1;
}

function getPointDecimals(_point: Point, dataType: ModbusNumericValueType): number {
  return dataType === 'float32' ? 2 : 0;
}

function getPointStatus(point: Point, displayValue: number): PointStatus {
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

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
