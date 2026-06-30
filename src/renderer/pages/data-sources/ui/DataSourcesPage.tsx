import { useState } from 'react';
import type { DataSource } from '../../../../shared/types/config.types';
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

export function DataSourcesPage(): React.JSX.Element {
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
  const columns: DataTableColumn<DataSource>[] = [
    {
      key: 'name',
      title: 'Источник',
      render: (source) => (
        <div>
          <div className="font-medium text-slate-100">{source.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{source.id}</div>
        </div>
      )
    },
    { key: 'type', title: 'Тип', render: (source) => <Badge tone="info">{source.type}</Badge> },
    { key: 'enabled', title: 'Статус', render: (source) => <Badge tone={source.enabled ? 'success' : 'warning'}>{source.enabled ? 'Включен' : 'Отключен'}</Badge> },
    { key: 'connection', title: 'Подключение', render: formatConnection },
    { key: 'polling', title: 'Опрос', render: (source) => `${source.pollingIntervalMs ?? currentConfig.app.pollingIntervalMs} ms` },
    {
      key: 'actions',
      title: '',
      render: (source) => {
        const isUsed = currentConfig.points.some((point) => point.dataSourceId === source.id);
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSaving} onClick={() => void toggleSource(source)} variant="ghost">
              {source.enabled ? 'Отключить' : 'Включить'}
            </Button>
            <Button disabled={isSaving || isUsed} onClick={() => void deleteSource(source)} variant="danger">
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

  async function addModbusSource(): Promise<void> {
    const now = new Date().toISOString();
    const id = createUniqueId('modbus-rtu-1', currentConfig.dataSources.map((source) => source.id));
    await save(
      {
        ...currentConfig,
        dataSources: [
          ...currentConfig.dataSources,
          {
            id,
            name: 'Modbus RTU источник',
            type: 'modbus-rtu',
            enabled: true,
            connection: {
              type: 'modbus-rtu',
              port: 'COM3',
              baudRate: 115200,
              dataBits: 8,
              stopBits: 1,
              parity: 'none'
            },
            pollingIntervalMs: currentConfig.app.pollingIntervalMs,
            timeoutMs: 1000,
            retryCount: 1,
            metadata: {
              model: 'Modbus RTU',
              slaveId: 1
            },
            createdAt: now,
            updatedAt: now
          }
        ]
      },
      'Источник данных добавлен'
    );
  }

  async function toggleSource(source: DataSource): Promise<void> {
    await save(
      {
        ...currentConfig,
        dataSources: currentConfig.dataSources.map((item) =>
          item.id === source.id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item
        )
      },
      source.enabled ? 'Источник отключен' : 'Источник включен'
    );
  }

  async function deleteSource(source: DataSource): Promise<void> {
    if (currentConfig.points.some((point) => point.dataSourceId === source.id)) {
      setSaveError('Источник используется точками данных. Сначала переназначьте или удалите точки.');
      return;
    }

    await save(
      {
        ...currentConfig,
        dataSources: currentConfig.dataSources.filter((item) => item.id !== source.id),
        devices: currentConfig.devices.filter((item) => item.id !== source.id)
      },
      'Источник данных удален'
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Источники данных"
        description="DataSource описывает источник live-значений и команд: Modbus RTU, mock, manual и будущие TCP/HTTP/MQTT."
        actions={
          <Button disabled={isSaving} onClick={() => void addModbusSource()} variant="secondary">
            Добавить Modbus RTU
          </Button>
        }
      />
      <Panel className="p-5" title="Источники">
        {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
        {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
        {currentConfig.dataSources.length === 0 ? (
          <EmptyState title="Источники не настроены" description="Создайте DataSource или мигрируйте старые устройства." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(source) => source.id} rows={currentConfig.dataSources} />
        )}
      </Panel>
    </section>
  );
}

function formatConnection(source: DataSource): React.ReactNode {
  if (source.connection.type === 'modbus-rtu') {
    return (
      <span className="font-mono text-xs">
        {source.connection.port} · {source.connection.baudRate} · {source.connection.dataBits}
        {(source.connection.parity[0] ?? 'n').toUpperCase()}
        {source.connection.stopBits}
      </span>
    );
  }

  if (source.connection.type === 'mock' || source.connection.type === 'manual') {
    return source.connection.type;
  }

  return <span className="font-mono text-xs">{JSON.stringify(source.connection)}</span>;
}
