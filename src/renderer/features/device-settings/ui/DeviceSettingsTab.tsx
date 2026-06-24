import type { AppConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError } from '../../../../shared/types/ipc.types';
import { getValidationError } from '../../config-editor/model/config-editor.utils';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type DeviceSettingsTabProps = {
  config: AppConfig;
  validationErrors: ConfigValidationError[];
  onChange: (config: AppConfig) => void;
};

export function DeviceSettingsTab({
  config,
  validationErrors,
  onChange
}: DeviceSettingsTabProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Устройство">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextInput
          disabled
          hint="Стабильный внутренний идентификатор устройства; используется каналами."
          label="ID устройства"
          onChange={() => undefined}
          value={config.device.id}
        />
        <TextInput
          error={getValidationError(validationErrors, 'device.name')}
          label="Название устройства"
          onChange={(name) => onChange({ ...config, device: { ...config.device, name } })}
          value={config.device.name}
        />
        <TextInput
          error={getValidationError(validationErrors, 'device.model')}
          label="Модель"
          onChange={(model) => onChange({ ...config, device: { ...config.device, model } })}
          value={config.device.model}
        />
        <Select
          disabled
          label="Протокол"
          onChange={() => undefined}
          options={[{ label: 'modbus-rtu', value: 'modbus-rtu' }]}
          value={config.device.protocol}
        />
        <NumberInput
          error={getValidationError(validationErrors, 'device.modbusAddress')}
          hint="Адрес slave-устройства Modbus: от 1 до 247."
          label="Modbus-адрес"
          max={247}
          min={1}
          onChange={(modbusAddress) =>
            onChange({ ...config, device: { ...config.device, modbusAddress } })
          }
          value={config.device.modbusAddress}
        />
        <Checkbox
          checked={config.device.active}
          label="Активно"
          onChange={(active) => onChange({ ...config, device: { ...config.device, active } })}
        />
      </div>
    </Panel>
  );
}
