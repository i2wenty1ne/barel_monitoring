import { Link, useParams } from 'react-router-dom';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import type { Point } from '../../../../shared/types/config.types';

export function AssetDetailsPage(): React.JSX.Element {
  const { assetId } = useParams<{ assetId: string }>();
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const asset = config.assets.find((item) => item.id === assetId);

  if (!asset) {
    return <ErrorState message="Объект не найден" onRetry={() => void refresh()} />;
  }

  const points = config.points.filter((point) => asset.pointIds.includes(point.id) || point.assetId === asset.id);
  const actuators = config.actuators.filter((actuator) => asset.actuatorIds.includes(actuator.id) || actuator.assetId === asset.id);
  const profile = config.monitoringProfiles.find((item) => item.assetId === asset.id);
  const legacyBarrel = config.barrels.find((barrel) => barrel.id === asset.id);
  const pointColumns: DataTableColumn<Point>[] = [
    { key: 'name', title: 'Точка', render: (point) => <div><div className="font-medium text-slate-100">{point.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{point.id}</div></div> },
    { key: 'kind', title: 'Kind', render: (point) => <Badge tone={point.kind === 'control' ? 'warning' : 'success'}>{point.kind}</Badge> },
    { key: 'source', title: 'DataSource', render: (point) => point.dataSourceId ?? '—' },
    { key: 'unit', title: 'Ед.', render: (point) => point.displayUnit ?? point.rawUnit ?? '—' },
    { key: 'recordable', title: 'История', render: (point) => (point.recordable ? 'да' : 'нет') }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Asset"
        title={asset.name}
        description={asset.description ?? `Тип объекта: ${asset.type}`}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel className="p-5" title="Параметры">
            {points.length === 0 ? (
              <EmptyState title="Точки не привязаны" description="Добавьте pointIds или assetId у точек данных." />
            ) : (
              <DataTable compact columns={pointColumns} getRowKey={(point) => point.id} rows={points} />
            )}
          </Panel>

          <Panel className="p-5" title="Исполнительные механизмы">
            {actuators.length === 0 ? (
              <EmptyState title="Механизмы не привязаны" description="Для насосов и клапанов добавьте Actuator и command/control points." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {actuators.map((actuator) => (
                  <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={actuator.id}>
                    <div className="font-medium text-slate-100">{actuator.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="info">{actuator.type}</Badge>
                      <Badge tone={actuator.enabled ? 'success' : 'warning'}>{actuator.enabled ? 'Включен' : 'Отключен'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel className="p-5" title="Обзор">
            <div className="space-y-3 text-sm">
              <InfoRow label="ID" value={asset.id} monospace />
              <InfoRow label="Тип" value={asset.type} />
              <InfoRow label="Точек" value={String(points.length)} />
              <InfoRow label="Механизмов" value={String(actuators.length)} />
              <InfoRow label="Профиль истории" value={profile?.name ?? 'не настроен'} />
            </div>
            {legacyBarrel ? (
              <Link
                className="mt-4 inline-flex rounded-md bg-teal-500/15 px-3 py-2 text-sm text-teal-100 ring-1 ring-teal-400/30 hover:bg-teal-500/20"
                to={`/barrels/${legacyBarrel.id}`}
              >
                Открыть виджет бочки
              </Link>
            ) : null}
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right text-slate-100 ${monospace ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
