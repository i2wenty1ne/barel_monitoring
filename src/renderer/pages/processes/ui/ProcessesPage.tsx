import { useState } from 'react';
import type { Process, ProcessGraph } from '../../../../shared/types/config.types';
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

export function ProcessesPage(): React.JSX.Element {
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
  const columns: DataTableColumn<Process>[] = [
    { key: 'name', title: 'Процесс', render: (item) => <div><div className="font-medium text-slate-100">{item.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div></div> },
    { key: 'graph', title: 'Graph', render: (item) => item.graphId },
    { key: 'inputs', title: 'Входы', render: (item) => item.inputSchema.fields.length },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'warning'}>{item.enabled ? 'Включен' : 'Отключен'}</Badge> },
    {
      key: 'actions',
      title: '',
      render: (item) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isSaving} onClick={() => void validateProcess(item)} variant="ghost">
            Проверить
          </Button>
          <Button disabled={isSaving} onClick={() => void runProcess(item)} variant="secondary">
            Запустить
          </Button>
          <Button disabled={isSaving} onClick={() => void deleteProcess(item)} variant="danger">
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

  async function addProcess(): Promise<void> {
    const now = new Date().toISOString();
    const processId = createUniqueId('process-1', currentConfig.processes.map((item) => item.id));
    const graphId = `${processId}-graph`;
    const process: Process = {
      id: processId,
      name: 'Новый процесс',
      graphId,
      inputSchema: { fields: [] },
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    const graph: ProcessGraph = {
      id: graphId,
      processId,
      nodes: [
        { id: 'start', type: 'start', data: {} },
        { id: 'complete', type: 'complete', data: {} }
      ],
      edges: [{ id: 'start-complete', source: 'start', target: 'complete' }],
      createdAt: now,
      updatedAt: now
    };

    await save(
      {
        ...currentConfig,
        processes: [...currentConfig.processes, process],
        processGraphs: [...currentConfig.processGraphs, graph]
      },
      'Процесс создан'
    );
  }

  async function deleteProcess(process: Process): Promise<void> {
    await save(
      {
        ...currentConfig,
        processes: currentConfig.processes.filter((item) => item.id !== process.id),
        processGraphs: currentConfig.processGraphs.filter((graph) => graph.processId !== process.id),
        processJobs: currentConfig.processJobs.filter((job) => job.processId !== process.id)
      },
      'Процесс удален'
    );
  }

  async function validateProcess(process: Process): Promise<void> {
    const graph = currentConfig.processGraphs.find((item) => item.processId === process.id || item.id === process.graphId);
    if (!graph) {
      setSaveError('Граф процесса не найден');
      return;
    }

    const result = await window.barrelMonitor.processes.validateGraph(graph);
    if (result.valid) {
      setMessage('Граф валиден');
      setSaveError(null);
    } else {
      setMessage(null);
      setSaveError(result.errors.map((error) => error.message).join('; '));
    }
  }

  async function runProcess(process: Process): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setSaveError(null);
    try {
      const job = await window.barrelMonitor.processes.startJob(process.id, {});
      if (job.status !== 'completed') {
        throw new Error(job.error ?? `Job завершился со статусом ${job.status}`);
      }
      setMessage(`ProcessJob ${job.id} завершён`);
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка запуска процесса');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Процессы"
        description="Process и ProcessGraph готовят приложение к сценариям загрузки, перекачки, контроля и автоматизации."
        actions={
          <Button disabled={isSaving} onClick={() => void addProcess()} variant="secondary">
            Создать процесс
          </Button>
        }
      />
      <Panel className="p-5" title="Processes">
        {message ? <div className="mb-4"><Alert type="success">{message}</Alert></div> : null}
        {saveError ? <div className="mb-4"><Alert type="error">{saveError}</Alert></div> : null}
        {currentConfig.processes.length === 0 ? (
          <EmptyState title="Процессы не созданы" description="Stage 7 добавит React Flow editor, graph validation и запуск ProcessJob." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(item) => item.id} rows={currentConfig.processes} />
        )}
      </Panel>
    </section>
  );
}
