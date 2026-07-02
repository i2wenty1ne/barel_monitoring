import { useTranslation } from 'react-i18next';
import type { SystemInfo } from '../../../../shared/types/ipc.types';
import { translateLiteral, translateLiteralNode } from '../../../shared/i18n/translateLiteral';
import { Button } from '../../../shared/ui/Button';
import { Panel } from '../../../shared/ui/Panel';

type PathsPanelProps = {
  info: SystemInfo;
  onOpenConfigFolder: () => void;
  onOpenLogsFolder: () => void;
};

export function PathsPanel({
  info,
  onOpenConfigFolder,
  onOpenLogsFolder
}: PathsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Пути">
      <dl className="grid gap-3 text-sm">
        <InfoRow label="config.json" value={info.configPath} />
        <InfoRow label="events.jsonl" value={info.logsPath} />
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onOpenConfigFolder} variant="secondary">
          Открыть папку конфигурации
        </Button>
        <Button onClick={onOpenLogsFolder} variant="secondary">
          Открыть папку логов
        </Button>
      </div>
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
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-slate-500">{translateLiteral(t, label)}</dt>
      <dd className="min-w-0 break-words text-slate-200">{translateLiteralNode(t, value)}</dd>
    </div>
  );
}
