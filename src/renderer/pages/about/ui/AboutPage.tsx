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
        <PageHeader eyebrow="Barrel Monitor" title="О приложении" />
        <LoadingState />
      </section>
    );
  }

  if (systemInfo.error && !systemInfo.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="О приложении" />
        <ErrorState message={systemInfo.error} onRetry={() => void systemInfo.refresh()} />
      </section>
    );
  }

  if (!systemInfo.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Barrel Monitor" title="О приложении" />
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
        eyebrow="Barrel Monitor"
        title="О приложении"
        description="Версия, runtime и рабочие пути локального приложения."
      />
      <div className="space-y-5">
        {systemInfo.error ? <Alert type="error">{systemInfo.error}</Alert> : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <SystemInfoPanel info={systemInfo.data} />
          <RuntimeInfoPanel info={systemInfo.data} />
        </div>
        <Panel className="p-5" title="Подключение">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <InfoRow label="Port" value={systemInfo.data.currentConnectionPort ?? '—'} />
            <InfoRow label="Baud rate" value={systemInfo.data.currentConnectionBaudRate ?? '—'} />
            <InfoRow label="Parity" value={systemInfo.data.currentConnectionParity ?? '—'} />
            <InfoRow label="Stop bits" value={systemInfo.data.currentConnectionStopBits ?? '—'} />
            <InfoRow label="Data bits" value={systemInfo.data.currentConnectionDataBits ?? '—'} />
          </dl>
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
