import type { ChannelReading, Status } from '../../../../shared/types/monitoring.types';
import type { BarrelConfig } from '../../../../shared/types/config.types';
import {
  formatDateTime,
  formatPercent,
  formatTemperature
} from '../../../../shared/lib/format';
import { BarrelStatus } from './BarrelStatus';
import { BarrelTank } from './BarrelTank';

type BarrelCardProps = {
  barrel: BarrelConfig;
  temperature: ChannelReading | null;
  level: ChannelReading | null;
  status: Status;
  updatedAt: string | null;
  onClick: () => void;
};

export function BarrelCard({
  barrel,
  temperature,
  level,
  status,
  updatedAt,
  onClick
}: BarrelCardProps): React.JSX.Element {
  return (
    <button
      className="group flex min-h-[360px] w-full flex-col rounded-lg border border-white/10 bg-white/[0.045] p-5 text-left transition hover:border-teal-300/35 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-teal-300/50"
      onClick={onClick}
      type="button"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{barrel.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{barrel.id}</p>
        </div>
        <BarrelStatus status={status} />
      </div>

      <div className="flex flex-1 items-center justify-center py-2">
        <BarrelTank levelPercent={level?.displayValue} status={status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Заполненность" value={formatPercent(level?.displayValue)} />
        <Metric label="Температура" value={formatTemperature(temperature?.displayValue)} />
        <Metric label="Обновлено" value={formatDateTime(updatedAt)} />
        <Metric label="Статус" value={<BarrelStatus status={status} />} />
      </dl>
    </button>
  );
}

type MetricProps = {
  label: string;
  value: React.ReactNode;
};

function Metric({ label, value }: MetricProps): React.JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-base font-medium text-slate-100">{value}</dd>
    </div>
  );
}
