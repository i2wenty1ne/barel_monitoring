import type { DataSource } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function DataSourcesPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<DataSource>[] = [
    {
      key: 'name',
      title: 'Источник',
      render: (source) => (
        <div>
          <div className="font-medium text-slate-100">{source.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{source.id}</div>
        </div>
      )
    },
    { key: 'type', title: 'Тип', render: (source) => <Badge tone="info">{source.type}</Badge> },
    { key: 'enabled', title: 'Статус', render: (source) => <Badge tone={source.enabled ? 'success' : 'warning'}>{source.enabled ? 'Включен' : 'Отключен'}</Badge> },
    { key: 'connection', title: 'Подключение', render: formatConnection },
    { key: 'polling', title: 'Опрос', render: (source) => `${source.pollingIntervalMs ?? config.app.pollingIntervalMs} ms` }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Источники данных"
        description="DataSource описывает источник live-значений и команд: Modbus RTU, mock, manual и будущие TCP/HTTP/MQTT."
      />
      <Panel className="p-5" title="Источники">
        {config.dataSources.length === 0 ? (
          <EmptyState title="Источники не настроены" description="Создайте DataSource или мигрируйте старые устройства." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(source) => source.id} rows={config.dataSources} />
        )}
      </Panel>
    </section>
  );
}

function formatConnection(source: DataSource): React.ReactNode {
  if (source.connection.type === 'modbus-rtu') {
    return (
      <span className="font-mono text-xs">
        {source.connection.port} · {source.connection.baudRate} · {source.connection.dataBits}
        {(source.connection.parity[0] ?? 'n').toUpperCase()}
        {source.connection.stopBits}
      </span>
    );
  }

  if (source.connection.type === 'mock' || source.connection.type === 'manual') {
    return source.connection.type;
  }

  return <span className="font-mono text-xs">{JSON.stringify(source.connection)}</span>;
}
