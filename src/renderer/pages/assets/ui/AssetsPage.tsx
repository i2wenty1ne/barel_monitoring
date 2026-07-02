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
import { Modal } from '../../../shared/ui/Modal';
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

type AssetFormState = {
  draft: Asset;
  mode: 'create' | 'edit';
  originalId: string;
};

export function AssetsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<AssetFormState | null>(null);

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
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSaving} onClick={() => openEditAsset(asset)} variant="secondary">
              Редактировать
            </Button>
            <Button disabled={isSaving} onClick={() => void deleteAsset(asset)} variant="danger">
              Удалить
            </Button>
          </div>
        );
      }
    }
  ];

  async function save(nextConfig: typeof currentConfig, successMessage: string): Promise<boolean> {
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
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения config');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function openCreateAsset(type: AssetType): void {
    const now = new Date().toISOString();
    const id = createUniqueId(`${type}-1`, currentConfig.assets.map((asset) => asset.id));
    const asset = createDefaultAsset(id, type, currentConfig.assets.length + 1, now);
    setFormState({ draft: asset, mode: 'create', originalId: id });
    setMessage(null);
    setSaveError(null);
  }

  function openEditAsset(asset: Asset): void {
    setFormState({ draft: cloneAsset(asset), mode: 'edit', originalId: asset.id });
    setMessage(null);
    setSaveError(null);
  }

  async function saveDraft(): Promise<void> {
    if (!formState) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedDraft = { ...normalizeAssetDraft(formState.draft), updatedAt: now };
    const nextAssets = formState.mode === 'create'
      ? [...currentConfig.assets, normalizedDraft]
      : currentConfig.assets.map((asset) => asset.id === formState.originalId ? normalizedDraft : asset);
    const saved = await save(
      {
        ...currentConfig,
        assets: nextAssets,
        points: currentConfig.points.map((point) => ({
          ...point,
          assetId: normalizedDraft.pointIds.includes(point.id)
            ? normalizedDraft.id
            : point.assetId === formState.originalId
              ? undefined
              : point.assetId
        })),
        actuators: currentConfig.actuators.map((actuator) => ({
          ...actuator,
          assetId: normalizedDraft.actuatorIds.includes(actuator.id)
            ? normalizedDraft.id
            : actuator.assetId === formState.originalId
              ? undefined
              : actuator.assetId
        }))
      },
      formState.mode === 'create' ? 'Объект добавлен' : 'Объект сохранен'
    );
    if (saved) {
      setFormState(null);
    }
  }

  async function deleteAsset(asset: Asset): Promise<void> {
    await save(
      {
        ...currentConfig,
        assets: currentConfig.assets
          .filter((item) => item.id !== asset.id)
          .map((item) => ({
            ...item,
            parentAssetId: item.parentAssetId === asset.id ? undefined : item.parentAssetId,
            childAssetIds: item.childAssetIds?.filter((childAssetId) => childAssetId !== asset.id)
          })),
        points: currentConfig.points.map((point) => (
          point.assetId === asset.id ? { ...point, assetId: undefined } : point
        )),
        actuators: currentConfig.actuators.map((actuator) => (
          actuator.assetId === asset.id ? { ...actuator, assetId: undefined } : actuator
        )),
        monitoringProfiles: currentConfig.monitoringProfiles.filter((profile) => profile.assetId !== asset.id)
      },
      'Объект удален'
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="Объекты"
        description="Модель объектов из SPEC 1.0.0: бочки, резервуары, насосы, весы, станции и другие промышленные объекты."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={() => openCreateAsset('barrel')} variant="secondary">
              Добавить бочку
            </Button>
            <Button disabled={isSaving} onClick={() => openCreateAsset('pump')} variant="ghost">
              Добавить насос
            </Button>
            <Button disabled={isSaving} onClick={() => openCreateAsset('scale')} variant="ghost">
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
            <EmptyState title="Объекты не настроены" description="Добавьте Asset в конфигурации." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(asset) => asset.id} rows={currentConfig.assets} />
          )}
        </Panel>
      </div>
      {formState ? (
        <Modal
          footer={
            <>
              <Button disabled={isSaving} onClick={() => void saveDraft()} variant="secondary">
                {formState.mode === 'create' ? 'Создать объект' : 'Сохранить объект'}
              </Button>
              <Button disabled={isSaving} onClick={() => setFormState(null)} variant="ghost">
                Отмена
              </Button>
            </>
          }
          isCloseDisabled={isSaving}
          onClose={() => setFormState(null)}
          title={formState.mode === 'create' ? `Создание: ${formState.draft.name}` : `Редактирование: ${formState.draft.name}`}
        >
          <AssetForm
            actuators={currentConfig.actuators}
            draft={formState.draft}
            onChange={(draft) => setFormState((current) => current ? { ...current, draft } : current)}
            points={currentConfig.points}
          />
        </Modal>
      ) : null}
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
  points: Array<{ id: string; name: string; kind: string; assetId?: string }>;
}): React.JSX.Element {
  const isTankLike = draft.type === 'barrel' || draft.type === 'tank';
  const levelPointId = getMetadataPointId(draft, 'levelPointId');
  const temperaturePointId = getMetadataPointId(draft, 'temperaturePointId');
  const volumePointId = getMetadataPointId(draft, 'volumePointId');
  const linkedPointIds = new Set([
    ...draft.pointIds,
    ...points.filter((point) => point.assetId === draft.id).map((point) => point.id),
    ...(levelPointId ? [levelPointId] : []),
    ...(temperaturePointId ? [temperaturePointId] : []),
    ...(volumePointId ? [volumePointId] : [])
  ]);
  const linkedTelemetryPoints = points.filter((point) => point.kind === 'telemetry' && linkedPointIds.has(point.id));

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

      {isTankLike ? (
        <TankPointRoleEditor
          draft={draft}
          onChange={onChange}
          points={linkedTelemetryPoints}
        />
      ) : null}

      <RelationEditor
        items={points}
        selectedIds={draft.pointIds}
        title="Точки данных"
        onChange={(pointIds) => onChange(updateAssetPointIds(draft, pointIds))}
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

function TankPointRoleEditor({
  draft,
  onChange,
  points
}: {
  draft: Asset;
  onChange: (asset: Asset) => void;
  points: Array<{ id: string; name: string }>;
}): React.JSX.Element {
  const options = [
    { label: 'Не выбрано', value: '' },
    ...points.map((point) => ({ label: `${point.name} (${point.id})`, value: point.id }))
  ];
  const levelPointId = typeof draft.metadata?.levelPointId === 'string' ? draft.metadata.levelPointId : '';
  const temperaturePointId = typeof draft.metadata?.temperaturePointId === 'string' ? draft.metadata.temperaturePointId : '';
  const volumePointId = typeof draft.metadata?.volumePointId === 'string' ? draft.metadata.volumePointId : '';

  return (
    <section className="rounded-md border border-white/10 bg-slate-950/35 p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-100">Отображение бочки</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Select
          label="Точка заполнения"
          hint="Используется для уровня в виджете бочки"
          onChange={(levelPointId) => onChange(updatePointRole(draft, 'levelPointId', levelPointId))}
          options={options}
          value={levelPointId}
        />
        <Select
          label="Точка температуры"
          hint="Используется для температуры в карточке"
          onChange={(temperaturePointId) => onChange(updatePointRole(draft, 'temperaturePointId', temperaturePointId))}
          options={options}
          value={temperaturePointId}
        />
        <Select
          label="Точка объема"
          hint="Показывается под заполненностью"
          onChange={(volumePointId) => onChange(updatePointRole(draft, 'volumePointId', volumePointId))}
          options={options}
          value={volumePointId}
        />
      </div>
    </section>
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
      cardSize: 'medium'
    },
    createdAt: now,
    updatedAt: now
  };
}

