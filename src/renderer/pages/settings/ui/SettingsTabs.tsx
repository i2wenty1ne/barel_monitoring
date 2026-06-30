import { Tabs, type TabItem } from '../../../shared/ui/Tabs';

export type SettingsTabId =
  | 'device'
  | 'channels'
  | 'barrels'
  | 'thresholds'
  | 'interface'
  | 'service';

export const settingsTabs: TabItem<SettingsTabId>[] = [
  { id: 'device', label: 'Источники' },
  { id: 'channels', label: 'Точки' },
  { id: 'barrels', label: 'Объекты' },
  { id: 'thresholds', label: 'Пороги' },
  { id: 'interface', label: 'Интерфейс' },
  { id: 'service', label: 'Сервис' }
];

type SettingsTabsProps = {
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
};

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps): React.JSX.Element {
  return <Tabs activeTab={activeTab} items={settingsTabs} onChange={onChange} />;
}
