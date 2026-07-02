import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: PageHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300/80">
            {translateLiteral(t, eyebrow)}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">{translateLiteral(t, title)}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-slate-400">{translateLiteral(t, description)}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
