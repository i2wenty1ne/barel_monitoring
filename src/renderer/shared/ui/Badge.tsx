import { useTranslation } from 'react-i18next';
import { translateLiteralNode } from '../i18n/translateLiteral';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400/15 text-slate-200 ring-slate-300/25',
  info: 'bg-sky-400/15 text-sky-200 ring-sky-300/25',
  success: 'bg-teal-400/15 text-teal-200 ring-teal-300/25',
  warning: 'bg-amber-400/15 text-amber-200 ring-amber-300/25',
  danger: 'bg-rose-400/15 text-rose-200 ring-rose-300/25'
};

export function Badge({ children, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${toneClasses[tone]}`}
    >
      {translateLiteralNode(t, children)}
    </span>
  );
}
