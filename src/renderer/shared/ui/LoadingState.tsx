import { useTranslation } from 'react-i18next';

export function LoadingState(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-teal-300" />
      {t('common.loading')}
    </div>
  );
}
