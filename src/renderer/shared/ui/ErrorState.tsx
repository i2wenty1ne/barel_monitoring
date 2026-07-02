import { useTranslation } from 'react-i18next';
import { translateLiteral } from '../i18n/translateLiteral';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title,
  message,
  onRetry
}: ErrorStateProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-rose-300/25 bg-rose-500/10 p-6">
      <h2 className="text-lg font-medium text-rose-100">{title ? translateLiteral(t, title) : t('common.defaultErrorTitle')}</h2>
      <p className="mt-2 text-sm text-rose-100/80">{translateLiteral(t, message)}</p>
      {onRetry ? (
        <button
          className="mt-5 rounded-md bg-rose-200 px-4 py-2 text-sm font-medium text-rose-950 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200/60"
          onClick={onRetry}
          type="button"
        >
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}
