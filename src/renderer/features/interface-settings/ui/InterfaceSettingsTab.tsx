import type { AppConfig } from '../../../../shared/types/config.types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';

type InterfaceSettingsTabProps = {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
};

export function InterfaceSettingsTab({
  config,
  onChange
}: InterfaceSettingsTabProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Интерфейс">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label="Тема"
          onChange={(theme) => onChange({ ...config, interface: { ...config.interface, theme } })}
          options={[
            { label: 'dark', value: 'dark' },
            { label: 'light', value: 'light' },
            { label: 'system', value: 'system' }
          ]}
          value={config.interface.theme}
        />
        <Select
          label="Размер карточек"
          onChange={(cardSize) =>
            onChange({ ...config, interface: { ...config.interface, cardSize } })
          }
          options={[
            { label: 'small', value: 'small' },
            { label: 'medium', value: 'medium' },
            { label: 'large', value: 'large' }
          ]}
          value={config.interface.cardSize}
        />
        <Select
          label="Количество колонок"
          onChange={(columns) => onChange({ ...config, interface: { ...config.interface, columns } })}
          options={[
            { label: 'auto', value: 'auto' },
            { label: '1', value: 1 },
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 }
          ]}
          value={config.interface.columns}
        />
        <Checkbox
          checked={config.interface.showLastUpdate}
          label="Показывать время обновления"
          onChange={(showLastUpdate) =>
            onChange({ ...config, interface: { ...config.interface, showLastUpdate } })
          }
        />
        <Checkbox
          checked={config.interface.showRawValuesInDetails}
          label="Показывать сырые значения в деталях"
          onChange={(showRawValuesInDetails) =>
            onChange({ ...config, interface: { ...config.interface, showRawValuesInDetails } })
          }
        />
        <Checkbox
          checked={config.interface.fullscreenOnStart}
          hint="TODO: применение полноэкранного режима будет доработано отдельно."
          label="Запускать в полноэкранном режиме"
          onChange={(fullscreenOnStart) =>
            onChange({ ...config, interface: { ...config.interface, fullscreenOnStart } })
          }
        />
      </div>
    </Panel>
  );
}
