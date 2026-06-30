import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ExportResult, GetTrendQuery, TimeSeriesRecord, TrendSeries } from '../../../shared/types/config.types';
import { getTimeSeriesPath } from '../../utils/paths';
import { safeJsonParse } from '../../utils/safe-json';

export class TimeSeriesStorage {
  private readonly timeSeriesPath: string;

  public constructor(timeSeriesPath = getTimeSeriesPath()) {
    this.timeSeriesPath = timeSeriesPath;
  }

  public getPath(): string {
    return this.timeSeriesPath;
  }

  public async append(records: TimeSeriesRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await mkdir(dirname(this.timeSeriesPath), { recursive: true });
    await appendFile(this.timeSeriesPath, records.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8');
  }

  public async query(query: GetTrendQuery, pointNames: Map<string, { name: string; unit?: string }>): Promise<TrendSeries[]> {
    const records = await this.readRecords();
    const from = new Date(query.from).getTime();
    const to = new Date(query.to).getTime();
    const pointIds = new Set(query.pointIds);
    const filtered = records.filter((record) => {
      const timestamp = new Date(record.timestamp).getTime();
      return timestamp >= from && timestamp <= to && pointIds.has(record.pointId) && (!query.assetId || record.assetId === query.assetId);
    });
    const byPoint = new Map<string, TimeSeriesRecord[]>();

    filtered.forEach((record) => {
      const bucket = byPoint.get(record.pointId) ?? [];
      bucket.push(record);
      byPoint.set(record.pointId, bucket);
    });

    return query.pointIds.map((pointId) => {
      const point = pointNames.get(pointId);
      const values = aggregateRecords(byPoint.get(pointId) ?? [], query);
      return {
        pointId,
        pointName: point?.name ?? pointId,
        unit: point?.unit,
        values
      };
    });
  }

  public async exportCsv(query: GetTrendQuery, pointNames: Map<string, { name: string; unit?: string }>): Promise<ExportResult> {
    const series = await this.query(query, pointNames);
    const rows = ['timestamp,pointId,pointName,value,quality,unit'];
    series.forEach((item) => {
      item.values.forEach((value) => {
        rows.push([
          value.timestamp,
          item.pointId,
          escapeCsv(item.pointName),
          value.value ?? '',
          value.quality,
          item.unit ?? ''
        ].join(','));
      });
    });

    const exportPath = this.timeSeriesPath.replace(/\.jsonl$/, `-${Date.now()}.csv`);
    await writeFile(exportPath, rows.join('\n'), 'utf8');
    return { success: true, path: exportPath, rows: rows.length - 1 };
  }

  public async applyRetention(retentionDaysByPointId: Map<string, number>): Promise<void> {
    if (retentionDaysByPointId.size === 0) {
      return;
    }

    const records = await this.readRecords();
    const now = Date.now();
    const retained = records.filter((record) => {
      const retentionDays = retentionDaysByPointId.get(record.pointId);
      if (!retentionDays) {
        return true;
      }

      return now - new Date(record.timestamp).getTime() <= retentionDays * 24 * 60 * 60 * 1000;
    });

    if (retained.length !== records.length) {
      await mkdir(dirname(this.timeSeriesPath), { recursive: true });
      await writeFile(this.timeSeriesPath, retained.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8');
    }
  }

  private async readRecords(): Promise<TimeSeriesRecord[]> {
    try {
      const raw = await readFile(this.timeSeriesPath, 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => safeJsonParse<TimeSeriesRecord>(line))
        .filter((result) => result.success)
        .map((result) => result.data);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }
}

function aggregateRecords(records: TimeSeriesRecord[], query: GetTrendQuery): TrendSeries['values'] {
  if (!query.bucketMs || query.aggregation === 'raw' || !query.aggregation) {
    return records.map((record) => ({
      timestamp: record.timestamp,
      value: record.value,
      quality: record.quality
    }));
  }

  const buckets = new Map<number, TimeSeriesRecord[]>();
  records.forEach((record) => {
    const bucket = Math.floor(new Date(record.timestamp).getTime() / query.bucketMs!) * query.bucketMs!;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), record]);
  });

  return [...buckets]
    .sort(([left], [right]) => left - right)
    .map(([bucket, bucketRecords]) => ({
      timestamp: new Date(bucket).toISOString(),
      value: aggregateValue(bucketRecords, query.aggregation ?? 'last'),
      quality: bucketRecords.some((record) => record.quality !== 'good') ? 'uncertain' : 'good'
    }));
}

function aggregateValue(records: TimeSeriesRecord[], aggregation: NonNullable<GetTrendQuery['aggregation']>): number | boolean | string | null {
  const last = records[records.length - 1];
  if (aggregation === 'last' || aggregation === 'raw') {
    return last?.value ?? null;
  }

  const numericValues = records.map((record) => record.value).filter((value): value is number => typeof value === 'number');
  if (numericValues.length === 0) {
    return last?.value ?? null;
  }

  if (aggregation === 'min') {
    return Math.min(...numericValues);
  }

  if (aggregation === 'max') {
    return Math.max(...numericValues);
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
