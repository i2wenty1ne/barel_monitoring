import type { AppConfig } from '../../../../shared/types/config.types';
import type { TestConnectionResult } from '../../../../shared/types/monitoring.types';
import type { ConfigValidationError } from '../../../../shared/types/ipc.types';
import { getValidationError } from '../../config-editor/model/config-editor.utils';
import { Button } from '../../../shared/ui/Button';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

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
  validationErrors,
  onChange,
  testResult,
  isTesting,
  onTestConnection
}: ConnectionSettingsTabProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Подключение">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Select
          disabled
          label="Тип подключения"
          onChange={() => undefined}
          options={[{ label: 'Modbus RTU', value: 'modbus-rtu' }]}
          value={config.connection.type}
        />
        <TextInput
          error={getValidationError(validationErrors, 'connection.port')}
          label="COM-порт"
          onChange={(port) => onChange({ ...config, connection: { ...config.connection, port } })}
          placeholder="COM3"
          value={config.connection.port}
        />
        <NumberInput
          error={getValidationError(validationErrors, 'connection.baudRate')}
          label="Скорость"
          min={1}
          onChange={(baudRate) =>
            onChange({ ...config, connection: { ...config.connection, baudRate } })
          }
          value={config.connection.baudRate}
        />
        <Select
          label="Data bits"
          onChange={(dataBits) =>
            onChange({ ...config, connection: { ...config.connection, dataBits } })
          }
          options={[
            { label: '7', value: 7 },
            { label: '8', value: 8 }
          ]}
          value={config.connection.dataBits}
        />
        <Select
          label="Stop bits"
          onChange={(stopBits) =>
            onChange({ ...config, connection: { ...config.connection, stopBits } })
          }
          options={[
            { label: '1', value: 1 },
            { label: '2', value: 2 }
          ]}
          value={config.connection.stopBits}
        />
        <Select
          label="Parity"
          onChange={(parity) =>
            onChange({ ...config, connection: { ...config.connection, parity } })
          }
          options={[
            { label: 'none', value: 'none' },
            { label: 'even', value: 'even' },
            { label: 'odd', value: 'odd' }
          ]}
          value={config.connection.parity}
        />
        <NumberInput
          error={getValidationError(validationErrors, 'connection.timeoutMs')}
          label="Timeout, ms"
          min={1}
          onChange={(timeoutMs) =>
            onChange({ ...config, connection: { ...config.connection, timeoutMs } })
          }
          value={config.connection.timeoutMs}
        />
        <NumberInput
          error={getValidationError(validationErrors, 'app.pollingIntervalMs')}
          hint="Рекомендуется не меньше 250 мс"
          label="Интервал опроса, ms"
          min={250}
          onChange={(pollingIntervalMs) =>
            onChange({ ...config, app: { ...config.app, pollingIntervalMs } })
          }
          value={config.app.pollingIntervalMs}
        />
        <NumberInput
          error={getValidationError(validationErrors, 'connection.retries')}
          label="Повторы при ошибке"
          min={0}
          onChange={(retries) =>
            onChange({ ...config, connection: { ...config.connection, retries } })
          }
          value={config.connection.retries}
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={isTesting} onClick={onTestConnection} variant="secondary">
          {isTesting ? 'Проверка...' : 'Проверить подключение'}
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
