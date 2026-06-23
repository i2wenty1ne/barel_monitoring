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
        <InfoRow label="Режим" value={info.appMode ?? '—'} />
        <InfoRow label="Устройство" value={info.currentDeviceName ?? '—'} />
        <InfoRow label="Модель" value={info.currentDeviceModel ?? '—'} />
        <InfoRow label="Modbus address" value={info.currentDeviceAddress ?? '—'} />
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
