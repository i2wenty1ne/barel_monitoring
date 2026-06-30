import type { MonitoringPointConfig, MonitoringSession, TimeSeriesRecord } from '../../../shared/types/config.types';
import type { MonitoringSnapshot, Reading } from '../../../shared/types/monitoring.types';
import type { ConfigService } from '../config/config.service';
import type { EventLogService } from '../event-log/event-log.service';
import type { TimeSeriesStorage } from './time-series-storage';

export class HistorianService {
  private readonly lastWrittenAtBySessionPoint = new Map<string, number>();
  private readonly lastValueBySessionPoint = new Map<string, number | boolean | string | null>();

  public constructor(
    private readonly configService: ConfigService,
    private readonly storage: TimeSeriesStorage,
    private readonly eventLogService: EventLogService
  ) {}

  public async handleSnapshot(snapshot: MonitoringSnapshot): Promise<void> {
    const config = this.configService.getCurrentConfig();
    const activeSessions = config.monitoringSessions.filter((session) => session.status === 'running');
    const records: TimeSeriesRecord[] = [];

    activeSessions.forEach((session) => {
      const profile = config.monitoringProfiles.find((item) => item.id === session.profileId && item.enabled);
      if (!profile) {
        return;
      }

      profile.pointConfigs.filter((item) => item.enabled).forEach((pointConfig) => {
        const reading = snapshot.live.readingsByPointId[pointConfig.pointId];
        if (!reading || !shouldWrite(pointConfig, session, reading, this.lastWrittenAtBySessionPoint, this.lastValueBySessionPoint)) {
          return;
        }

        const point = config.points.find((item) => item.id === pointConfig.pointId);
        records.push({
          id: `ts-${Date.now()}-${records.length}`,
          assetId: reading.assetId ?? profile.assetId,
          pointId: pointConfig.pointId,
          monitoringSessionId: session.id,
          timestamp: reading.timestamp,
          rawValue: reading.rawValue,
          value: reading.displayValue,
          unit: reading.displayUnit ?? point?.displayUnit ?? point?.rawUnit,
          quality: reading.quality,
          source: config.app.mode === 'mock' ? 'mock' : point?.address?.protocol === 'modbus' ? 'modbus' : 'manual',
          metadata: {
            status: reading.status
          }
        });
      });
    });

    if (records.length > 0) {
      try {
        await this.storage.append(records);
      } catch (error) {
        await this.eventLogService.addEvent({
          level: 'error',
          source: 'historian',
          message: 'Failed to write time series records',
          details: {
            records: records.length,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  }

  public async applyRetention(): Promise<void> {
    const config = this.configService.getCurrentConfig();
    const retention = new Map<string, number>();
    config.monitoringProfiles.forEach((profile) => {
      profile.pointConfigs.forEach((pointConfig) => {
        if (pointConfig.retentionDays) {
          retention.set(pointConfig.pointId, pointConfig.retentionDays);
        }
      });
    });
    await this.storage.applyRetention(retention);
  }
}

function shouldWrite(
  pointConfig: MonitoringPointConfig,
  session: MonitoringSession,
  reading: Reading,
  lastWrittenAtBySessionPoint: Map<string, number>,
  lastValueBySessionPoint: Map<string, number | boolean | string | null>
): boolean {
  const key = `${session.id}:${pointConfig.pointId}`;
  const lastWrittenAt = lastWrittenAtBySessionPoint.get(key) ?? 0;
  const now = new Date(reading.timestamp).getTime();
  const intervalDue = now - lastWrittenAt >= pointConfig.sampleIntervalMs;
  const lastValue = lastValueBySessionPoint.get(key);
  const currentValue = reading.displayValue;
  const changed = isChanged(lastValue, currentValue, pointConfig.minChangeDelta);
  const shouldWriteValue =
    pointConfig.mode === 'interval'
      ? intervalDue
      : pointConfig.mode === 'onChange'
        ? changed
        : intervalDue || changed;

  if (shouldWriteValue) {
    lastWrittenAtBySessionPoint.set(key, now);
    lastValueBySessionPoint.set(key, currentValue);
  }

  return shouldWriteValue;
}

function isChanged(
  previous: number | boolean | string | null | undefined,
  current: number | boolean | string | null,
  minChangeDelta = 0
): boolean {
  if (previous === undefined) {
    return true;
  }

  if (typeof previous === 'number' && typeof current === 'number') {
    return Math.abs(current - previous) >= minChangeDelta;
  }

  return previous !== current;
}
