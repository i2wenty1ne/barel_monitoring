import type { AppConfig, Asset } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot, Reading, Status } from '../../../../shared/types/monitoring.types';
import { getWorstStatus } from '../../../../shared/lib/thresholds';

export type AssetViewModel = {
  asset: Asset;
  readings: Reading[];
  status: Status;
  level: Reading | null;
  temperature: Reading | null;
  volume: Reading | null;
  updatedAt: string | null;
};

export function selectAssetViewModels(
  config: AppConfig,
  snapshot: MonitoringSnapshot | null
): AssetViewModel[] {
  const readingsByPointId = snapshot?.live.readingsByPointId ?? {};

  return [...config.assets]
    .sort((left, right) => getDisplayOrder(left) - getDisplayOrder(right))
    .map((asset) => {
      const configuredPointIds = getConfiguredPointIds(asset);
      const assetPoints = config.points.filter(
        (point) => asset.pointIds.includes(point.id) || point.assetId === asset.id || configuredPointIds.includes(point.id)
      );
      const readings = assetPoints
        .map((point) => readingsByPointId[point.id])
        .filter((reading): reading is Reading => Boolean(reading));
      const status = getWorstStatus(readings.map((reading) => mapReadingStatusToAssetStatus(reading.status)));

      return {
        asset,
        readings,
        status,
        level: findConfiguredReading(asset, readings, 'levelPointId')
          ?? findPointReading(readings, ['level', 'уров', 'volume', 'объем', 'объём']),
        temperature: findConfiguredReading(asset, readings, 'temperaturePointId')
          ?? findPointReading(readings, ['temperature', 'темпера']),
        volume: findConfiguredReading(asset, readings, 'volumePointId')
          ?? findPointReading(readings, ['volume', 'объем', 'объём']),
        updatedAt: readings[0]?.timestamp ?? snapshot?.updatedAt ?? null
      };
    });
}

function getConfiguredPointIds(asset: Asset): string[] {
  return ['levelPointId', 'temperaturePointId', 'volumePointId']
    .map((key) => asset.metadata?.[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function findConfiguredReading(
  asset: Asset,
  readings: Reading[],
  metadataKey: 'levelPointId' | 'temperaturePointId' | 'volumePointId'
): Reading | null {
  const pointId = asset.metadata?.[metadataKey];
  if (typeof pointId !== 'string' || !pointId) {
    return null;
  }

  return readings.find((reading) => reading.pointId === pointId) ?? null;
}

function findPointReading(readings: Reading[], patterns: string[]): Reading | null {
  return (
    readings.find((reading) => {
      const text = reading.pointId.toLowerCase();
      return patterns.some((pattern) => text.includes(pattern));
    }) ?? null
  );
}

function mapReadingStatusToAssetStatus(status: Reading['status']): Status {
  if (status === 'error') {
    return 'connection-error';
  }

  if (status === 'stale' || status === 'disabled') {
    return 'no-data';
  }

  return status;
}

function getDisplayOrder(asset: Asset): number {
  return typeof asset.metadata?.displayOrder === 'number' ? asset.metadata.displayOrder : Number.MAX_SAFE_INTEGER;
}
