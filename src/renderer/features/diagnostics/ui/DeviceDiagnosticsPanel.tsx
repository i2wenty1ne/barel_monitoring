import type { DeviceConfig } from '../../../../shared/types/config.types';
import { Alert } from '../../../shared/ui/Alert';
import { Panel } from '../../../shared/ui/Panel';

type DeviceDiagnosticsPanelProps = {
  devices: DeviceConfig[];
};

export function DeviceDiagnosticsPanel({ devices }: DeviceDiagnosticsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Устройства">
      {devices.length === 0 ? (
        <Alert type="warning">Устройства не настроены.</Alert>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <div className="rounded-md border border-white/10 bg-slate-950/35 p-4" key={device.id}>
              {!device.active ? (
                <div className="mb-3">
                  <Alert type="warning">Устройство {device.name} неактивно.</Alert>
                </div>
              ) : null}
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <InfoRow label="ID" value={device.id} />
                <InfoRow label="Название" value={device.name} />
                <InfoRow label="Модель" value={device.model} />
                <InfoRow label="Modbus address" value={String(device.modbusAddress)} />
                <InfoRow label="COM-порт" value={device.connection.port} />
                <InfoRow label="Скорость" value={String(device.connection.baudRate)} />
                <InfoRow label="Активно" value={device.active ? 'Да' : 'Нет'} />
              </dl>
            </div>
          ))}
        </div>
      )}
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
