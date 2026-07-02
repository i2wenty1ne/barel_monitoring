import { useTranslation } from 'react-i18next';
import type { Status } from '../../../shared/types/monitoring.types';

const statusClasses: Record<Status, string> = {
  ok: 'bg-teal-400/15 text-teal-200 ring-teal-300/30',
  warning: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  alarm: 'bg-rose-400/15 text-rose-200 ring-rose-300/30',
  'no-data': 'bg-slate-400/15 text-slate-200 ring-slate-300/30',
  'connection-error': 'bg-red-400/15 text-red-200 ring-red-300/30'
};

const statusLabelKeys: Record<Status, string> = {
  ok: 'status.ok',
  warning: 'status.warning',
  alarm: 'status.alarm',
  'no-data': 'status.noData',
  'connection-error': 'status.connectionError'
};

type StatusBadgeProps = {
  status: Status;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium ring-1 ${statusClasses[status]}`}
    >
      {label ?? t(statusLabelKeys[status])}
    </span>
  );
}
