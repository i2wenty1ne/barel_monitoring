import { useState } from 'react';
import type { ModbusNumericValueType, Point, PointValueType, ScalingConfig } from '../../../../shared/types/config.types';
import type { ManualReadResult } from '../../../../shared/types/monitoring.types';
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

export function PointsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Point | null>(null);
  const [manualReadResult, setManualReadResult] = useState<ManualReadResult | null>(null);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const currentConfig = config;
  const columns: DataTableColumn<Point>[] = [
    {
      key: 'name',
      title: 'Точка',
      render: (point) => (
        <div>
          <div className="font-medium text-slate-100">{point.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{point.id}</div>
        </div>
      )
    },
    { key: 'kind', title: 'Kind', render: (point) => <Badge tone={point.kind === 'control' ? 'warning' : 'success'}>{point.kind}</Badge> },
    { key: 'asset', title: 'Asset', render: (point) => currentConfig.assets.find((asset) => asset.id === point.assetId)?.name ?? point.assetId ?? '—' },
    { key: 'source', title: 'DataSource', render: (point) => currentConfig.dataSources.find((source) => source.id === point.dataSourceId)?.name ?? point.dataSourceId ?? '—' },
    { key: 'valueType', title: 'Тип', render: (point) => point.valueType },
    { key: 'address', title: 'Адрес', render: formatAddress },
    { key: 'recordable', title: 'История', render: (point) => (point.recordable ? 'пишется' : 'нет') },
    {
      key: 'actions',
      title: '',
      render: (point) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isSaving} onClick={() => setDraft(point)} variant="secondary">
            Редактировать
          </Button>
          <Button disabled={isSaving || !canManualRead(point)} onClick={() => void manualRead(point)} variant="ghost">
            Read
          </Button>
          <Button disabled={isSaving} onClick={() => void deletePoint(point)} variant="danger">
            Удалить
          </Button>
        </div>
      )
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

  async function addTelemetryPoint(): Promise<void> {
    const dataSource = currentConfig.dataSources.find((source) => source.enabled) ?? currentConfig.dataSources[0];
    const asset = currentConfig.assets[0];

    if (!dataSource) {
      setSaveError('Сначала добавьте источник данных.');
      return;
    }

    const now = new Date().toISOString();
    const id = createUniqueId('telemetry-point-1', currentConfig.points.map((point) => point.id));
    const point = createDefaultTelemetryPoint(id, dataSource.id, asset?.id, now, getDefaultSlaveId(dataSource));
    await save(
      {
        ...currentConfig,
        points: [...currentConfig.points, point],
        assets: asset
          ? currentConfig.assets.map((item) =>
              item.id === asset.id ? { ...item, pointIds: [...new Set([...item.pointIds, id])], updatedAt: now } : item
            )
          : currentConfig.assets
      },
      'Telemetry point добавлена'
    );
    setDraft(point);
  }

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }

    const now = new Date().toISOString();
    await save(
      {
        ...currentConfig,
        points: currentConfig.points.map((point) => point.id === draft.id ? { ...draft, updatedAt: now } : point),
        assets: currentConfig.assets.map((asset) => {
          const withoutPoint = asset.pointIds.filter((pointId) => pointId !== draft.id);
          return asset.id === draft.assetId
            ? { ...asset, pointIds: [...withoutPoint, draft.id], updatedAt: now }
            : { ...asset, pointIds: withoutPoint, updatedAt: now };
        })
      },
      'Точка данных сохранена'
    );
    setDraft(null);
  }

  async function deletePoint(point: Point): Promise<void> {
    await save(
      {
        ...currentConfig,
        points: currentConfig.points.filter((item) => item.id !== point.id),
        assets: currentConfig.assets.map((asset) => ({
          ...asset,
          pointIds: asset.pointIds.filter((pointId) => pointId !== point.id)
        })),
        monitoringProfiles: currentConfig.monitoringProfiles.map((profile) => ({
          ...profile,
          pointConfigs: profile.pointConfigs.filter((pointConfig) => pointConfig.pointId !== point.id)
        })),
        actuators: currentConfig.actuators.map((actuator) => ({
          ...actuator,
          commandPointIds: actuator.commandPointIds.filter((pointId) => pointId !== point.id),
          feedbackPointIds: actuator.feedbackPointIds.filter((pointId) => pointId !== point.id)
        }))
      },
      'Точка данных удалена'
    );
  }

  async function manualRead(point: Point): Promise<void> {
    if (!canManualRead(point) || point.address?.protocol !== 'modbus' || !point.dataSourceId) {
      return;
    }

    setIsSaving(true);
    setManualReadResult(null);
    setSaveError(null);
    try {
      const modbusFunction = point.address.functionCode === 3 ? 3 : point.address.functionCode === 4 ? 4 : null;
      if (!modbusFunction) {
        throw new Error('Manual read поддерживает только функции 3 и 4.');
      }

      const result = await window.barrelMonitor.monitoring.readRegisters({
        dataSourceId: point.dataSourceId,
        modbusFunction,
        registerAddress: point.address.registerAddress ?? 0,
        registerCount: point.address.registerCount ?? 1,
        dataType: point.valueType as ModbusNumericValueType,
        byteOrder: point.address.byteOrder ?? 'ABCD'
      });
      setManualReadResult(result);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка ручного чтения');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="Точки данных"
        description="Точки телеметрии и управления поверх источников данных."
        actions={
          <Button disabled={isSaving} onClick={() => void addTelemetryPoint()} variant="secondary">
            Добавить telemetry
          </Button>
        }
      />
      <div className="space-y-5">
        <Panel className="p-5" title="Точки">
          {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
          {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
          {manualReadResult ? (
            <div className="mb-4">
              <Alert type={manualReadResult.success ? 'success' : 'error'}>
                Manual read: {manualReadResult.message}. Registers: {manualReadResult.registers?.join(', ') ?? '—'}.
                Decoded: {manualReadResult.decodedValue ?? '—'}
              </Alert>
            </div>
          ) : null}
          {currentConfig.points.length === 0 ? (
            <EmptyState title="Точки не настроены" description="Добавьте telemetry point или импортируйте регистры через диагностику." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(point) => point.id} maxHeight="620px" rows={currentConfig.points} />
          )}
        </Panel>

        {draft ? (
          <Panel className="p-5" title={`Редактирование: ${draft.name}`}>
            <PointForm
              assets={currentConfig.assets}
              dataSources={currentConfig.dataSources}
              draft={draft}
              onChange={setDraft}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={() => void saveDraft()} variant="secondary">
                Сохранить точку
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

function PointForm({
  assets,
  dataSources,
  draft,
  onChange
}: {
  assets: Array<{ id: string; name: string }>;
  dataSources: Array<{ id: string; name: string; metadata?: Record<string, unknown> }>;
  draft: Point;
  onChange: (point: Point) => void;
}): React.JSX.Element {
  const address = draft.address?.protocol === 'modbus' ? draft.address : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput label="ID" onChange={(id) => onChange({ ...draft, id })} value={draft.id} />
        <TextInput label="Название" onChange={(name) => onChange({ ...draft, name })} value={draft.name} />
        <Select
          label="Тип точки"
          onChange={(kind) => onChange({ ...draft, kind })}
          options={[{ label: 'telemetry', value: 'telemetry' }, { label: 'control', value: 'control' }, { label: 'calculated', value: 'calculated' }]}
          value={draft.kind}
        />
        <Select
          label="Объект"
          onChange={(assetId) => onChange({ ...draft, assetId: assetId || undefined })}
          options={[{ label: '—', value: '' }, ...assets.map((asset) => ({ label: asset.name, value: asset.id }))]}
          value={draft.assetId ?? ''}
        />
        <Select
          label="Источник данных"
          onChange={(dataSourceId) => onChange({ ...draft, dataSourceId: dataSourceId || undefined })}
          options={[{ label: '—', value: '' }, ...dataSources.map((source) => ({ label: source.name, value: source.id }))]}
          value={draft.dataSourceId ?? ''}
        />
        <Select
          label="Тип значения"
          onChange={(valueType) => onChange(updateValueType(draft, valueType))}
          options={[
            { label: 'boolean', value: 'boolean' },
            { label: 'uint16', value: 'uint16' },
            { label: 'int16', value: 'int16' },
            { label: 'uint32', value: 'uint32' },
            { label: 'int32', value: 'int32' },
            { label: 'float32', value: 'float32' },
            { label: 'string', value: 'string' }
          ]}
          value={draft.valueType}
        />
        <TextInput label="Сырая единица" onChange={(rawUnit) => onChange({ ...draft, rawUnit })} value={draft.rawUnit ?? ''} />
        <TextInput label="Единица отображения" onChange={(displayUnit) => onChange({ ...draft, displayUnit })} value={draft.displayUnit ?? ''} />
        <Checkbox checked={draft.enabled} label="Включена" onChange={(enabled) => onChange({ ...draft, enabled })} />
        <Checkbox checked={draft.recordable} label="Писать в историю" onChange={(recordable) => onChange({ ...draft, recordable })} />
      </div>

      {address ? (
        <div className="grid gap-4 rounded-md border border-white/10 bg-slate-950/35 p-4 md:grid-cols-3">
          <NumberInput label="Адрес Modbus" min={1} max={247} onChange={(slaveId) => onChange({ ...draft, address: { ...address, slaveId } })} value={address.slaveId} />
          <Select
            label="Область"
            onChange={(area) => onChange({ ...draft, address: { ...address, area, functionCode: area === 'holding-register' ? 3 : area === 'input-register' ? 4 : area === 'coil' ? 1 : 2 } })}
            options={[
              { label: 'holding-register', value: 'holding-register' },
              { label: 'input-register', value: 'input-register' },
              { label: 'coil', value: 'coil' },
              { label: 'discrete-input', value: 'discrete-input' }
            ]}
            value={address.area}
          />
          <Select<1 | 2 | 3 | 4>
            label="Функция"
            onChange={(functionCode) => onChange({ ...draft, address: { ...address, functionCode } })}
            options={([1, 2, 3, 4] as Array<1 | 2 | 3 | 4>).map((value) => ({ label: String(value), value }))}
            value={address.functionCode === 1 || address.functionCode === 2 || address.functionCode === 3 || address.functionCode === 4 ? address.functionCode : 3}
          />
          <NumberInput label="Регистр" min={0} onChange={(registerAddress) => onChange({ ...draft, address: { ...address, registerAddress } })} value={address.registerAddress ?? 0} />
          <NumberInput label="Адрес coil" min={0} onChange={(coilAddress) => onChange({ ...draft, address: { ...address, coilAddress } })} value={address.coilAddress ?? 0} />
          <NumberInput label="Количество" min={1} max={8} onChange={(registerCount) => onChange({ ...draft, address: { ...address, registerCount } })} value={address.registerCount ?? 1} />
          <Select
            label="Порядок байтов"
            onChange={(byteOrder) => onChange({ ...draft, address: { ...address, byteOrder } })}
            options={[{ label: 'ABCD', value: 'ABCD' }, { label: 'CDAB', value: 'CDAB' }, { label: 'BADC', value: 'BADC' }, { label: 'DCBA', value: 'DCBA' }]}
            value={address.byteOrder ?? 'ABCD'}
          />
        </div>
      ) : null}

      <ScalingEditor draft={draft} onChange={onChange} />
      <ThresholdEditor draft={draft} onChange={onChange} />
    </div>
  );
}

function ScalingEditor({ draft, onChange }: { draft: Point; onChange: (point: Point) => void }): React.JSX.Element {
  const scaling = draft.scaling ?? { type: 'none' };

  return (
    <div className="grid gap-4 rounded-md border border-white/10 bg-slate-950/35 p-4 md:grid-cols-3">
      <Select
        label="Масштабирование"
        onChange={(type) => onChange({ ...draft, scaling: createScaling(type) })}
        options={[{ label: 'none', value: 'none' }, { label: 'linear', value: 'linear' }, { label: 'factor', value: 'factor' }]}
        value={scaling.type}
      />
      {scaling.type === 'linear' ? (
        <>
          <NumberInput label="Сырой минимум" onChange={(rawMin) => onChange({ ...draft, scaling: { ...scaling, rawMin } })} value={scaling.rawMin} />
          <NumberInput label="Сырой максимум" onChange={(rawMax) => onChange({ ...draft, scaling: { ...scaling, rawMax } })} value={scaling.rawMax} />
          <NumberInput label="Минимум отображения" onChange={(displayMin) => onChange({ ...draft, scaling: { ...scaling, displayMin } })} value={scaling.displayMin} />
          <NumberInput label="Максимум отображения" onChange={(displayMax) => onChange({ ...draft, scaling: { ...scaling, displayMax } })} value={scaling.displayMax} />
          <Checkbox checked={scaling.clamp ?? false} label="Ограничивать диапазон" onChange={(clamp) => onChange({ ...draft, scaling: { ...scaling, clamp } })} />
        </>
      ) : null}
      {scaling.type === 'factor' ? (
        <>
          <NumberInput label="Коэффициент" step={0.01} onChange={(factor) => onChange({ ...draft, scaling: { ...scaling, factor } })} value={scaling.factor} />
          <NumberInput label="Смещение" step={0.01} onChange={(offset) => onChange({ ...draft, scaling: { ...scaling, offset } })} value={scaling.offset ?? 0} />
        </>
      ) : null}
    </div>
  );
}

function ThresholdEditor({ draft, onChange }: { draft: Point; onChange: (point: Point) => void }): React.JSX.Element {
  const thresholds = draft.thresholds ?? {};

  return (
    <div className="grid gap-4 rounded-md border border-white/10 bg-slate-950/35 p-4 md:grid-cols-4">
      <NumberInput label="Нижняя авария" onChange={(alarmLow) => onChange({ ...draft, thresholds: { ...thresholds, alarmLow } })} value={thresholds.alarmLow ?? 0} />
      <NumberInput label="Нижнее предупреждение" onChange={(warningLow) => onChange({ ...draft, thresholds: { ...thresholds, warningLow } })} value={thresholds.warningLow ?? 0} />
      <NumberInput label="Верхнее предупреждение" onChange={(warningHigh) => onChange({ ...draft, thresholds: { ...thresholds, warningHigh } })} value={thresholds.warningHigh ?? 100} />
      <NumberInput label="Верхняя авария" onChange={(alarmHigh) => onChange({ ...draft, thresholds: { ...thresholds, alarmHigh } })} value={thresholds.alarmHigh ?? 100} />
    </div>
  );
}

function formatAddress(point: Point): React.ReactNode {
  if (point.address?.protocol !== 'modbus') {
    return point.address?.protocol ?? '—';
  }

  const address = point.address.registerAddress ?? point.address.coilAddress ?? 0;
  return (
    <span className="font-mono text-xs">
      slave {point.address.slaveId} · fn {point.address.functionCode} · {point.address.area} {address}
    </span>
  );
}

function canManualRead(point: Point): boolean {
  return (
    point.kind === 'telemetry' &&
    point.address?.protocol === 'modbus' &&
    (point.address.functionCode === 3 || point.address.functionCode === 4) &&
    point.dataSourceId !== undefined &&
    point.valueType !== 'boolean' &&
    point.valueType !== 'string'
  );
}

function createDefaultTelemetryPoint(id: string, dataSourceId: string, assetId: string | undefined, now: string, slaveId: number): Point {
  return {
    id,
    name: 'Новая telemetry point',
    kind: 'telemetry',
    assetId,
    dataSourceId,
    valueType: 'uint16',
    rawUnit: 'raw',
    displayUnit: 'raw',
    address: { protocol: 'modbus', slaveId, area: 'holding-register', functionCode: 3, registerAddress: 0, registerCount: 1, valueType: 'uint16', byteOrder: 'ABCD' },
    scaling: { type: 'none' },
    recordable: true,
    enabled: true,
    createdAt: now,
    updatedAt: now
  };
}

function updateValueType(point: Point, valueType: PointValueType): Point {
  if (point.address?.protocol !== 'modbus') {
    return { ...point, valueType };
  }

  const addressValueType = valueType === 'string' ? 'uint16' : valueType;
  return {
    ...point,
    valueType,
    address: {
      ...point.address,
      valueType: addressValueType,
      registerCount: valueType === 'float32' || valueType === 'uint32' || valueType === 'int32' ? 2 : 1
    }
  };
}

function createScaling(type: ScalingConfig['type']): ScalingConfig {
  if (type === 'linear') {
    return { type: 'linear', rawMin: 0, rawMax: 100, displayMin: 0, displayMax: 100, clamp: true };
  }

  if (type === 'factor') {
    return { type: 'factor', factor: 1, offset: 0 };
  }

  return { type: 'none' };
}

function getDefaultSlaveId(source: { metadata?: Record<string, unknown> }): number {
  return typeof source.metadata?.slaveId === 'number' ? source.metadata.slaveId : 1;
}
