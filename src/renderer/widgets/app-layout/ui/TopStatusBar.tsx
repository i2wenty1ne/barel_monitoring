import { formatDateTime } from '../../../../shared/lib/format';
import { useMonitoringSnapshot } from '../../../entities/monitoring/model/useMonitoringSnapshot';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function TopStatusBar(): React.JSX.Element {
  const { data, error, refresh } = useMonitoringSnapshot();

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-8 py-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-300">Операторская панель</span>
        <span className="text-slate-500">Режим: {data?.mode ?? 'mock'}</span>
        <StatusBadge status={data?.status ?? (error ? 'connection-error' : 'no-data')} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">
          Обновлено: {data ? formatDateTime(data.updatedAt) : 'Ожидание данных'}
        </span>
        <span className="text-amber-200">Warnings: {data?.activeWarningsCount ?? 0}</span>
        <span className="text-rose-200">Alarms: {data?.activeAlarmsCount ?? 0}</span>
        <button
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
          onClick={() => void refresh()}
          type="button"
        >
          Обновить
        </button>
      </div>
    </header>
  );
}
