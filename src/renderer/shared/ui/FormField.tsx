import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function FormField({ label, error, hint, children }: FormFieldProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{translateLiteral(t, label)}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{translateLiteral(t, hint)}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-200">{translateLiteral(t, error)}</span> : null}
    </label>
  );
}
