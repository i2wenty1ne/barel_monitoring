import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateLiteralNode } from '../i18n/translateLiteral';

type CollapsibleSectionProps = {
  title: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
};

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
  actions
}: CollapsibleSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/35">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-teal-300/40"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{isOpen ? t('literal.Свернуть') : t('literal.Развернуть')}</span>
            <span className="text-base font-medium text-white">{translateLiteralNode(t, title)}</span>
          </div>
          {summary ? <div className="mt-3">{summary}</div> : null}
        </button>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {isOpen ? (
        <div className="border-t border-white/10 p-4" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
