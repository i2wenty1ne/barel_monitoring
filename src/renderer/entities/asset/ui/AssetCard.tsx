import type { AssetViewModel } from '../model/selectors';
import { formatDateTime, formatPercent, formatTemperature } from '../../../../shared/lib/format';
import { Badge } from '../../../shared/ui/Badge';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { BarrelTank } from '../../barrel/ui/BarrelTank';

type AssetCardProps = {
  viewModel: AssetViewModel;
  showLastUpdate: boolean;
  onClick: () => void;
};

export function AssetCard({ viewModel, showLastUpdate, onClick }: AssetCardProps): React.JSX.Element {
  const { asset, readings, status, level, temperature, updatedAt } = viewModel;
  const isTankLike = asset.type === 'barrel' || asset.type === 'tank';

  return (
    <button
      className="group flex min-h-[300px] w-full flex-col rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-teal-300/35 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-teal-300/50"
      onClick={onClick}
      type="button"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">{asset.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="info">{asset.type}</Badge>
            <span className="font-mono text-xs text-slate-500">{asset.id}</span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {isTankLike ? (
        <div className="flex flex-1 items-center justify-center py-1">
          <BarrelTank levelPercent={asNumber(level?.displayValue)} size={getTankSize(asset)} status={status} />
        </div>
      ) : (
        <div className="flex flex-1 items-center">
          <div className="grid w-full gap-2">
            {readings.slice(0, 4).map((reading) => (
              <Metric
                key={reading.pointId}
                label={reading.pointId}
                value={formatReadingValue(reading.displayValue, reading.displayUnit)}
              />
            ))}
            {readings.length === 0 ? <Metric label="Текущие показания" value="нет данных" /> : null}
          </div>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {isTankLike ? <Metric label="Заполненность" value={formatPercent(asNumber(level?.displayValue))} /> : null}
        {temperature ? <Metric label="Температура" value={formatTemperature(asNumber(temperature.displayValue))} /> : null}
        <Metric label="Точек" value={String(readings.length)} />
        {showLastUpdate ? <Metric label="Обновлено" value={formatDateTime(updatedAt)} /> : null}
      </dl>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-2.5">
      <dt className="truncate text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-100">{value}</dd>
    </div>
  );
}

function asNumber(value: ReadingValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

type ReadingValue = number | boolean | string | null;

function formatReadingValue(value: ReadingValue, unit?: string): string {
  if (typeof value === 'number') {
    return `${Number(value.toFixed(2))}${unit ? ` ${unit}` : ''}`;
  }

  if (typeof value === 'boolean') {
    return value ? 'да' : 'нет';
  }

  return value ?? '—';
}

function getTankSize(asset: AssetViewModel['asset']): 'small' | 'medium' | 'large' {
  const size = asset.metadata?.legacyCardSize;
  return size === 'small' || size === 'large' ? size : 'medium';
}
