import type { AppConfig, Asset, PointStatus } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot, Status } from '../../../../shared/types/monitoring.types';
import { formatDateTime } from '../../../../shared/lib/format';
import { getWorstStatus } from '../../../../shared/lib/thresholds';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type AssetsDiagnosticsTableProps = {
  config: AppConfig;
  snapshot: MonitoringSnapshot;
};

type AssetRow = Asset & {
  pointsCount: number;
  readingStatus: React.ReactNode;
  updatedAt: string;
};

export function AssetsDiagnosticsTable({
  config,
  snapshot
}: AssetsDiagnosticsTableProps): React.JSX.Element {
  const rows: AssetRow[] = config.assets.map((asset) => {
    const points = config.points.filter((point) => asset.pointIds.includes(point.id) || point.assetId === asset.id);
    const readings = points
      .map((point) => snapshot.live.readingsByPointId[point.id])
      .filter((reading): reading is NonNullable<typeof reading> => Boolean(reading));
    const status = getWorstStatus(readings.map((reading) => pointStatusToStatus(reading.status)));

    return {
      ...asset,
      pointsCount: points.length,
      readingStatus: <StatusBadge status={readings.length > 0 ? status : 'no-data'} />,
      updatedAt: formatDateTime(readings[0]?.timestamp)
    };
  });

  const columns: DataTableColumn<AssetRow>[] = [
    { key: 'name', title: 'Название', render: (row) => row.name },
    { key: 'id', title: 'ID', render: (row) => row.id },
    { key: 'type', title: 'Тип', render: (row) => row.type },
    { key: 'points', title: 'Точек', render: (row) => row.pointsCount },
    { key: 'status', title: 'Статус', render: (row) => row.readingStatus },
    { key: 'updated', title: 'Обновлено', render: (row) => row.updatedAt }
  ];

  return (
    <Panel className="p-5" title="Объекты">
      <DataTable compact columns={columns} getRowKey={(row) => row.id} maxHeight="360px" rows={rows} />
    </Panel>
  );
}

function pointStatusToStatus(status: PointStatus): Status {
  if (status === 'error') {
    return 'connection-error';
  }

  if (status === 'stale' || status === 'disabled') {
    return 'no-data';
  }

  return status;
}
