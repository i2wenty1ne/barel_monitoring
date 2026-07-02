import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../../../shared/lib/format';
import type { MonitoringProfile, Point, PointStatus } from '../../../../shared/types/config.types';
import type { Reading, Status } from '../../../../shared/types/monitoring.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { useMonitoringSnapshot } from '../../../entities/monitoring/model/useMonitoringSnapshot';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { Tabs, type TabItem } from '../../../shared/ui/Tabs';
import { translateLiteral, translateLiteralNode } from '../../../shared/i18n/translateLiteral';

type AssetDetailsTab = 'points' | 'history' | 'actuators' | 'graph';

type PointRow = Point & {
  rawValue: string;
  displayValue: string;
  readingStatus: React.ReactNode;
  updatedAt: string;
  error: string;
};

export function AssetDetailsPage(): React.JSX.Element {
  const { assetId } = useParams<{ assetId: string }>();
  const configState = useAppConfig();
  const snapshotState = useMonitoringSnapshot();
  const [activeTab, setActiveTab] = useState<AssetDetailsTab>('points');
  const { config, isLoading, error, refresh } = configState;

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
  const pointRows: PointRow[] = points.map((point) => {
    const reading = snapshotState.data?.live.readingsByPointId[point.id];

    return {
      ...point,
      rawValue: reading ? formatReadingValue(reading.rawValue, reading.rawUnit) : '—',
      displayValue: reading ? formatReadingValue(reading.displayValue, reading.displayUnit) : '—',
      readingStatus: <StatusBadge status={pointStatusToStatus(reading?.status)} />,
      updatedAt: formatDateTime(reading?.timestamp),
      error: reading?.error ?? (reading ? '—' : 'Нет данных')
    };
  });
  const actuators = config.actuators.filter((actuator) => asset.actuatorIds.includes(actuator.id) || actuator.assetId === asset.id);
  const profiles = config.monitoringProfiles.filter((item) => item.assetId === asset.id);
  const profile = profiles[0];
  const activeSession = config.monitoringSessions.find((session) => session.assetId === asset.id && session.status === 'running');
  const tabs: TabItem<AssetDetailsTab>[] = [
    { id: 'points', label: 'Параметры' },
    { id: 'history', label: 'История' },
    { id: 'actuators', label: 'Механизмы' },
    { id: 'graph', label: 'Связи' }
  ];
  const pointColumns: DataTableColumn<PointRow>[] = [
    { key: 'name', title: 'Точка', render: (point) => <div><div className="font-medium text-slate-100">{point.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{point.id}</div></div> },
    { key: 'kind', title: 'Kind', render: (point) => <Badge tone={point.kind === 'control' ? 'warning' : 'success'}>{point.kind}</Badge> },
    { key: 'source', title: 'DataSource', render: (point) => point.dataSourceId ?? '—' },
    { key: 'display', title: 'Значение', render: (point) => point.displayValue },
    { key: 'raw', title: 'Raw', render: (point) => point.rawValue },
    { key: 'status', title: 'Статус', render: (point) => point.readingStatus },
    { key: 'updated', title: 'Обновлено', render: (point) => point.updatedAt },
    { key: 'unit', title: 'Ед.', render: (point) => point.displayUnit ?? point.rawUnit ?? '—' },
    { key: 'recordable', title: 'История', render: (point) => (point.recordable ? 'Да' : 'Нет') },
    { key: 'error', title: 'Ошибка', render: (point) => point.error }
  ];
  const profileColumns: DataTableColumn<MonitoringProfile>[] = [
    {
      key: 'name',
      title: 'Профиль',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-100">{item.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div>
        </div>
      )
    },
    { key: 'points', title: 'Точки', render: (item) => item.pointConfigs.filter((point) => point.enabled).length },
    { key: 'status', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'info' : 'warning'}>{item.enabled ? 'enabled' : 'disabled'}</Badge> }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Объект"
        title={asset.name}
        description={asset.description ?? `Тип объекта: ${asset.type}`}
      />
      <Tabs activeTab={activeTab} items={tabs} onChange={setActiveTab} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {activeTab === 'points' ? (
            <Panel className="p-5" title="Параметры">
              {points.length === 0 ? (
                <EmptyState title="Точки не привязаны" description="Добавьте pointIds или assetId у точек данных." />
              ) : (
                <DataTable compact columns={pointColumns} getRowKey={(point) => point.id} rows={pointRows} />
              )}
            </Panel>
          ) : null}

          {activeTab === 'history' ? (
            <Panel className="p-5" title="История">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={activeSession ? 'success' : 'neutral'}>
                    {activeSession ? 'running' : 'not running'}
                  </Badge>
                  <Badge tone="info">{points.filter((point) => point.recordable).length} recordable points</Badge>
                </div>
                <Link to={`/history?assetId=${asset.id}`}>
                  <Button variant="primary">Открыть графики</Button>
                </Link>
              </div>
              {profiles.length === 0 ? (
                <EmptyState title="Профиль истории не настроен" description="Создайте MonitoringProfile на странице истории." />
              ) : (
                <DataTable compact columns={profileColumns} getRowKey={(item) => item.id} rows={profiles} />
              )}
            </Panel>
          ) : null}

          {activeTab === 'actuators' ? (
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
          ) : null}

          {activeTab === 'graph' ? (
            <Panel className="p-5" title="Связи">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">{points.length} points</Badge>
                  <Badge tone="info">{actuators.length} actuators</Badge>
                  <Badge tone="neutral">
                    {new Set(points.map((point) => point.dataSourceId).filter(Boolean)).size} data sources
                  </Badge>
                </div>
                <Link to="/graphs">
                  <Button variant="primary">Открыть Asset graph</Button>
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {points.map((point) => (
                  <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={point.id}>
                    <div className="font-medium text-slate-100">{point.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Point {'->'} {point.dataSourceId ?? 'no dataSource'}</div>
                  </div>
                ))}
                {actuators.map((actuator) => (
                  <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={actuator.id}>
                    <div className="font-medium text-slate-100">{actuator.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Actuator {'->'} {actuator.commandPointIds.length} control points</div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-5">
          <Panel className="p-5" title="Обзор">
            <div className="space-y-3 text-sm">
              <InfoRow label="ID" value={asset.id} monospace />
              <InfoRow label="Тип" value={asset.type} />
              <InfoRow label="Точек" value={String(points.length)} />
              <InfoRow label="Механизмов" value={String(actuators.length)} />
              <InfoRow label="Профиль истории" value={profile?.name ?? 'не настроен'} />
              <InfoRow label="Сессия истории" value={activeSession ? 'running' : 'stopped'} />
            </div>
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function formatReadingValue(value: Reading['displayValue'], unit?: string): string {
  if (typeof value === 'number') {
    return `${Number(value.toFixed(2))}${unit ? ` ${unit}` : ''}`;
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  return value ?? '—';
}

function pointStatusToStatus(status: PointStatus | undefined): Status {
  if (status === 'error') {
    return 'connection-error';
  }

  if (!status || status === 'stale' || status === 'disabled') {
    return 'no-data';
  }

  return status;
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{translateLiteral(t, label)}</span>
      <span className={`text-right text-slate-100 ${monospace ? 'font-mono text-xs' : ''}`}>{translateLiteralNode(t, value)}</span>
    </div>
  );
}
