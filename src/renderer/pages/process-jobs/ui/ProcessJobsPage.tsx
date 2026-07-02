import { useTranslation } from 'react-i18next';
import type { ProcessJob } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { CodeBlock } from '../../../shared/ui/CodeBlock';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { translateLiteral } from '../../../shared/i18n/translateLiteral';

export function ProcessJobsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const jobs = [...config.processJobs].sort((left, right) => {
    const leftTime = new Date(left.startedAt ?? left.completedAt ?? 0).getTime();
    const rightTime = new Date(right.startedAt ?? right.completedAt ?? 0).getTime();
    return rightTime - leftTime;
  });
  const latestJob = jobs[0] ?? null;
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
    { key: 'result', title: 'Result', render: (job) => job.result ? Object.keys(job.result).join(', ') || 'context' : '—' },
    { key: 'error', title: 'Ошибка', render: (job) => job.error ?? '—' }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="Запуски процессов"
        description="Запуск процесса хранит входные данные, контекст, результат и ошибки исполнения."
      />
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <JobMetric label="Всего" value={jobs.length} />
          <JobMetric label="Завершено" value={jobs.filter((job) => job.status === 'completed').length} />
          <JobMetric label="Ошибки" value={jobs.filter((job) => job.status === 'failed').length} />
          <JobMetric label="Выполняется" value={jobs.filter((job) => job.status === 'running').length} />
        </div>

        <Panel className="p-5" title="Запуски процессов">
          {jobs.length === 0 ? (
            <EmptyState title="Запусков пока нет" description="Запустите процесс: runtime сохранит ProcessJob, context и result." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(job) => job.id} rows={jobs} />
          )}
        </Panel>

        {latestJob ? (
          <Panel className="p-5" title="Последний ProcessJob">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone={getStatusTone(latestJob.status)}>{latestJob.status}</Badge>
              <Badge tone="info">{latestJob.id}</Badge>
              <Badge tone="neutral">{config.processes.find((process) => process.id === latestJob.processId)?.name ?? latestJob.processId}</Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">{translateLiteral(t, 'Входные данные')}</div>
                <CodeBlock maxHeightClassName="max-h-72" value={JSON.stringify(latestJob.input, null, 2)} />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">{translateLiteral(t, 'Контекст')}</div>
                <CodeBlock maxHeightClassName="max-h-72" value={JSON.stringify(latestJob.context, null, 2)} />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">{translateLiteral(t, 'Result / Error')}</div>
                <CodeBlock
                  maxHeightClassName="max-h-72"
                  value={JSON.stringify({ result: latestJob.result ?? null, error: latestJob.error ?? null }, null, 2)}
                />
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function JobMetric({ label, value }: { label: string; value: number }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="text-xs text-slate-500">{translateLiteral(t, label)}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
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
