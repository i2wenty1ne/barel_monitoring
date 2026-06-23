import type { Status } from '../../../shared/types/monitoring.types';

const statusLabels: Record<Status, string> = {
  ok: 'ok',
  warning: 'warning',
  alarm: 'alarm',
  'no-data': 'no data',
  'connection-error': 'connection error'
};

const statusClasses: Record<Status, string> = {
  ok: 'bg-teal-400/15 text-teal-200 ring-teal-300/30',
  warning: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  alarm: 'bg-rose-400/15 text-rose-200 ring-rose-300/30',
  'no-data': 'bg-slate-400/15 text-slate-200 ring-slate-300/30',
  'connection-error': 'bg-red-400/15 text-red-200 ring-red-300/30'
};

type StatusBadgeProps = {
  status: Status;
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium ring-1 ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
