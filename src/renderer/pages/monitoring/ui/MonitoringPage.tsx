import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../../../shared/lib/format';
import { selectBarrelViewModels } from '../../../entities/barrel/model/selectors';
import { BarrelCard } from '../../../entities/barrel/ui/BarrelCard';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { useMonitoringSnapshot } from '../../../entities/monitoring/model/useMonitoringSnapshot';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function MonitoringPage(): React.JSX.Element {
  const navigate = useNavigate();
  const configState = useAppConfig();
  const snapshotState = useMonitoringSnapshot();

  const barrelCards = useMemo(() => {
    if (!configState.config) {
      return [];
    }

    return selectBarrelViewModels(configState.config, snapshotState.data);
  }, [configState.config, snapshotState.data]);

  const isLoading =
    (configState.isLoading || snapshotState.isLoading) && !configState.config && !snapshotState.data;
  const error = configState.error ?? snapshotState.error;

  function handleRetry(): void {
    void configState.refresh();
    void snapshotState.refresh();
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="Мониторинг бочек" />
        <LoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="Мониторинг бочек" />
        <ErrorState message={error} onRetry={handleRetry} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Barrel Monitor"
        title="Мониторинг бочек"
        description="Текущие значения из mock-сервиса обновляются через безопасный IPC канал."
        actions={
          <button
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
            onClick={() => void snapshotState.refresh()}
            type="button"
          >
            Обновить
          </button>
        }
      />

      {configState.validationError ? (
        <div className="mb-5 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {configState.validationError}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryPanel
          label="Общий статус"
          value={<StatusBadge status={snapshotState.data?.status ?? 'no-data'} />}
        />
        <SummaryPanel label="Режим данных" value={snapshotState.data?.mode ?? 'mock'} />
        <SummaryPanel
          label="Последнее обновление"
          value={formatDateTime(snapshotState.lastUpdatedAt)}
        />
        <SummaryPanel
          label="Предупреждения"
          value={String(snapshotState.data?.activeWarningsCount ?? 0)}
          tone="warning"
        />
        <SummaryPanel
          label="Аварии"
          value={String(snapshotState.data?.activeAlarmsCount ?? 0)}
          tone="alarm"
        />
      </div>

      {barrelCards.length === 0 ? (
        <EmptyState
          title="Бочки не настроены"
          description="Добавление бочек будет доступно на этапе настроек"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {barrelCards.map((item) => (
            <BarrelCard
              key={item.barrel.id}
              barrel={item.barrel}
              temperature={item.temperature}
              level={item.level}
              status={item.status}
              updatedAt={item.updatedAt}
              onClick={() => navigate(`/barrels/${item.barrel.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type SummaryPanelProps = {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'warning' | 'alarm';
};

function SummaryPanel({ label, value, tone = 'default' }: SummaryPanelProps): React.JSX.Element {
  const valueClassName =
    tone === 'warning' ? 'text-amber-100' : tone === 'alarm' ? 'text-rose-100' : 'text-slate-100';

  return (
    <Panel className="p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-3 text-xl font-semibold ${valueClassName}`}>{value}</div>
    </Panel>
  );
}
