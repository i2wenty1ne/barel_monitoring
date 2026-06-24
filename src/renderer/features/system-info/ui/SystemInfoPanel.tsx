import type { SystemInfo } from '../../../../shared/types/ipc.types';
import { Panel } from '../../../shared/ui/Panel';

type SystemInfoPanelProps = {
  info: SystemInfo;
};

export function SystemInfoPanel({ info }: SystemInfoPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Приложение">
      <dl className="grid gap-3 text-sm">
        <InfoRow label="Название" value={info.appName} />
        <InfoRow label="Версия" value={info.appVersion} />
        <InfoRow label="Режим сборки" value={info.buildMode === 'production' ? 'production' : 'development'} />
        <InfoRow label="Режим" value={info.appMode ?? '—'} />
        <InfoRow label="Устройств" value={String(info.devices.length)} />
        <InfoRow
          label="Активные"
          value={String(info.devices.filter((device) => device.active).length)}
        />
      </dl>
    </Panel>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
