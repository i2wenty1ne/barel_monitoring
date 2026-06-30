import { useState } from 'react';
import type { Point } from '../../../../shared/types/config.types';
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

export function PointsPage(): React.JSX.Element {
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
    { key: 'asset', title: 'Asset', render: (point) => point.assetId ?? '—' },
    { key: 'source', title: 'DataSource', render: (point) => point.dataSourceId ?? '—' },
    { key: 'valueType', title: 'Тип', render: (point) => point.valueType },
    { key: 'address', title: 'Адрес', render: formatAddress },
    { key: 'recordable', title: 'История', render: (point) => (point.recordable ? 'пишется' : 'нет') },
    {
      key: 'actions',
      title: '',
      render: (point) => (
        <div className="flex justify-end">
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
    const point: Point = {
      id,
      name: 'Новая telemetry point',
      kind: 'telemetry',
      assetId: asset?.id,
      dataSourceId: dataSource.id,
      valueType: 'uint16',
      rawUnit: 'raw',
      displayUnit: 'raw',
      address: {
        protocol: 'modbus',
        slaveId: typeof dataSource.metadata?.slaveId === 'number' ? dataSource.metadata.slaveId : 1,
        area: 'holding-register',
        functionCode: 3,
        registerAddress: 0,
        registerCount: 1,
        valueType: 'uint16',
        byteOrder: 'ABCD'
      },
      scaling: { type: 'none' },
      recordable: true,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

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
        channels: currentConfig.channels.filter((channel) => channel.id !== point.id)
      },
      'Точка данных удалена'
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Точки данных"
        description="TelemetryPoint и ControlPoint: универсальные читаемые и управляемые точки поверх источников данных."
        actions={
          <Button disabled={isSaving} onClick={() => void addTelemetryPoint()} variant="secondary">
            Добавить telemetry
          </Button>
        }
      />
      <Panel className="p-5" title="Points">
        {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
        {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
        {currentConfig.points.length === 0 ? (
          <EmptyState title="Точки не настроены" description="Миграция channels создаёт telemetry points автоматически." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(point) => point.id} maxHeight="620px" rows={currentConfig.points} />
        )}
      </Panel>
    </section>
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
