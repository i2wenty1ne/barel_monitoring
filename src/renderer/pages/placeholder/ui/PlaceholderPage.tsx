import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

type PlaceholderPageProps = {
  title: string;
  message: string;
};

export function PlaceholderPage({ title, message }: PlaceholderPageProps): React.JSX.Element {
  return (
    <section className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Barrel Monitor" title={title} />
      <Panel className="p-8">
        <p className="text-slate-300">{message}</p>
      </Panel>
    </section>
  );
}