function cloneAsset(asset: Asset): Asset {
  return {
    ...asset,
    pointIds: [...asset.pointIds],
    actuatorIds: [...asset.actuatorIds],
    childAssetIds: asset.childAssetIds ? [...asset.childAssetIds] : undefined,
    metadata: { ...asset.metadata }
  };
}

function normalizeAssetDraft(asset: Asset): Asset {
  const levelPointId = getMetadataPointId(asset, 'levelPointId');
  const temperaturePointId = getMetadataPointId(asset, 'temperaturePointId');
  const volumePointId = getMetadataPointId(asset, 'volumePointId');
  const pointIds = new Set(asset.pointIds);
  if (levelPointId) {
    pointIds.add(levelPointId);
  }
  if (temperaturePointId) {
    pointIds.add(temperaturePointId);
  }
  if (volumePointId) {
    pointIds.add(volumePointId);
  }

  return {
    ...asset,
    pointIds: [...pointIds],
    metadata: { ...asset.metadata }
  };
}

function updateAssetPointIds(asset: Asset, pointIds: string[]): Asset {
  const selectedIds = new Set(pointIds);
  const metadata = { ...asset.metadata };
  const levelPointId = getMetadataPointId(asset, 'levelPointId');
  const temperaturePointId = getMetadataPointId(asset, 'temperaturePointId');
  const volumePointId = getMetadataPointId(asset, 'volumePointId');

  if (levelPointId && !selectedIds.has(levelPointId)) {
    delete metadata.levelPointId;
  }

  if (temperaturePointId && !selectedIds.has(temperaturePointId)) {
    delete metadata.temperaturePointId;
  }

  if (volumePointId && !selectedIds.has(volumePointId)) {
    delete metadata.volumePointId;
  }

  return {
    ...asset,
    pointIds,
    metadata
  };
}

function updatePointRole(asset: Asset, key: 'levelPointId' | 'temperaturePointId' | 'volumePointId', pointId: string): Asset {
  const metadata = { ...asset.metadata };
  if (pointId) {
    metadata[key] = pointId;
  } else {
    delete metadata[key];
  }

  return {
    ...asset,
    metadata
  };
}

function getMetadataPointId(asset: Asset, key: 'levelPointId' | 'temperaturePointId' | 'volumePointId'): string | null {
  const value = asset.metadata?.[key];
  return typeof value === 'string' && value ? value : null;
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
