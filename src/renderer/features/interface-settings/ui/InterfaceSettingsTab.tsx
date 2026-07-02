import { useTranslation } from 'react-i18next';
import type { AppConfig } from '../../../../shared/types/config.types';
import { languageOptions } from '../../../shared/i18n/i18n';
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
  const { t } = useTranslation();

  return (
    <Panel className="p-5" title={t('settings.interface.title')}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label={t('settings.interface.language')}
          onChange={(language) => onChange({ ...config, interface: { ...config.interface, language } })}
          options={languageOptions}
          value={config.interface.language}
        />
        <Select
          label={t('settings.interface.theme')}
          onChange={(theme) => onChange({ ...config, interface: { ...config.interface, theme } })}
          options={[
            { label: 'dark', value: 'dark' },
            { label: 'light', value: 'light' },
            { label: 'system', value: 'system' }
          ]}
          value={config.interface.theme}
        />
        <Select
          label={t('settings.interface.cardSize')}
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
          label={t('settings.interface.columns')}
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
          label={t('settings.interface.showLastUpdate')}
          onChange={(showLastUpdate) =>
            onChange({ ...config, interface: { ...config.interface, showLastUpdate } })
          }
        />
        <Checkbox
          checked={config.interface.showRawValuesInDetails}
          label={t('settings.interface.showRawValues')}
          onChange={(showRawValuesInDetails) =>
            onChange({ ...config, interface: { ...config.interface, showRawValuesInDetails } })
          }
        />
        <Checkbox
          checked={config.interface.fullscreenOnStart}
          hint={t('settings.interface.fullscreenHint')}
          label={t('settings.interface.fullscreen')}
          onChange={(fullscreenOnStart) =>
            onChange({ ...config, interface: { ...config.interface, fullscreenOnStart } })
          }
        />
      </div>
    </Panel>
  );
}
