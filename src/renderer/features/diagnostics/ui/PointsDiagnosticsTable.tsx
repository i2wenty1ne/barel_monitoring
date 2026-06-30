import type { AppConfig, Point, PointStatus } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot, Status } from '../../../../shared/types/monitoring.types';
import { formatDateTime } from '../../../../shared/lib/format';
import { formatScalingForDiagnostics } from '../model/diagnostics.utils';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type PointsDiagnosticsTableProps = {
  config: AppConfig;
  snapshot: MonitoringSnapshot;
};

type PointRow = Point & {
  rawValue: string;
  displayValue: string;
  readingStatus: React.ReactNode;
  updatedAt: string;
  error: string;
};

export function PointsDiagnosticsTable({
  config,
  snapshot
}: PointsDiagnosticsTableProps): React.JSX.Element {
  const rows: PointRow[] = config.points.map((point) => {
    const reading = snapshot.live.readingsByPointId[point.id];

    return {
      ...point,
      rawValue: reading ? formatReadingValue(reading.rawValue, reading.rawUnit) : '—',
      displayValue: reading ? formatReadingValue(reading.displayValue, reading.displayUnit) : '—',
      readingStatus: <StatusBadge status={pointStatusToStatus(reading?.status)} />,
      updatedAt: formatDateTime(reading?.timestamp),
      error: reading?.error ?? (reading ? '—' : 'Нет данных по точке')
    };
  });

  const columns: DataTableColumn<PointRow>[] = [
    { key: 'name', title: 'Название', render: (row) => row.name },
    { key: 'kind', title: 'Kind', render: (row) => row.kind },
    { key: 'source', title: 'DataSource', render: (row) => row.dataSourceId ?? '—' },
    { key: 'address', title: 'Адрес', render: formatPointAddress },
    { key: 'dataType', title: 'Тип данных', render: (row) => row.valueType },
    { key: 'scaling', title: 'Масштаб', render: (row) => formatScalingForDiagnostics(row.scaling) },
    { key: 'raw', title: 'Raw', render: (row) => row.rawValue },
    { key: 'display', title: 'Значение', render: (row) => row.displayValue },
    { key: 'status', title: 'Статус', render: (row) => row.readingStatus },
    { key: 'updated', title: 'Обновлено', render: (row) => row.updatedAt },
    { key: 'error', title: 'Ошибка', render: (row) => row.error }
  ];

  return (
    <Panel className="p-5" title="Точки данных">
      <DataTable compact columns={columns} getRowKey={(row) => row.id} maxHeight="420px" rows={rows} />
    </Panel>
  );
}

function formatPointAddress(point: Point): string {
  if (point.address?.protocol !== 'modbus') {
    return point.address?.protocol ?? '—';
  }

  return `${point.address.functionCode}:${point.address.registerAddress ?? point.address.coilAddress ?? 0}`;
}

function formatReadingValue(value: string | number | boolean | null, unit?: string): string {
  if (typeof value === 'number') {
    return `${Number(value.toFixed(2))}${unit ? ` ${unit}` : ''}`;
  }

  if (typeof value === 'boolean') {
    return value ? 'да' : 'нет';
  }

  return value ?? '—';
}

function pointStatusToStatus(status: PointStatus | undefined): Status {
  if (status === 'error') {
    return 'connection-error';
  }

  if (!status || status === 'stale' || status === 'disabled') {
    return 'no-data';
  }

  return status;
}
