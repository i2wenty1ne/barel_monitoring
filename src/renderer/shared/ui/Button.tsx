import { useTranslation } from 'react-i18next';
import { translateLiteralNode } from '../i18n/translateLiteral';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-teal-500 text-slate-950 hover:bg-teal-400 focus:ring-teal-300/50',
  secondary: 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 focus:ring-teal-300/40',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 focus:ring-rose-300/50',
  ghost: 'text-slate-300 hover:bg-white/5 focus:ring-slate-300/30'
};

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    >
      {translateLiteralNode(t, children)}
    </button>
  );
}
