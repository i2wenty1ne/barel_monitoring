import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Alert } from '../../../shared/ui/Alert';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

type ProfileRow = {
  id: string;
  assetName: string;
  name: string;
  points: number;
  enabled: boolean;
};

export function HistoryPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const rows = config.monitoringProfiles.map((profile) => ({
    id: profile.id,
    assetName: config.assets.find((asset) => asset.id === profile.assetId)?.name ?? profile.assetId,
    name: profile.name,
    points: profile.pointConfigs.filter((point) => point.enabled).length,
    enabled: profile.enabled
  }));
  const columns: DataTableColumn<ProfileRow>[] = [
    { key: 'name', title: 'Профиль', render: (row) => <div><div className="font-medium text-slate-100">{row.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{row.id}</div></div> },
    { key: 'asset', title: 'Объект', render: (row) => row.assetName },
    { key: 'points', title: 'Точки', render: (row) => row.points },
    { key: 'enabled', title: 'Статус', render: (row) => (row.enabled ? 'включен' : 'отключен') }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="История"
        description="MonitoringProfile и MonitoringSession описывают правила записи TimeSeriesRecord по объектам."
      />
      <div className="space-y-5">
        <Alert type="warning">
          HistorianService и CSV export подготовлены в модели конфигурации, но запись TimeSeriesRecord будет отдельной стадией.
        </Alert>
        <Panel className="p-5" title="Профили мониторинга">
          {rows.length === 0 ? (
            <EmptyState title="Профили не настроены" description="Миграция создаёт базовые профили для объектов с recordable points." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(row) => row.id} rows={rows} />
          )}
        </Panel>
      </div>
    </section>
  );
}
