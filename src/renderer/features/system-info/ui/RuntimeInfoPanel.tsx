import type { SystemInfo } from '../../../../shared/types/ipc.types';
import { Panel } from '../../../shared/ui/Panel';

type RuntimeInfoPanelProps = {
  info: SystemInfo;
};

export function RuntimeInfoPanel({ info }: RuntimeInfoPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Среда выполнения">
      <dl className="grid gap-3 text-sm">
        <InfoRow label="Electron" value={info.electronVersion ?? '—'} />
        <InfoRow label="Node" value={info.nodeVersion ?? '—'} />
        <InfoRow label="Chrome" value={info.chromeVersion ?? '—'} />
        <InfoRow label="Платформа" value={info.platform} />
        <InfoRow label="Архитектура" value={info.arch} />
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
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
