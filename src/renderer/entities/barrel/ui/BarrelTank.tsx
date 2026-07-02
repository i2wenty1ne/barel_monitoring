import { useTranslation } from 'react-i18next';
import type { Status } from '../../../../shared/types/monitoring.types';
import { clamp } from '../../../../shared/lib/scaling';
import { formatPercent } from '../../../../shared/lib/format';

type BarrelTankProps = {
  levelPercent: number | null | undefined;
  status: Status;
  size?: 'small' | 'medium' | 'large';
  showPercent?: boolean;
};

const sizeClasses = {
  small: 'h-32 w-20',
  medium: 'h-44 w-28',
  large: 'h-72 w-44'
} as const;

const liquidClasses: Record<Status, string> = {
  ok: 'bg-teal-400/80',
  warning: 'bg-amber-400/85',
  alarm: 'bg-rose-500/85',
  'no-data': 'bg-slate-500/50',
  'connection-error': 'bg-red-500/60'
};

const borderClasses: Record<Status, string> = {
  ok: 'border-teal-300/40 shadow-teal-950/20',
  warning: 'border-amber-300/45 shadow-amber-950/20',
  alarm: 'border-rose-300/50 shadow-rose-950/20',
  'no-data': 'border-slate-500/45 shadow-slate-950/20',
  'connection-error': 'border-red-300/45 shadow-red-950/20'
};

export function BarrelTank({
  levelPercent,
  status,
  size = 'medium',
  showPercent = true
}: BarrelTankProps): React.JSX.Element {
  const { t } = useTranslation();
  const safeLevel =
    levelPercent === null || levelPercent === undefined || Number.isNaN(levelPercent)
      ? null
      : clamp(levelPercent, 0, 100);
  const liquidHeight = safeLevel ?? 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative overflow-hidden rounded-[28px] border-2 bg-slate-950/80 shadow-inner ${sizeClasses[size]} ${borderClasses[status]}`}
        aria-label={t('tank.levelAria', { value: formatPercent(safeLevel) })}
      >
        <div className="absolute left-1/2 top-2 h-2 w-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/10" />
        <div
          className={`absolute bottom-0 left-0 right-0 transition-[height] duration-500 ease-out ${liquidClasses[status]}`}
          style={{ height: `${liquidHeight}%` }}
        >
          <div className="h-3 rounded-[50%] bg-white/20" />
        </div>
        <div className="absolute inset-x-3 top-0 h-full rounded-[22px] border-x border-white/10" />
        {showPercent ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-slate-950/70 px-2 py-1 text-sm font-semibold text-white">
              {formatPercent(safeLevel)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
