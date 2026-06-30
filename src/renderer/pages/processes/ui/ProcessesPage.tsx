import type { Process } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function ProcessesPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<Process>[] = [
    { key: 'name', title: 'Процесс', render: (item) => <div><div className="font-medium text-slate-100">{item.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div></div> },
    { key: 'graph', title: 'Graph', render: (item) => item.graphId },
    { key: 'inputs', title: 'Входы', render: (item) => item.inputSchema.fields.length },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'warning'}>{item.enabled ? 'Включен' : 'Отключен'}</Badge> }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Процессы"
        description="Process и ProcessGraph готовят приложение к сценариям загрузки, перекачки, контроля и автоматизации."
      />
      <Panel className="p-5" title="Processes">
        {config.processes.length === 0 ? (
          <EmptyState title="Процессы не созданы" description="Stage 7 добавит React Flow editor, graph validation и запуск ProcessJob." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(item) => item.id} rows={config.processes} />
        )}
      </Panel>
    </section>
  );
}
