import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Asset, AssetType } from '../../../../shared/types/config.types';
import { createUniqueId } from '../../../features/config-editor/model/config-editor.utils';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

const assetTypes: AssetType[] = [
  'tank',
  'barrel',
  'pump',
  'valve',
  'scale',
  'truck',
  'loadingStation',
  'indicator',
  'line',
  'room',
  'machine',
  'custom'
];

export function AssetsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Asset | null>(null);

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
      key: 'actions',
      title: '',
      render: (asset) => {
        const hasLinks = asset.pointIds.length > 0 || asset.actuatorIds.length > 0;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSaving} onClick={() => setDraft(asset)} variant="secondary">
              Редактировать
            </Button>
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

  async function addAsset(type: AssetType): Promise<void> {
    const now = new Date().toISOString();
    const id = createUniqueId(`${type}-1`, currentConfig.assets.map((asset) => asset.id));
    const asset = createDefaultAsset(id, type, currentConfig.assets.length + 1, now);
    await save({ ...currentConfig, assets: [...currentConfig.assets, asset] }, 'Объект добавлен');
    setDraft(asset);
  }

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }

    const now = new Date().toISOString();
    await save(
      {
        ...currentConfig,
        assets: currentConfig.assets.map((asset) => asset.id === draft.id ? { ...draft, updatedAt: now } : asset),
        points: currentConfig.points.map((point) => ({
          ...point,
          assetId: draft.pointIds.includes(point.id)
            ? draft.id
            : point.assetId === draft.id
              ? undefined
              : point.assetId
        })),
        actuators: currentConfig.actuators.map((actuator) => ({
          ...actuator,
          assetId: draft.actuatorIds.includes(actuator.id)
            ? draft.id
            : actuator.assetId === draft.id
              ? undefined
              : actuator.assetId
        }))
      },
      'Объект сохранен'
    );
    setDraft(null);
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
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={() => void addAsset('barrel')} variant="secondary">
              Добавить бочку
            </Button>
            <Button disabled={isSaving} onClick={() => void addAsset('pump')} variant="ghost">
              Добавить насос
            </Button>
            <Button disabled={isSaving} onClick={() => void addAsset('scale')} variant="ghost">
              Добавить весы
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        <Panel className="p-5" title="Реестр объектов">
          {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
          {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
          {currentConfig.assets.length === 0 ? (
            <EmptyState title="Объекты не настроены" description="Добавьте Asset в конфигурации или выполните миграцию старого config." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(asset) => asset.id} rows={currentConfig.assets} />
          )}
        </Panel>

        {draft ? (
          <Panel className="p-5" title={`Редактирование: ${draft.name}`}>
            <AssetForm
              actuators={currentConfig.actuators}
              draft={draft}
              onChange={setDraft}
              points={currentConfig.points}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={() => void saveDraft()} variant="secondary">
                Сохранить объект
              </Button>
              <Button disabled={isSaving} onClick={() => setDraft(null)} variant="ghost">
                Отмена
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function AssetForm({
  actuators,
  draft,
  onChange,
  points
}: {
  actuators: Array<{ id: string; name: string }>;
  draft: Asset;
  onChange: (asset: Asset) => void;
  points: Array<{ id: string; name: string }>;
}): React.JSX.Element {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput label="ID" onChange={(id) => onChange({ ...draft, id })} value={draft.id} />
        <TextInput label="Название" onChange={(name) => onChange({ ...draft, name })} value={draft.name} />
        <Select
          label="Тип"
          onChange={(type) => onChange({ ...draft, type })}
          options={assetTypes.map((type) => ({ label: type, value: type }))}
          value={draft.type}
        />
        <TextInput
          label="Описание"
          onChange={(description) => onChange({ ...draft, description: description || undefined })}
          value={draft.description ?? ''}
        />
        <NumberInput
          label="Объем, л"
          min={0}
          onChange={(maxVolumeL) => onChange({ ...draft, metadata: { ...draft.metadata, maxVolumeL } })}
          value={typeof draft.metadata?.maxVolumeL === 'number' ? draft.metadata.maxVolumeL : 0}
        />
        <NumberInput
          label="Высота, мм"
          min={0}
          onChange={(heightMm) => onChange({ ...draft, metadata: { ...draft.metadata, heightMm } })}
          value={typeof draft.metadata?.heightMm === 'number' ? draft.metadata.heightMm : 0}
        />
        <NumberInput
          label="Порядок"
          min={1}
          onChange={(displayOrder) => onChange({ ...draft, metadata: { ...draft.metadata, displayOrder } })}
          value={typeof draft.metadata?.displayOrder === 'number' ? draft.metadata.displayOrder : 1}
        />
      </div>

      <RelationEditor
        items={points}
        selectedIds={draft.pointIds}
        title="Точки данных"
        onChange={(pointIds) => onChange({ ...draft, pointIds })}
      />
      <RelationEditor
        items={actuators}
        selectedIds={draft.actuatorIds}
        title="Исполнительные механизмы"
        onChange={(actuatorIds) => onChange({ ...draft, actuatorIds })}
      />
    </div>
  );
}

function RelationEditor({
  items,
  onChange,
  selectedIds,
  title
}: {
  items: Array<{ id: string; name: string }>;
  onChange: (ids: string[]) => void;
  selectedIds: string[];
  title: string;
}): React.JSX.Element {
  return (
    <section className="rounded-md border border-white/10 bg-slate-950/35 p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-100">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">Нет доступных элементов.</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <Checkbox
              checked={selectedIds.includes(item.id)}
              key={item.id}
              label={item.name}
              hint={item.id}
              onChange={(checked) =>
                onChange(checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function createDefaultAsset(id: string, type: AssetType, displayOrder: number, now: string): Asset {
  return {
    id,
    name: getDefaultAssetName(type),
    type,
    pointIds: [],
    actuatorIds: [],
    metadata: {
      active: true,
      visible: true,
      displayOrder,
      legacyCardSize: 'medium'
    },
    createdAt: now,
    updatedAt: now
  };
}

function getDefaultAssetName(type: AssetType): string {
  if (type === 'barrel') {
    return 'Новая бочка';
  }

  if (type === 'pump') {
    return 'Насос';
  }

  if (type === 'scale') {
    return 'Весы';
  }

  return 'Новый объект';
}
