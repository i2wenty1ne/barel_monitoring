import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Asset } from '../../../../shared/types/config.types';
import { createUniqueId } from '../../../features/config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function AssetsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const currentConfig = config;
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
    },
    {
      key: 'actions',
      title: '',
      render: (asset) => {
        const hasLinks = asset.pointIds.length > 0 || asset.actuatorIds.length > 0;
        return (
          <div className="flex justify-end">
            <Button disabled={isSaving || hasLinks} onClick={() => void deleteAsset(asset)} variant="danger">
              Удалить
            </Button>
          </div>
        );
      }
    }
  ];

  async function save(nextConfig: typeof currentConfig, successMessage: string): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setSaveError(null);
    try {
      const result = await window.barrelMonitor.config.save(nextConfig);
      if (!result.success) {
        throw new Error(result.message ?? 'Не удалось сохранить config');
      }
      setMessage(successMessage);
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения config');
    } finally {
      setIsSaving(false);
    }
  }

  async function addBarrelAsset(): Promise<void> {
    const now = new Date().toISOString();
    const id = createUniqueId('barrel-1', currentConfig.assets.map((asset) => asset.id));
    await save(
      {
        ...currentConfig,
        assets: [
          ...currentConfig.assets,
          {
            id,
            name: 'Новая бочка',
            type: 'barrel',
            pointIds: [],
            actuatorIds: [],
            metadata: {
              active: true,
              visible: true,
              displayOrder: currentConfig.assets.length + 1,
              legacyCardSize: 'medium'
            },
            createdAt: now,
            updatedAt: now
          }
        ]
      },
      'Объект добавлен'
    );
  }

  async function deleteAsset(asset: Asset): Promise<void> {
    if (asset.pointIds.length > 0 || asset.actuatorIds.length > 0) {
      setSaveError('Объект содержит точки или механизмы. Сначала отвяжите их.');
      return;
    }

    await save(
      {
        ...currentConfig,
        assets: currentConfig.assets.filter((item) => item.id !== asset.id),
        barrels: currentConfig.barrels.filter((item) => item.id !== asset.id)
      },
      'Объект удален'
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Объекты"
        description="Asset-модель из SPEC 1.0.0: бочки, резервуары, насосы, весы, станции и другие промышленные объекты."
        actions={
          <Button disabled={isSaving} onClick={() => void addBarrelAsset()} variant="secondary">
            Добавить бочку
          </Button>
        }
      />
      <Panel className="p-5" title="Реестр объектов">
        {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
        {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
        {currentConfig.assets.length === 0 ? (
          <EmptyState title="Объекты не настроены" description="Добавьте Asset в конфигурации или выполните миграцию старого config." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(asset) => asset.id} rows={currentConfig.assets} />
        )}
      </Panel>
    </section>
  );
}
