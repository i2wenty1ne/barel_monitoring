import { useTranslation } from 'react-i18next';
import { Tabs, type TabItem } from '../../../shared/ui/Tabs';

export type SettingsTabId =
  | 'thresholds'
  | 'interface'
  | 'service';

const settingsTabIds: SettingsTabId[] = ['thresholds', 'interface', 'service'];

type SettingsTabsProps = {
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
};

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps): React.JSX.Element {
  const { t } = useTranslation();
  const settingsTabs: TabItem<SettingsTabId>[] = settingsTabIds.map((id) => ({
    id,
    label: t(`settings.tabs.${id}`)
  }));

  return <Tabs activeTab={activeTab} items={settingsTabs} onChange={onChange} />;
}
