import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
      <h2 className="text-lg font-medium text-slate-100">{translateLiteral(t, title)}</h2>
      <p className="mt-2 text-sm text-slate-400">{translateLiteral(t, description)}</p>
    </div>
  );
}
