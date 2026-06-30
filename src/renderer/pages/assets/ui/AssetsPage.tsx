import { Link } from 'react-router-dom';
import type { Asset } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function AssetsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<Asset>[] = [
    {
      key: 'name',
      title: 'Объект',
      render: (asset) => (
        <div>
          <Link className="font-medium text-teal-100 hover:text-teal-50" to={`/assets/${asset.id}`}>
            {asset.name}
          </Link>
          <div className="mt-1 font-mono text-xs text-slate-500">{asset.id}</div>
        </div>
      )
    },
    { key: 'type', title: 'Тип', render: (asset) => <Badge tone="info">{asset.type}</Badge> },
    { key: 'points', title: 'Точки', render: (asset) => asset.pointIds.length },
    { key: 'actuators', title: 'Механизмы', render: (asset) => asset.actuatorIds.length },
    {
      key: 'updated',
      title: 'Обновлено',
      render: (asset) => new Date(asset.updatedAt).toLocaleString('ru-RU')
    }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Объекты"
        description="Asset-модель из SPEC 1.0.0: бочки, резервуары, насосы, весы, станции и другие промышленные объекты."
      />
      <Panel className="p-5" title="Реестр объектов">
        {config.assets.length === 0 ? (
          <EmptyState title="Объекты не настроены" description="Добавьте Asset в конфигурации или выполните миграцию старого config." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(asset) => asset.id} rows={config.assets} />
        )}
      </Panel>
    </section>
  );
}
