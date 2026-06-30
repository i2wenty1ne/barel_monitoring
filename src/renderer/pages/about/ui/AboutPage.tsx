import { stringifyPrettyJson } from '../../../../shared/lib/format';
import { PathsPanel } from '../../../features/system-info/ui/PathsPanel';
import { RuntimeInfoPanel } from '../../../features/system-info/ui/RuntimeInfoPanel';
import { SystemInfoPanel } from '../../../features/system-info/ui/SystemInfoPanel';
import { useSystemInfo } from '../../../features/system-info/model/useSystemInfo';
import { Alert } from '../../../shared/ui/Alert';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function AboutPage(): React.JSX.Element {
  const systemInfo = useSystemInfo();

  if (systemInfo.isLoading && !systemInfo.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Industrial Flow Monitor" title="О приложении" />
        <LoadingState />
      </section>
    );
  }

  if (systemInfo.error && !systemInfo.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Industrial Flow Monitor" title="О приложении" />
        <ErrorState message={systemInfo.error} onRetry={() => void systemInfo.refresh()} />
      </section>
    );
  }

  if (!systemInfo.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Industrial Flow Monitor" title="О приложении" />
        <ErrorState message="System info недоступен" onRetry={() => void systemInfo.refresh()} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <CopyButton
            getText={() => stringifyPrettyJson(systemInfo.data)}
            label="Скопировать системную информацию"
            onError={(message) => window.alert(message)}
          />
        }
        eyebrow="Industrial Flow Monitor"
        title="О приложении"
        description="Версия, runtime, schema v2 и рабочие пути локального приложения."
      />
      <div className="space-y-5">
        {systemInfo.error ? <Alert type="error">{systemInfo.error}</Alert> : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <SystemInfoPanel info={systemInfo.data} />
          <RuntimeInfoPanel info={systemInfo.data} />
        </div>
        <Panel className="p-5" title="Источники данных и подключения">
          <div className="grid gap-4">
            {systemInfo.data.dataSources.map((source) => {
              const slaveId = typeof source.metadata?.slaveId === 'number' ? source.metadata.slaveId : '—';
              return (
                <dl className="grid gap-3 rounded-md border border-white/10 bg-slate-950/35 p-4 text-sm md:grid-cols-2" key={source.id}>
                  <InfoRow label="Источник" value={`${source.name} (${source.id})`} />
                  <InfoRow label="Тип" value={source.type} />
                  <InfoRow label="Включен" value={source.enabled ? 'да' : 'нет'} />
                  <InfoRow label="Slave ID" value={slaveId} />
                  <InfoRow label="Timeout" value={`${source.timeoutMs ?? '—'} ms`} />
                  <InfoRow label="Повторы" value={source.retryCount ?? '—'} />
                </dl>
              );
            })}
          </div>
        </Panel>
        <PathsPanel
          info={systemInfo.data}
          onOpenConfigFolder={() => void systemInfo.openConfigFolder()}
          onOpenLogsFolder={() => void systemInfo.openLogsFolder()}
        />
      </div>
    </section>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
