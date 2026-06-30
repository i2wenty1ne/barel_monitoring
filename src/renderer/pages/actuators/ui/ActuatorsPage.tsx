import type { Actuator } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function ActuatorsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<Actuator>[] = [
    { key: 'name', title: 'Механизм', render: (item) => <div><div className="font-medium text-slate-100">{item.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div></div> },
    { key: 'type', title: 'Тип', render: (item) => <Badge tone="info">{item.type}</Badge> },
    { key: 'asset', title: 'Asset', render: (item) => item.assetId ?? '—' },
    { key: 'commands', title: 'Команды', render: (item) => item.supportedCommands.join(', ') || '—' },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'warning'}>{item.enabled ? 'Включен' : 'Отключен'}</Badge> }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Исполнительные механизмы"
        description="Actuator-модель для насосов, клапанов, реле, индикаторов и безопасных команд управления."
      />
      <Panel className="p-5" title="Actuators">
        {config.actuators.length === 0 ? (
          <EmptyState title="Механизмы ещё не настроены" description="Реальные write-команды выключены по умолчанию; следующий шаг — simulation commands и interlocks." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(item) => item.id} rows={config.actuators} />
        )}
      </Panel>
    </section>
  );
}
