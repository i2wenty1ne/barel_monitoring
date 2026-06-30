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
    <Panel className="p-5" title="Подключения">
      <div className="mb-4 grid gap-3 text-sm md:grid-cols-2">
        <InfoRow label="Сервис данных" value={<StatusBadge status={serviceStatus.connectionStatus} />} />
        <InfoRow label="Последний успешный опрос" value={formatDateTime(serviceStatus.lastSuccessfulReadAt)} />
        <InfoRow label="Последняя ошибка" value={serviceStatus.lastError ?? '—'} />
      </div>
      <div className="grid gap-3">
        {config.devices.map((device) => (
          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={device.id}>
            <div className="font-medium text-slate-100">{device.name}</div>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <InfoRow label="COM-порт" value={device.connection.port} />
              <InfoRow label="Скорость" value={String(device.connection.baudRate)} />
              <InfoRow label="Биты данных" value={String(device.connection.dataBits)} />
              <InfoRow label="Стоп-биты" value={String(device.connection.stopBits)} />
              <InfoRow label="Четность" value={device.connection.parity} />
              <InfoRow label="Таймаут" value={`${device.connection.timeoutMs} ms`} />
              <InfoRow label="Повторы" value={String(device.connection.retries)} />
              <InfoRow label="Опрос" value={`${config.app.pollingIntervalMs} ms`} />
            </dl>
          </div>
        ))}
      </div>
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
