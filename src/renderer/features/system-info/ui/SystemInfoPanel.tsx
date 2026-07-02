import { useTranslation } from 'react-i18next';
import type { SystemInfo } from '../../../../shared/types/ipc.types';
import { translateLiteral, translateLiteralNode } from '../../../shared/i18n/translateLiteral';
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
        <InfoRow label="Источников" value={String(info.dataSources.length)} />
        <InfoRow label="Объектов" value={String(info.assets.length)} />
        <InfoRow label="Точек" value={String(info.points.length)} />
      </dl>
    </Panel>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{translateLiteral(t, label)}</dt>
      <dd className="min-w-0 break-words text-slate-200">{translateLiteralNode(t, value)}</dd>
    </div>
  );
}
