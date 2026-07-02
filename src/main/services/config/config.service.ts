import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  AppConfig,
  Asset,
  DataSource,
  ModbusByteOrder,
  ModbusNumericValueType,
  ModbusRtuConnectionConfig,
  Point
} from '../../../shared/types/config.types';
import { defaultConfig } from '../../../shared/config/default-config';
import { appConfigSchema } from '../../../shared/validation/config.schema';
import { getConfigPath } from '../../utils/paths';
import { safeJsonParse, toPrettyJson } from '../../utils/safe-json';

export type ConfigServiceOptions = {
  configPath?: string;
  configDir?: string;
};

export type ConfigMigrationResult = {
  fromSchemaVersion: number | 'legacy';
  toSchemaVersion: 2;
  backupPath?: string;
  assets: number;
  dataSources: number;
  points: number;
};

export type ConfigLoadResult = {
  config: AppConfig;
  validationError?: string;
  migration?: ConfigMigrationResult;
};

type NormalizeResult = {
  config: unknown;
  migrated: boolean;
  fromSchemaVersion: number | 'legacy';
};

type LegacyConnectionConfig = ModbusRtuConnectionConfig & {
  timeoutMs: number;
  retries: number;
};

type LegacyDeviceConfig = {
  id: string;
  name: string;
  model: string;
  protocol: 'modbus-rtu';
  modbusAddress: number;
  active: boolean;
  connection: LegacyConnectionConfig;
};

type LegacyChannelConfig = {
  id: string;
  name: string;
  type: 'temperature' | 'level' | 'custom';
  deviceId: string;
  moduleInputNumber: number;
  registerAddress: number;
  modbusFunction: 3 | 4;
  dataType: ModbusNumericValueType;
  registerCount: number;
  byteOrder: ModbusByteOrder;
  rawUnit: string;
  displayUnit: string;
  decimals: number;
  scaling: Point['scaling'];
};

type LegacyBarrelConfig = {
  id: string;
  name: string;
  active: boolean;
  visible: boolean;
  temperatureChannelId: string;
  levelChannelId: string;
  displayOrder: number;
  cardSize: 'small' | 'medium' | 'large';
};

export class ConfigService {
  private readonly configPath: string;
  private currentConfig: AppConfig = defaultConfig;
  private lastValidationError?: string;
  private lastMigration?: ConfigMigrationResult;

