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
  const gridClassName = getGridClassName(configState.config?.interface.columns);

  function handleRetry(): void {
    void configState.refresh();
    void snapshotState.refresh();
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Industrial Flow Monitor" title="Мониторинг объектов" />
        <LoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Industrial Flow Monitor" title="Мониторинг объектов" />
        <ErrorState message={error} onRetry={handleRetry} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Мониторинг объектов"
        description="Live-состояние объектов, построенное поверх Asset и Point."
      />

      {configState.validationError ? (
        <div className="mb-5 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {configState.validationError}
        </div>
      ) : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
          title="Объекты не настроены"
          description="Создайте Asset и привяжите к нему telemetry points."
        />
      ) : (
        <div className={gridClassName}>
          {barrelCards.map((item) => (
            <BarrelCard
              key={item.barrel.id}
              barrel={item.barrel}
              temperature={item.temperature}
              level={item.level}
              status={item.status}
              updatedAt={item.updatedAt}
              showLastUpdate={configState.config?.interface.showLastUpdate ?? true}
              onClick={() => navigate(`/barrels/${item.barrel.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function getGridClassName(columns: number | 'auto' | undefined): string {
  if (columns === 1) {
    return 'grid grid-cols-1 gap-5';
  }

  if (columns === 2) {
    return 'grid grid-cols-1 gap-5 md:grid-cols-2';
  }

  if (columns === 3) {
    return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';
  }

  if (columns === 4) {
    return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
  }

  return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
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
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}
