import { useEffect, useState } from 'react';
import type { DataSource, DataSourceType } from '../../../../shared/types/config.types';
import type { SerialPortInfo } from '../../../../shared/types/ipc.types';
import type { TestConnectionResult } from '../../../../shared/types/monitoring.types';
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

export function DataSourcesPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<DataSource | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  useEffect(() => {
    void window.barrelMonitor.system.listSerialPorts().then(setPorts).catch(() => setPorts([]));
  }, []);

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
            <Button disabled={isSaving} onClick={() => startEditSource(source)} variant="secondary">
              Редактировать
            </Button>
            <Button disabled={isSaving} onClick={() => void testSource(source)} variant="ghost">
              Тест
            </Button>
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

  async function addSource(type: DataSourceType): Promise<void> {
    const now = new Date().toISOString();
    const id = createUniqueId(`${type}-1`, currentConfig.dataSources.map((source) => source.id));
    const source = createDefaultSource(id, type, currentConfig.app.pollingIntervalMs, now);
    const isSaved = await save({ ...currentConfig, dataSources: [...currentConfig.dataSources, source] }, 'Источник данных добавлен');
    if (isSaved) {
      setDraft(source);
      setEditingSourceId(source.id);
    }
  }

  function startEditSource(source: DataSource): void {
    setDraft(source);
    setEditingSourceId(source.id);
    setMessage(null);
    setSaveError(null);
    setTestResult(null);
  }

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }

    const sourceId = editingSourceId ?? draft.id;
    const savedSource = currentConfig.dataSources.find((source) => source.id === sourceId);
    const nextSource = {
      ...draft,
      id: draft.id.trim(),
      name: draft.name.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!savedSource) {
      setSaveError('Редактируемый источник больше не найден. Обновите список и повторите изменение.');
      return;
    }

    if (!nextSource.id) {
      setSaveError('ID источника данных не может быть пустым.');
      return;
    }

    if (!nextSource.name) {
      setSaveError('Название источника данных не может быть пустым.');
      return;
    }

    if (currentConfig.dataSources.some((source) => source.id !== sourceId && source.id === nextSource.id)) {
      setSaveError(`Источник данных с ID "${nextSource.id}" уже существует.`);
      return;
    }

    const isSaved = await save(
      {
        ...currentConfig,
        dataSources: currentConfig.dataSources.map((source) =>
          source.id === sourceId ? nextSource : source
        ),
        points: currentConfig.points.map((point) =>
          point.dataSourceId === sourceId ? { ...point, dataSourceId: nextSource.id, updatedAt: nextSource.updatedAt } : point
        )
      },
      'Источник данных сохранен'
    );
    if (isSaved) {
      setDraft(null);
      setEditingSourceId(null);
    }
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
        dataSources: currentConfig.dataSources.filter((item) => item.id !== source.id)
      },
      'Источник данных удален'
    );
  }

  async function testSource(source: DataSource): Promise<void> {
    setIsSaving(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const result = await window.barrelMonitor.monitoring.testConnection(source.id);
      setTestResult(result);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка проверки подключения');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="Источники данных"
        description="Источник данных описывает текущие значения и команды: Modbus RTU, симуляцию, ручной ввод и будущие TCP/HTTP/MQTT."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={() => void addSource('modbus-rtu')} variant="secondary">
              Добавить Modbus RTU
            </Button>
            <Button disabled={isSaving} onClick={() => void addSource('mock')} variant="ghost">
              Добавить mock
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        <Panel className="p-5" title="Источники">
          {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
          {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
          {testResult ? (
            <div className="mb-4">
              <Alert type={testResult.success ? 'success' : 'error'}>
                {testResult.message}
              </Alert>
            </div>
          ) : null}
          {currentConfig.dataSources.length === 0 ? (
            <EmptyState title="Источники не настроены" description="Создайте DataSource или мигрируйте старые устройства." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(source) => source.id} rows={currentConfig.dataSources} />
          )}
        </Panel>

        {draft ? (
          <Panel className="p-5" title={`Редактирование: ${draft.name}`}>
            <DataSourceForm
              draft={draft}
              onChange={setDraft}
              ports={ports}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={() => void saveDraft()} variant="secondary">
                Сохранить источник
              </Button>
              <Button disabled={isSaving} onClick={() => {
                setDraft(null);
                setEditingSourceId(null);
              }} variant="ghost">
                Отмена
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function DataSourceForm({
  draft,
  onChange,
  ports
}: {
  draft: DataSource;
  onChange: (source: DataSource) => void;
  ports: SerialPortInfo[];
}): React.JSX.Element {
  const modbusConnection = draft.connection.type === 'modbus-rtu' ? draft.connection : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput label="ID" onChange={(id) => onChange({ ...draft, id })} value={draft.id} />
        <TextInput label="Название" onChange={(name) => onChange({ ...draft, name })} value={draft.name} />
        <Select
          label="Тип"
          onChange={(type) => onChange(createDefaultSource(draft.id, type, draft.pollingIntervalMs ?? 1000, draft.createdAt, draft.name))}
          options={[
            { label: 'modbus-rtu', value: 'modbus-rtu' },
            { label: 'mock', value: 'mock' },
            { label: 'manual', value: 'manual' }
          ]}
          value={draft.type === 'modbus-tcp' || draft.type === 'http' || draft.type === 'mqtt' ? 'manual' : draft.type}
        />
        <NumberInput
          label="Polling, ms"
          min={250}
          onChange={(pollingIntervalMs) => onChange({ ...draft, pollingIntervalMs })}
          value={draft.pollingIntervalMs ?? 1000}
        />
        <NumberInput
          label="Timeout, ms"
          min={1}
          onChange={(timeoutMs) => onChange({ ...draft, timeoutMs })}
          value={draft.timeoutMs ?? 1000}
        />
        <NumberInput
          label="Повторы"
          min={0}
          onChange={(retryCount) => onChange({ ...draft, retryCount })}
          value={draft.retryCount ?? 1}
        />
        <Checkbox checked={draft.enabled} label="Включен" onChange={(enabled) => onChange({ ...draft, enabled })} />
      </div>

      {modbusConnection ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Select<string>
            label="COM-порт"
            onChange={(port) => onChange({ ...draft, connection: { ...modbusConnection, port } })}
            options={[
              { label: modbusConnection.port, value: modbusConnection.port },
              ...ports
                .filter((port) => port.path !== modbusConnection.port)
                .map((port) => ({ label: port.friendlyName ?? port.path, value: port.path }))
            ]}
            value={modbusConnection.port}
          />
          <NumberInput
            label="Скорость"
            min={1}
            onChange={(baudRate) => onChange({ ...draft, connection: { ...modbusConnection, baudRate } })}
            value={modbusConnection.baudRate}
          />
          <Select<7 | 8>
            label="Биты данных"
            onChange={(dataBits) => onChange({ ...draft, connection: { ...modbusConnection, dataBits } })}
            options={[{ label: '7', value: 7 }, { label: '8', value: 8 }]}
            value={modbusConnection.dataBits}
          />
          <Select<1 | 2>
            label="Стоп-биты"
            onChange={(stopBits) => onChange({ ...draft, connection: { ...modbusConnection, stopBits } })}
            options={[{ label: '1', value: 1 }, { label: '2', value: 2 }]}
            value={modbusConnection.stopBits}
          />
          <Select<'none' | 'even' | 'odd'>
            label="Четность"
            onChange={(parity) => onChange({ ...draft, connection: { ...modbusConnection, parity } })}
            options={[{ label: 'none', value: 'none' }, { label: 'even', value: 'even' }, { label: 'odd', value: 'odd' }]}
            value={modbusConnection.parity}
          />
          <NumberInput
            label="Адрес Modbus"
            max={247}
            min={1}
            onChange={(slaveId) => onChange({ ...draft, metadata: { ...draft.metadata, slaveId } })}
            value={typeof draft.metadata?.slaveId === 'number' ? draft.metadata.slaveId : 1}
          />
          <TextInput
            label="Модель"
            onChange={(model) => onChange({ ...draft, metadata: { ...draft.metadata, model } })}
            value={String(draft.metadata?.model ?? '')}
          />
        </div>
      ) : null}
    </div>
  );
}

function createDefaultSource(
  id: string,
  type: DataSourceType,
  pollingIntervalMs: number,
  now: string,
  name = type === 'modbus-rtu' ? 'Modbus RTU источник' : type === 'mock' ? 'Mock source' : 'Manual source'
): DataSource {
  if (type === 'modbus-rtu') {
    return {
      id,
      name,
      type,
      enabled: true,
      connection: { type: 'modbus-rtu', port: 'COM3', baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' },
      pollingIntervalMs,
      timeoutMs: 1000,
      retryCount: 1,
      metadata: { model: 'Modbus RTU', slaveId: 1 },
      createdAt: now,
      updatedAt: now
    };
  }

  return {
    id,
    name,
    type,
    enabled: true,
    connection: { type },
    pollingIntervalMs,
    timeoutMs: 1000,
    retryCount: 0,
    createdAt: now,
    updatedAt: now
  } as DataSource;
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
