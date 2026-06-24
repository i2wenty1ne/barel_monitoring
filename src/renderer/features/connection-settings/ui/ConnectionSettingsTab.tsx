import type { AppConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError } from '../../../../shared/types/ipc.types';
import type { TestConnectionResult } from '../../../../shared/types/monitoring.types';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Panel } from '../../../shared/ui/Panel';

type ConnectionSettingsTabProps = {
  config: AppConfig;
  validationErrors: ConfigValidationError[];
  onChange: (config: AppConfig) => void;
  testResult: TestConnectionResult | null;
  isTesting: boolean;
  onTestConnection: () => void;
};

export function ConnectionSettingsTab({
  config,
  testResult,
  isTesting,
  onTestConnection
}: ConnectionSettingsTabProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Подключения">
      <Alert type="info">
        Параметры подключения теперь настраиваются отдельно для каждого устройства во вкладке
        «Устройства».
      </Alert>
      <div className="mt-4 grid gap-3">
        {config.devices.map((device) => (
          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3 text-sm" key={device.id}>
            <div className="font-medium text-slate-100">{device.name}</div>
            <div className="mt-1 text-slate-400">
              {device.connection.port}, {device.connection.baudRate} baud, address {device.modbusAddress}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={isTesting} onClick={onTestConnection} variant="secondary">
          {isTesting ? 'Проверка...' : 'Проверить первое активное устройство'}
        </Button>
        {testResult ? (
          <span className={testResult.success ? 'text-sm text-teal-200' : 'text-sm text-rose-200'}>
            {testResult.message}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
