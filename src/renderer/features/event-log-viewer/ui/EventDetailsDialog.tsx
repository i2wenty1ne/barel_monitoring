import { useTranslation } from 'react-i18next';
import type { EventLogEntry } from '../../../../shared/types/event.types';
import { formatDateTime, stringifyPrettyJson } from '../../../../shared/lib/format';
import { Button } from '../../../shared/ui/Button';
import { CodeBlock } from '../../../shared/ui/CodeBlock';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { translateLiteral, translateLiteralNode } from '../../../shared/i18n/translateLiteral';

type EventDetailsDialogProps = {
  event: EventLogEntry;
  onClose: () => void;
};

export function EventDetailsDialog({ event, onClose }: EventDetailsDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-6">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-auto rounded-lg border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{translateLiteral(t, 'Детали события')}</h2>
            <p className="mt-1 text-sm text-slate-400">{event.message}</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Закрыть
          </Button>
        </div>
        <dl className="mt-5 grid gap-2 text-sm md:grid-cols-2">
          <InfoRow label="id" value={event.id} />
          <InfoRow label="Время" value={formatDateTime(event.timestamp)} />
          <InfoRow label="Уровень" value={event.level} />
          <InfoRow label="Источник" value={event.source} />
          <InfoRow label="Объект" value={event.entityId ?? '—'} />
        </dl>
        <div className="mt-5 space-y-3">
          <CopyButton getText={() => stringifyPrettyJson(event)} label="Скопировать событие" />
          <CodeBlock value={stringifyPrettyJson(event.details ?? {})} />
        </div>
      </div>
    </div>
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