  public constructor(options: ConfigServiceOptions = {}) {
    this.configPath = getConfigPath(options.configPath, options.configDir);
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public getLastValidationError(): string | undefined {
    return this.lastValidationError;
  }

  public getLastMigration(): ConfigMigrationResult | undefined {
    return this.lastMigration;
  }

  public async loadConfig(): Promise<ConfigLoadResult> {
    await mkdir(dirname(this.configPath), { recursive: true });
    this.lastMigration = undefined;

    try {
      const rawConfig = await readFile(this.configPath, 'utf8');
      const parsedJson = safeJsonParse<unknown>(rawConfig);

      if (!parsedJson.success) {
        this.currentConfig = defaultConfig;
        this.lastValidationError = `config.json содержит некорректный JSON: ${parsedJson.error}`;
        return { config: this.currentConfig, validationError: this.lastValidationError };
      }

      const normalized = normalizeConfig(parsedJson.data);
      const parsedConfig = appConfigSchema.safeParse(normalized.config);

      if (!parsedConfig.success) {
        this.currentConfig = defaultConfig;
        this.lastValidationError = parsedConfig.error.issues
          .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
          .join('; ');
        return { config: this.currentConfig, validationError: this.lastValidationError };
      }

      this.currentConfig = parsedConfig.data as AppConfig;
      this.lastValidationError = undefined;

      if (normalized.migrated) {
        const backupPath = `${this.configPath}.backup-v${normalized.fromSchemaVersion}-${Date.now()}.json`;
        await copyFile(this.configPath, backupPath);
        await writeFile(this.configPath, toPrettyJson(this.currentConfig), 'utf8');
        this.lastMigration = {
          fromSchemaVersion: normalized.fromSchemaVersion,
          toSchemaVersion: 2,
          backupPath,
          assets: this.currentConfig.assets.length,
          dataSources: this.currentConfig.dataSources.length,
          points: this.currentConfig.points.length
        };
      }

      return { config: this.currentConfig, migration: this.lastMigration };
    } catch (error) {
      if (isFileNotFoundError(error)) {
        await this.saveConfig(defaultConfig);
        this.currentConfig = defaultConfig;
        this.lastValidationError = undefined;
        return { config: this.currentConfig };
      }

      this.currentConfig = defaultConfig;
      this.lastValidationError = error instanceof Error ? error.message : 'Unknown config load error';
      return { config: this.currentConfig, validationError: this.lastValidationError };
    }
  }

  public async saveConfig(config: AppConfig): Promise<void> {
    const normalized = normalizeConfig(config).config;
    const parsedConfig = appConfigSchema.safeParse(normalized);

    if (!parsedConfig.success) {
      const message = parsedConfig.error.issues
        .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Config validation failed: ${message}`);
    }

    await mkdir(dirname(this.configPath), { recursive: true });
    await writeFile(this.configPath, toPrettyJson(parsedConfig.data), 'utf8');
    this.currentConfig = parsedConfig.data as AppConfig;
    this.lastValidationError = undefined;
  }

  public async reloadConfig(): Promise<ConfigLoadResult> {
    return this.loadConfig();
  }

  public async resetConfig(): Promise<ConfigLoadResult> {
    await this.saveConfig(defaultConfig);
    return { config: this.currentConfig };
  }

  public getCurrentConfig(): AppConfig {
    return this.currentConfig;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}

function normalizeConfig(value: unknown): NormalizeResult {
  if (!isRecord(value)) {
    return { config: value, migrated: false, fromSchemaVersion: 'legacy' };
  }

  const config = normalizeSingleDeviceLegacy(value);
  const schemaVersion = Number(config.schemaVersion);
  const hasV2Shape = schemaVersion === 2 && Array.isArray(config.dataSources) && Array.isArray(config.assets) && Array.isArray(config.points);

  if (hasV2Shape) {
    return {
      config: normalizeV2Config(config),
      migrated: hasLegacyProjectionFields(config) || hasLegacyCardSize(config),
      fromSchemaVersion: 2
    };
  }

  return {
    config: migrateLegacyToV2(config),
    migrated: true,
    fromSchemaVersion: Number.isFinite(schemaVersion) ? schemaVersion : 'legacy'
  };
}

function normalizeSingleDeviceLegacy(value: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(value.devices)) {
    return value;
  }

  if (!isRecord(value.device) || !isRecord(value.connection)) {
    return value;
  }

  const legacyDevice = value.device as Partial<LegacyDeviceConfig>;
  const legacyConnection = value.connection as LegacyConnectionConfig;
  const { device: _device, connection: _connection, ...restConfig } = value;

  return {
    ...restConfig,
    devices: [
      {
        ...legacyDevice,
        connection: legacyConnection
      }
    ]
  };
}

function migrateLegacyToV2(value: Record<string, unknown>): AppConfig {
  const now = new Date().toISOString();
  const legacyDevices = readArray<LegacyDeviceConfig>(value.devices);
  const legacyChannels = readArray<LegacyChannelConfig>(value.channels);
  const legacyBarrels = readArray<LegacyBarrelConfig>(value.barrels);
  const dataSources = mergeById(
    readArray<DataSource>(value.dataSources),
    legacyDevices.map((device) => legacyDeviceToDataSource(device, now)),
    (source) => source
  );
  const points = mergeById(
    readArray<Point>(value.points),
    legacyChannels.map((channel) => legacyChannelToPoint(channel, legacyBarrels, legacyDevices, now)),
    (point) => point
  );
  const assets = mergeById(
    readArray<Asset>(value.assets),
    legacyBarrels.map((barrel) => legacyBarrelToAsset(barrel, now)),
    normalizeAssetMetadata
  );

  return normalizeV2Config({
    ...pickLegacyShell(value),
    schemaVersion: 2 as const,
    app: {
      ...defaultConfig.app,
      ...(isRecord(value.app) ? value.app : {}),
      simulationCommandsOnly: isRecord(value.app) && typeof value.app.simulationCommandsOnly === 'boolean'
        ? value.app.simulationCommandsOnly
        : true,
      realWriteEnabled: isRecord(value.app) && typeof value.app.realWriteEnabled === 'boolean'
        ? value.app.realWriteEnabled
        : false
    },
    dataSources,
    assets,
    points,
    actuators: readArray(value.actuators),
    interlocks: readArray(value.interlocks),
    commands: readArray(value.commands),
    monitoringProfiles: readArray(value.monitoringProfiles),
    monitoringSessions: readArray(value.monitoringSessions),
    processes: readArray(value.processes),
    processGraphs: readArray(value.processGraphs),
    processJobs: readArray(value.processJobs)
  });
}

function normalizeV2Config(config: Record<string, unknown> | Partial<AppConfig>): AppConfig {
  const now = new Date().toISOString();
  const points = readArray<Point>(config.points);
  const assets = readArray<Asset>(config.assets).map((asset) => ({
    ...normalizeAssetMetadata(asset),
    pointIds: asset.pointIds.length > 0 ? asset.pointIds : points.filter((point) => point.assetId === asset.id).map((point) => point.id)
  }));
  const monitoringProfiles = readArray<AppConfig['monitoringProfiles'][number]>(config.monitoringProfiles);

  return {
    ...defaultConfig,
    schemaVersion: 2,
    app: {
      ...defaultConfig.app,
      ...(isRecord(config.app) ? config.app : {})
    },
    dataSources: readArray<DataSource>(config.dataSources),
    assets,
    points,
    actuators: readArray(config.actuators),
    interlocks: readArray(config.interlocks),
    commands: readArray(config.commands),
    monitoringProfiles: monitoringProfiles.length > 0 ? monitoringProfiles : createDefaultMonitoringProfiles(assets, points, now),
    monitoringSessions: readArray(config.monitoringSessions),
    processes: readArray(config.processes),
    processGraphs: readArray(config.processGraphs),
    processJobs: readArray(config.processJobs),
    thresholds: isRecord(config.thresholds) ? (config.thresholds as AppConfig['thresholds']) : defaultConfig.thresholds,
    interface: normalizeInterfaceConfig(config.interface)
  };
}

function normalizeInterfaceConfig(value: unknown): AppConfig['interface'] {
  const interfaceConfig = isRecord(value) ? value : {};
  const language = interfaceConfig.language === 'en' || interfaceConfig.language === 'ru'
    ? interfaceConfig.language
    : defaultConfig.interface.language;

  return {
    ...defaultConfig.interface,
    ...interfaceConfig,
    language
  } as AppConfig['interface'];
}

function mergeById<TItem extends { id: string }>(
  primary: TItem[],
  fallback: TItem[],
  sync: (item: TItem) => TItem
): TItem[] {
  const result = primary.map((item) => sync(item));
  const resultIds = new Set(result.map((item) => item.id));

  fallback.forEach((item) => {
    if (!resultIds.has(item.id)) {
      result.push(item);
    }
  });

  return result;
}

function legacyDeviceToDataSource(device: LegacyDeviceConfig, now: string): DataSource {
  return {
    id: device.id,
    name: device.name,
    type: 'modbus-rtu',
    enabled: device.active,
    connection: {
      type: 'modbus-rtu',
      port: device.connection.port,
      baudRate: device.connection.baudRate,
      dataBits: device.connection.dataBits,
      stopBits: device.connection.stopBits,
      parity: device.connection.parity
    },
    pollingIntervalMs: undefined,
    timeoutMs: device.connection.timeoutMs,
    retryCount: device.connection.retries,
    metadata: {
      model: device.model,
      slaveId: device.modbusAddress
    },
    createdAt: now,
    updatedAt: now
  };
}

function legacyChannelToPoint(channel: LegacyChannelConfig, barrels: LegacyBarrelConfig[], devices: LegacyDeviceConfig[], now: string): Point {
  const barrel = barrels.find(
    (item) => item.temperatureChannelId === channel.id || item.levelChannelId === channel.id
  );
  const device = devices.find((item) => item.id === channel.deviceId);

  return {
    id: channel.id,
    name: channel.name,
    kind: 'telemetry',
    assetId: barrel?.id,
    dataSourceId: channel.deviceId,
    valueType: channel.dataType,
    rawUnit: channel.rawUnit,
    displayUnit: channel.displayUnit,
    address: {
      protocol: 'modbus',
      slaveId: device?.modbusAddress ?? 1,
      area: channel.modbusFunction === 3 ? 'holding-register' : 'input-register',
      functionCode: channel.modbusFunction,
      registerAddress: channel.registerAddress,
      registerCount: channel.registerCount,
      valueType: channel.dataType,
      byteOrder: channel.byteOrder
    },
    scaling: channel.scaling,
    thresholds: channel.type === 'temperature'
      ? configThresholdToPoint(defaultConfig.thresholds.temperature)
      : channel.type === 'level'
        ? configThresholdToPoint(defaultConfig.thresholds.level)
        : undefined,
    recordable: true,
    enabled: true,
    createdAt: now,
    updatedAt: now
  };
}

function legacyBarrelToAsset(barrel: LegacyBarrelConfig, now: string): Asset {
  return {
    id: barrel.id,
    name: barrel.name,
    type: 'barrel',
    pointIds: [barrel.temperatureChannelId, barrel.levelChannelId].filter(Boolean),
    actuatorIds: [],
    metadata: {
      active: barrel.active,
      visible: barrel.visible,
      displayOrder: barrel.displayOrder,
      cardSize: barrel.cardSize,
      temperaturePointId: barrel.temperatureChannelId,
      levelPointId: barrel.levelChannelId
    },
    createdAt: now,
    updatedAt: now
  };
}

function readArray<TItem>(value: unknown): TItem[] {
  return Array.isArray(value) ? (value as TItem[]) : [];
}

function hasLegacyProjectionFields(config: Record<string, unknown>): boolean {
  return Array.isArray(config.devices) || Array.isArray(config.channels) || Array.isArray(config.barrels);
}

function hasLegacyCardSize(config: Record<string, unknown>): boolean {
  return readArray<Asset>(config.assets).some((asset) => isRecord(asset.metadata) && 'legacyCardSize' in asset.metadata);
}

function normalizeAssetMetadata(asset: Asset): Asset {
  if (!isRecord(asset.metadata) || !('legacyCardSize' in asset.metadata)) {
    return asset;
  }

  const { legacyCardSize, ...metadata } = asset.metadata;
  return {
    ...asset,
    metadata: {
      ...metadata,
      cardSize: metadata.cardSize ?? legacyCardSize
    }
  };
}

function createDefaultMonitoringProfiles(
  assets: Asset[],
  points: Point[],
  now: string
): AppConfig['monitoringProfiles'] {
  return assets.map((asset) => ({
    id: `${asset.id}-monitoring-profile`,
    assetId: asset.id,
    name: `Мониторинг ${asset.name}`,
    enabled: true,
    pointConfigs: points
      .filter((point) => point.assetId === asset.id && point.recordable)
      .map((point) => ({
        pointId: point.id,
        enabled: true,
        mode: 'both' as const,
        sampleIntervalMs: point.valueType === 'float32' ? 5000 : 10000,
        retentionDays: 30
      })),
    createdAt: now,
    updatedAt: now
  }));
}

function pickLegacyShell(value: Record<string, unknown>): Partial<AppConfig> {
  return {
    thresholds: isRecord(value.thresholds) ? (value.thresholds as AppConfig['thresholds']) : defaultConfig.thresholds,
    interface: isRecord(value.interface) ? (value.interface as AppConfig['interface']) : defaultConfig.interface
  };
}

function configThresholdToPoint(threshold: AppConfig['thresholds']['temperature']): Point['thresholds'] {
  return {
    warningLow: threshold.warningLow,
    warningHigh: threshold.warningHigh,
    alarmLow: threshold.alarmLow,
    alarmHigh: threshold.alarmHigh
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
