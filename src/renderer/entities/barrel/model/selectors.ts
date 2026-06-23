import type { AppConfig } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot, Status } from '../../../../shared/types/monitoring.types';
import { getWorstStatus } from '../../../../shared/lib/thresholds';
import type { BarrelViewModel } from './types';

export function selectBarrelViewModels(
  config: AppConfig,
  snapshot: MonitoringSnapshot | null
): BarrelViewModel[] {
  const readingsByChannelId = new Map(
    snapshot?.channels.map((reading) => [reading.channelId, reading]) ?? []
  );
  const snapshotBarrelsById = new Map(
    snapshot?.barrels.map((barrel) => [barrel.barrelId, barrel]) ?? []
  );

  return [...config.barrels]
    .filter((barrel) => barrel.visible)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((barrel) => {
      const snapshotBarrel = snapshotBarrelsById.get(barrel.id);
      const temperature =
        snapshotBarrel?.temperature ?? readingsByChannelId.get(barrel.temperatureChannelId) ?? null;
      const level = snapshotBarrel?.level ?? readingsByChannelId.get(barrel.levelChannelId) ?? null;
      const status: Status =
        snapshotBarrel?.status ??
        getWorstStatus([temperature?.status ?? 'no-data', level?.status ?? 'no-data']);

      return {
        barrel,
        temperature,
        level,
        status,
        updatedAt: snapshotBarrel?.updatedAt ?? snapshot?.updatedAt ?? null
      };
    });
}

export function selectBarrelViewModel(
  config: AppConfig,
  snapshot: MonitoringSnapshot | null,
  barrelId: string
): BarrelViewModel | null {
  return selectBarrelViewModels(config, snapshot).find((item) => item.barrel.id === barrelId) ?? null;
}
