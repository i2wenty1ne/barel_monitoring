import type { AppConfig } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot } from '../../../../shared/types/monitoring.types';
import { formatDateTime, formatPercent, formatTemperature } from '../../../../shared/lib/format';
import { Alert } from '../../../shared/ui/Alert';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type BarrelsDiagnosticsTableProps = {
  config: AppConfig;
  snapshot: MonitoringSnapshot;
};

type BarrelRow = AppConfig['barrels'][number] & {
  temperatureValue: string;
  levelValue: string;
  readingStatus: React.ReactNode;
  updatedAt: string;
};

export function BarrelsDiagnosticsTable({
  config,
  snapshot
}: BarrelsDiagnosticsTableProps): React.JSX.Element {
  const channels = new Set(config.channels.map((channel) => channel.id));
  const invalidBarrels = config.barrels.filter(
    (barrel) => !channels.has(barrel.temperatureChannelId) || !channels.has(barrel.levelChannelId)
  );
  const snapshotByBarrelId = new Map(snapshot.barrels.map((barrel) => [barrel.barrelId, barrel]));
  const rows: BarrelRow[] = config.barrels.map((barrel) => {
    const reading = snapshotByBarrelId.get(barrel.id);

    return {
      ...barrel,
      temperatureValue: formatTemperature(reading?.temperature?.displayValue),
      levelValue: formatPercent(reading?.level?.displayValue),
      readingStatus: <StatusBadge status={reading?.status ?? 'no-data'} />,
      updatedAt: formatDateTime(reading?.updatedAt)
    };
  });

  const columns: DataTableColumn<BarrelRow>[] = [
    { key: 'name', title: 'Название', render: (row) => row.name },
    { key: 'id', title: 'ID', render: (row) => row.id },
    { key: 'active', title: 'Активна', render: (row) => (row.active ? 'Да' : 'Нет') },
    { key: 'visible', title: 'Видима', render: (row) => (row.visible ? 'Да' : 'Нет') },
    { key: 'temperatureChannelId', title: 'Канал температуры', render: (row) => row.temperatureChannelId },
    { key: 'levelChannelId', title: 'Канал уровня', render: (row) => row.levelChannelId },
    { key: 'temperature', title: 'Температура', render: (row) => row.temperatureValue },
    { key: 'level', title: 'Уровень', render: (row) => row.levelValue },
    { key: 'status', title: 'Статус', render: (row) => row.readingStatus },
    { key: 'updated', title: 'Обновлено', render: (row) => row.updatedAt }
  ];

  return (
    <Panel className="p-5" title="Бочки">
      {invalidBarrels.length > 0 ? (
        <div className="mb-4">
          <Alert type="warning">
            Есть бочки с некорректными ссылками на каналы: {invalidBarrels.map((barrel) => barrel.name).join(', ')}
          </Alert>
        </div>
      ) : null}
      <DataTable compact columns={columns} getRowKey={(row) => row.id} maxHeight="360px" rows={rows} />
    </Panel>
  );
}
