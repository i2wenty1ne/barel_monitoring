import { useState } from 'react';
import type { Actuator, ControlPoint } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { createUniqueId } from '../../../features/config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function ActuatorsPage(): React.JSX.Element {
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
  const columns: DataTableColumn<Actuator>[] = [
    { key: 'name', title: 'Механизм', render: (item) => <div><div className="font-medium text-slate-100">{item.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div></div> },
    { key: 'type', title: 'Тип', render: (item) => <Badge tone="info">{item.type}</Badge> },
    { key: 'asset', title: 'Asset', render: (item) => item.assetId ?? '—' },
    { key: 'commands', title: 'Команды', render: (item) => item.supportedCommands.join(', ') || '—' },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'warning'}>{item.enabled ? 'Включен' : 'Отключен'}</Badge> },
    {
      key: 'actions',
      title: '',
      render: (item) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isSaving} onClick={() => void executeSimulationCommand(item)} variant="ghost">
            Тест start
          </Button>
          <Button disabled={isSaving} onClick={() => void deleteActuator(item)} variant="danger">
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

  async function addPumpActuator(): Promise<void> {
    const dataSource = currentConfig.dataSources.find((source) => source.enabled) ?? currentConfig.dataSources[0];
    const pumpAsset = currentConfig.assets.find((asset) => asset.type === 'pump');
    const now = new Date().toISOString();
    const actuatorId = createUniqueId('pump-actuator-1', currentConfig.actuators.map((item) => item.id));
    const commandPointId = `${actuatorId}-run-command`;
    const commandPoint: ControlPoint = {
      id: commandPointId,
      name: 'Включить/выключить насос',
      kind: 'control',
      assetId: pumpAsset?.id,
      dataSourceId: dataSource?.id,
      valueType: 'boolean',
      recordable: false,
      enabled: true,
      allowedValues: [true, false],
      requiresConfirmation: true,
      safetyLevel: 'dangerous',
      writeAddress: {
        protocol: 'modbus',
        slaveId: typeof dataSource?.metadata?.slaveId === 'number' ? dataSource.metadata.slaveId : 1,
        area: 'coil',
        functionCode: 5,
        coilAddress: 0,
        valueType: 'boolean'
      },
      createdAt: now,
      updatedAt: now
    };
    const actuator: Actuator = {
      id: actuatorId,
      name: 'Насос',
      type: 'pump',
      assetId: pumpAsset?.id,
      commandPointIds: [commandPointId],
      feedbackPointIds: [],
      supportedCommands: ['start', 'stop'],
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    await save(
      {
        ...currentConfig,
        actuators: [...currentConfig.actuators, actuator],
        points: [...currentConfig.points, commandPoint],
        assets: pumpAsset
          ? currentConfig.assets.map((asset) =>
              asset.id === pumpAsset.id
                ? { ...asset, actuatorIds: [...new Set([...asset.actuatorIds, actuatorId])], updatedAt: now }
                : asset
            )
          : currentConfig.assets
      },
      'Исполнительный механизм добавлен'
    );
  }

  async function deleteActuator(actuator: Actuator): Promise<void> {
    const pointIds = new Set([...actuator.commandPointIds, ...actuator.feedbackPointIds]);
    await save(
      {
        ...currentConfig,
        actuators: currentConfig.actuators.filter((item) => item.id !== actuator.id),
        points: currentConfig.points.filter((point) => !pointIds.has(point.id)),
        assets: currentConfig.assets.map((asset) => ({
          ...asset,
          actuatorIds: asset.actuatorIds.filter((actuatorId) => actuatorId !== actuator.id),
          pointIds: asset.pointIds.filter((pointId) => !pointIds.has(pointId))
        }))
      },
      'Исполнительный механизм удален'
    );
  }

  async function executeSimulationCommand(actuator: Actuator): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setSaveError(null);
    try {
      const result = await window.barrelMonitor.commands.execute({
        actuatorId: actuator.id,
        commandType: actuator.supportedCommands.includes('start') ? 'start' : actuator.supportedCommands[0] ?? 'custom',
        value: true,
        confirmed: true,
        requestedBy: 'operator'
      });
      if (!result.success) {
        throw new Error(result.error ?? 'Команда не выполнена');
      }
      setMessage('Simulation command выполнена и записана в журнал команд');
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка выполнения команды');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Исполнительные механизмы"
        description="Actuator-модель для насосов, клапанов, реле, индикаторов и безопасных команд управления."
        actions={
          <Button disabled={isSaving} onClick={() => void addPumpActuator()} variant="secondary">
            Добавить насос
          </Button>
        }
      />
      <Panel className="p-5" title="Actuators">
        {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
        {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
        {currentConfig.actuators.length === 0 ? (
          <EmptyState title="Механизмы ещё не настроены" description="Реальные write-команды выключены по умолчанию; следующий шаг — simulation commands и interlocks." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(item) => item.id} rows={currentConfig.actuators} />
        )}
      </Panel>
    </section>
  );
}
