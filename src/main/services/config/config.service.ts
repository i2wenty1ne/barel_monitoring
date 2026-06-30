import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  AppConfig,
  Asset,
  BarrelConfig,
  ChannelConfig,
  ConnectionConfig,
  DataSource,
  DeviceConfig,
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
      config: withCompatibilityProjections(config as Partial<AppConfig>),
      migrated: !Array.isArray(config.devices) || !Array.isArray(config.channels) || !Array.isArray(config.barrels),
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

  const legacyDevice = value.device as Partial<DeviceConfig>;
  const legacyConnection = value.connection as ConnectionConfig;
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
  const legacyDevices = Array.isArray(value.devices) ? (value.devices as DeviceConfig[]) : defaultConfig.devices;
  const legacyChannels = Array.isArray(value.channels) ? (value.channels as ChannelConfig[]) : defaultConfig.channels;
  const legacyBarrels = Array.isArray(value.barrels) ? (value.barrels as BarrelConfig[]) : defaultConfig.barrels;
  const base = {
    ...defaultConfig,
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
    devices: legacyDevices,
    channels: legacyChannels,
    barrels: legacyBarrels
  } satisfies AppConfig;

  return withDomainFromCompatibility(base, now);
}

function withCompatibilityProjections(config: Partial<AppConfig>): AppConfig {
  const now = new Date().toISOString();
  const devices = Array.isArray(config.devices) && config.devices.length > 0
    ? config.devices
    : dataSourcesToDevices(config.dataSources ?? []);
  const channels = Array.isArray(config.channels) && config.channels.length > 0
    ? config.channels
    : pointsToChannels(config.points ?? []);
  const barrels = Array.isArray(config.barrels) && config.barrels.length > 0
    ? config.barrels
    : channels.length > 0
      ? assetsToBarrels(config.assets ?? [])
      : [];

  return withDomainFromCompatibility({
    ...defaultConfig,
    ...config,
    schemaVersion: 2,
    app: {
      ...defaultConfig.app,
      ...config.app
    },
    devices,
    channels,
    barrels
  } as AppConfig, now);
}

function withDomainFromCompatibility(config: AppConfig, now: string): AppConfig {
  const dataSourceIds = new Set((config.dataSources ?? []).map((source) => source.id));
  const dataSources = [
    ...(config.dataSources ?? []),
    ...config.devices
      .filter((device) => !dataSourceIds.has(device.id))
      .map((device) => deviceToDataSource(device, now))
  ];
  const pointIds = new Set((config.points ?? []).map((point) => point.id));
  const points = [
    ...(config.points ?? []),
    ...config.channels
      .filter((channel) => !pointIds.has(channel.id))
      .map((channel) => channelToPoint(channel, config.barrels, config.devices, now))
  ];
  const assetIds = new Set((config.assets ?? []).map((asset) => asset.id));
  const assets = [
    ...(config.assets ?? []),
    ...config.barrels
      .filter((barrel) => !assetIds.has(barrel.id))
      .map((barrel) => barrelToAsset(barrel, now))
  ];

  return {
    ...config,
    schemaVersion: 2,
    dataSources,
    assets: assets.map((asset) => ({
      ...asset,
      pointIds: asset.pointIds.length > 0 ? asset.pointIds : points.filter((point) => point.assetId === asset.id).map((point) => point.id)
    })),
    points,
    actuators: config.actuators ?? [],
    interlocks: config.interlocks ?? [],
    monitoringProfiles: config.monitoringProfiles?.length > 0
      ? config.monitoringProfiles
      : assets.map((asset) => ({
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
        })),
    monitoringSessions: config.monitoringSessions ?? [],
    processes: config.processes ?? [],
    processGraphs: config.processGraphs ?? [],
    processJobs: config.processJobs ?? []
  };
}

function deviceToDataSource(device: DeviceConfig, now: string): DataSource {
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

function channelToPoint(channel: ChannelConfig, barrels: BarrelConfig[], devices: DeviceConfig[], now: string): Point {
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

function barrelToAsset(barrel: BarrelConfig, now: string): Asset {
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
      legacyCardSize: barrel.cardSize
    },
    createdAt: now,
    updatedAt: now
  };
}

function dataSourcesToDevices(dataSources: DataSource[]): DeviceConfig[] {
  return dataSources.flatMap((source) => {
    if (source.type !== 'modbus-rtu' || source.connection.type !== 'modbus-rtu') {
      return [];
    }

    return [{
      id: source.id,
      name: source.name,
      model: String(source.metadata?.model ?? 'Modbus RTU'),
      protocol: 'modbus-rtu',
      modbusAddress: typeof source.metadata?.slaveId === 'number' ? source.metadata.slaveId : 1,
      active: source.enabled,
      connection: {
        ...source.connection,
        timeoutMs: source.timeoutMs ?? 1000,
        retries: source.retryCount ?? 1
      }
    }];
  });
}

function pointsToChannels(points: Point[]): ChannelConfig[] {
  return points.flatMap((point, index) => {
    if (
      point.kind !== 'telemetry' ||
      point.address?.protocol !== 'modbus' ||
      (point.address.functionCode !== 3 && point.address.functionCode !== 4)
    ) {
      return [];
    }

    return [{
      id: point.id,
      name: point.name,
      type: inferChannelType(point),
      deviceId: point.dataSourceId ?? '',
      moduleInputNumber: index + 1,
      registerAddress: point.address.registerAddress ?? 0,
      modbusFunction: point.address.functionCode,
      dataType: point.valueType === 'boolean' || point.valueType === 'string' ? 'uint16' : point.valueType,
      registerCount: point.address.registerCount ?? 1,
      byteOrder: point.address.byteOrder ?? 'ABCD',
      rawUnit: point.rawUnit ?? '',
      displayUnit: point.displayUnit ?? '',
      decimals: point.valueType === 'float32' ? 2 : 0,
      scaling: point.scaling ?? { type: 'none' }
    }];
  });
}

function assetsToBarrels(assets: Asset[]): BarrelConfig[] {
  return assets
    .filter((asset) => asset.type === 'barrel' || asset.type === 'tank')
    .map((asset, index) => ({
      id: asset.id,
      name: asset.name,
      active: Boolean(asset.metadata?.active ?? true),
      visible: Boolean(asset.metadata?.visible ?? true),
      temperatureChannelId: asset.pointIds.find((pointId) => pointId.includes('temperature')) ?? asset.pointIds[0] ?? '',
      levelChannelId: asset.pointIds.find((pointId) => pointId.includes('level')) ?? asset.pointIds[1] ?? asset.pointIds[0] ?? '',
      displayOrder: typeof asset.metadata?.displayOrder === 'number' ? asset.metadata.displayOrder : index + 1,
      cardSize: asset.metadata?.legacyCardSize === 'small' || asset.metadata?.legacyCardSize === 'large'
        ? asset.metadata.legacyCardSize
        : 'medium'
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

function inferChannelType(point: Point): ChannelConfig['type'] {
  const text = `${point.id} ${point.name}`.toLowerCase();

  if (text.includes('temperature') || text.includes('темпера')) {
    return 'temperature';
  }

  if (text.includes('level') || text.includes('уров')) {
    return 'level';
  }

  return 'custom';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
