import type { AppConfig, Asset } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot, Reading, Status } from '../../../../shared/types/monitoring.types';
import { getWorstStatus } from '../../../../shared/lib/thresholds';

export type AssetViewModel = {
  asset: Asset;
  readings: Reading[];
  status: Status;
  level: Reading | null;
  temperature: Reading | null;
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
      const assetPoints = config.points.filter(
        (point) => asset.pointIds.includes(point.id) || point.assetId === asset.id
      );
      const readings = assetPoints
        .map((point) => readingsByPointId[point.id])
        .filter((reading): reading is Reading => Boolean(reading));
      const status = getWorstStatus(readings.map((reading) => pointStatusToLegacyStatus(reading.status)));

      return {
        asset,
        readings,
        status,
        level: findPointReading(readings, ['level', 'уров', 'volume', 'объем', 'объём']),
        temperature: findPointReading(readings, ['temperature', 'темпера']),
        updatedAt: readings[0]?.timestamp ?? snapshot?.updatedAt ?? null
      };
    });
}

function findPointReading(readings: Reading[], patterns: string[]): Reading | null {
  return (
    readings.find((reading) => {
      const text = reading.pointId.toLowerCase();
      return patterns.some((pattern) => text.includes(pattern));
    }) ?? null
  );
}

function pointStatusToLegacyStatus(status: Reading['status']): Status {
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
