import type { AppConfig } from '../../../../shared/types/config.types';
import type { MonitoringSnapshot } from '../../../../shared/types/monitoring.types';
import { formatDateTime, formatRawValue } from '../../../../shared/lib/format';
import { formatScalingForDiagnostics } from '../model/diagnostics.utils';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type ChannelsDiagnosticsTableProps = {
  config: AppConfig;
  snapshot: MonitoringSnapshot;
};

type ChannelRow = AppConfig['channels'][number] & {
  rawValue: string;
  displayValue: string;
  readingStatus: React.ReactNode;
  updatedAt: string;
  error: string;
};

export function ChannelsDiagnosticsTable({
  config,
  snapshot
}: ChannelsDiagnosticsTableProps): React.JSX.Element {
  const readingsByChannelId = new Map(snapshot.channels.map((reading) => [reading.channelId, reading]));
  const rows: ChannelRow[] = config.channels.map((channel) => {
    const reading = readingsByChannelId.get(channel.id);

    return {
      ...channel,
      rawValue: reading ? formatRawValue(reading.rawValue, reading.rawUnit) : '—',
      displayValue: reading ? formatRawValue(reading.displayValue, reading.displayUnit, channel.decimals) : '—',
      readingStatus: <StatusBadge status={reading?.status ?? 'no-data'} />,
      updatedAt: formatDateTime(reading?.updatedAt),
      error: reading?.error ?? (reading ? '—' : 'Нет данных по каналу')
    };
  });

  const columns: DataTableColumn<ChannelRow>[] = [
    { key: 'name', title: 'Название', render: (row) => row.name },
    { key: 'type', title: 'Тип', render: (row) => row.type },
    { key: 'input', title: 'Вход', render: (row) => row.moduleInputNumber },
    { key: 'register', title: 'Регистр', render: (row) => row.registerAddress },
    { key: 'fn', title: 'Fn', render: (row) => row.modbusFunction },
    { key: 'dataType', title: 'Тип данных', render: (row) => row.dataType },
    { key: 'count', title: 'Кол-во', render: (row) => row.registerCount },
    { key: 'order', title: 'Порядок', render: (row) => row.byteOrder },
    { key: 'scaling', title: 'Масштаб', render: (row) => formatScalingForDiagnostics(row.scaling) },
    { key: 'raw', title: 'Raw', render: (row) => row.rawValue },
    { key: 'display', title: 'Значение', render: (row) => row.displayValue },
    { key: 'status', title: 'Статус', render: (row) => row.readingStatus },
    { key: 'updated', title: 'Обновлено', render: (row) => row.updatedAt },
    { key: 'error', title: 'Ошибка', render: (row) => row.error }
  ];

  return (
    <Panel className="p-5" title="Каналы">
      <DataTable compact columns={columns} getRowKey={(row) => row.id} maxHeight="420px" rows={rows} />
    </Panel>
  );
}
