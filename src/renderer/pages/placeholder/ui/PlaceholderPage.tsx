import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

type PlaceholderPageProps = {
  titleKey: string;
  messageKey: string;
};

export function PlaceholderPage({ titleKey, messageKey }: PlaceholderPageProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t('common.appEyebrow')} title={t(titleKey)} />
      <Panel className="p-8">
        <p className="text-slate-300">{t(messageKey)}</p>
      </Panel>
    </section>
  );
}
