import type { DeviceConfig } from '../../../../shared/types/config.types';
import { Alert } from '../../../shared/ui/Alert';
import { Panel } from '../../../shared/ui/Panel';

type DeviceDiagnosticsPanelProps = {
  device: DeviceConfig;
};

export function DeviceDiagnosticsPanel({ device }: DeviceDiagnosticsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Устройство">
      {!device.active ? (
        <div className="mb-4">
          <Alert type="warning">Устройство неактивно.</Alert>
        </div>
      ) : null}
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <InfoRow label="ID" value={device.id} />
        <InfoRow label="Название" value={device.name} />
        <InfoRow label="Модель" value={device.model} />
        <InfoRow label="Протокол" value={device.protocol} />
        <InfoRow label="Modbus address" value={String(device.modbusAddress)} />
        <InfoRow label="Активно" value={device.active ? 'Да' : 'Нет'} />
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
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
