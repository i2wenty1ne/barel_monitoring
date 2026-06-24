import type { AppConfig } from '../../../../shared/types/config.types';
import type { DataServiceStatus } from '../../../../shared/types/monitoring.types';
import { formatDateTime } from '../../../../shared/lib/format';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type ConnectionDiagnosticsPanelProps = {
  config: AppConfig;
  serviceStatus: DataServiceStatus;
};

export function ConnectionDiagnosticsPanel({
  config,
  serviceStatus
}: ConnectionDiagnosticsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Подключение">
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <InfoRow label="Тип" value={config.connection.type} />
        <InfoRow label="COM-порт" value={config.connection.port} />
        <InfoRow label="Скорость" value={String(config.connection.baudRate)} />
        <InfoRow label="Data bits" value={String(config.connection.dataBits)} />
        <InfoRow label="Stop bits" value={String(config.connection.stopBits)} />
        <InfoRow label="Parity" value={config.connection.parity} />
        <InfoRow label="Timeout" value={`${config.connection.timeoutMs} ms`} />
        <InfoRow label="Повторы" value={String(config.connection.retries)} />
        <InfoRow label="Опрос" value={`${config.app.pollingIntervalMs} ms`} />
        <InfoRow label="DataService" value={<StatusBadge status={serviceStatus.connectionStatus} />} />
        <InfoRow label="Последний успешный опрос" value={formatDateTime(serviceStatus.lastSuccessfulReadAt)} />
        <InfoRow label="Последняя ошибка" value={serviceStatus.lastError ?? '—'} />
      </dl>
    </Panel>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
