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
    { key: 'name', title: 'Name', render: (row) => row.name },
    { key: 'type', title: 'Type', render: (row) => row.type },
    { key: 'input', title: 'Input', render: (row) => row.moduleInputNumber },
    { key: 'register', title: 'Register', render: (row) => row.registerAddress },
    { key: 'fn', title: 'Fn', render: (row) => row.modbusFunction },
    { key: 'dataType', title: 'Data type', render: (row) => row.dataType },
    { key: 'count', title: 'Count', render: (row) => row.registerCount },
    { key: 'order', title: 'Order', render: (row) => row.byteOrder },
    { key: 'scaling', title: 'Scaling', render: (row) => formatScalingForDiagnostics(row.scaling) },
    { key: 'raw', title: 'Raw', render: (row) => row.rawValue },
    { key: 'display', title: 'Display', render: (row) => row.displayValue },
    { key: 'status', title: 'Status', render: (row) => row.readingStatus },
    { key: 'updated', title: 'Updated', render: (row) => row.updatedAt },
    { key: 'error', title: 'Error', render: (row) => row.error }
  ];

  return (
    <Panel className="p-5" title="Каналы">
      <DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
    </Panel>
  );
}
