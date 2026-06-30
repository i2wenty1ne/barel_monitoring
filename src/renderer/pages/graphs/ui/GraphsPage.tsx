import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function GraphsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const assetLinks = config.assets.flatMap((asset) => [
    ...asset.pointIds.map((pointId) => ({
      id: `${asset.id}-${pointId}`,
      from: asset.name,
      to: config.points.find((point) => point.id === pointId)?.name ?? pointId,
      type: 'Asset → Point'
    })),
    ...asset.actuatorIds.map((actuatorId) => ({
      id: `${asset.id}-${actuatorId}`,
      from: asset.name,
      to: config.actuators.find((actuator) => actuator.id === actuatorId)?.name ?? actuatorId,
      type: 'Asset → Actuator'
    }))
  ]);
  const pointLinks = config.points
    .filter((point) => point.dataSourceId)
    .map((point) => ({
      id: `${point.id}-${point.dataSourceId}`,
      from: point.name,
      to: config.dataSources.find((source) => source.id === point.dataSourceId)?.name ?? point.dataSourceId ?? '',
      type: 'Point → DataSource'
    }));
  const links = [...assetLinks, ...pointLinks];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Графы"
        description="Read-only asset graph mode: связи объектов, точек, источников данных и механизмов. React Flow editor подключается следующей стадией."
      />
      <Panel className="p-5" title="Связи модели">
        {links.length === 0 ? (
          <EmptyState title="Связей нет" description="Добавьте pointIds, dataSourceId или actuatorIds в config." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {links.map((link) => (
              <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={link.id}>
                <div className="mb-2">
                  <Badge tone="info">{link.type}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-100">{link.from}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-teal-100">{link.to}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}
