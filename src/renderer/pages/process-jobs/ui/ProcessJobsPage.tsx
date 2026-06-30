import type { ProcessJob } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function ProcessJobsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<ProcessJob>[] = [
    { key: 'id', title: 'Job', render: (job) => <span className="font-mono text-xs">{job.id}</span> },
    {
      key: 'process',
      title: 'Процесс',
      render: (job) => config.processes.find((process) => process.id === job.processId)?.name ?? job.processId
    },
    { key: 'status', title: 'Статус', render: (job) => <Badge tone={getStatusTone(job.status)}>{job.status}</Badge> },
    { key: 'started', title: 'Старт', render: (job) => job.startedAt ? new Date(job.startedAt).toLocaleString('ru-RU') : '—' },
    { key: 'completed', title: 'Финиш', render: (job) => job.completedAt ? new Date(job.completedAt).toLocaleString('ru-RU') : '—' },
    { key: 'error', title: 'Ошибка', render: (job) => job.error ?? '—' }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Запуски процессов"
        description="ProcessJob хранит факт запуска, входные данные, context, результат и ошибки исполнения процесса."
      />
      <Panel className="p-5" title="Process jobs">
        {config.processJobs.length === 0 ? (
          <EmptyState title="Запусков пока нет" description="ProcessRuntime будет создавать jobs при старте процессов." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(job) => job.id} rows={config.processJobs} />
        )}
      </Panel>
    </section>
  );
}

function getStatusTone(status: ProcessJob['status']): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'failed' || status === 'cancelled') {
    return 'danger';
  }

  if (status === 'running') {
    return 'info';
  }

  return 'neutral';
}
