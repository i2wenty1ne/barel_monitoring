import type { AppConfig, ValueThresholdConfig } from '../../../../shared/types/config.types';
import { Alert } from '../../../shared/ui/Alert';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';

type ThresholdsSettingsTabProps = {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
};

export function ThresholdsSettingsTab({
  config,
  onChange
}: ThresholdsSettingsTabProps): React.JSX.Element {
  function updateThreshold(
    group: 'temperature' | 'level',
    field: keyof ValueThresholdConfig,
    value: number
  ): void {
    onChange({
      ...config,
      thresholds: {
        ...config.thresholds,
        [group]: {
          ...config.thresholds[group],
          [field]: value
        }
      }
    });
  }

  return (
    <div className="space-y-5">
      <Alert type="info">
        Если значение достигает warning-порога — показывается предупреждение. Если достигает
        alarm-порога — показывается авария.
      </Alert>
      <div className="grid gap-5 xl:grid-cols-2">
        <ThresholdPanel
          title="Температура, °C"
          values={config.thresholds.temperature}
          onChange={(field, value) => updateThreshold('temperature', field, value)}
        />
        <ThresholdPanel
          title="Уровень, %"
          values={config.thresholds.level}
          onChange={(field, value) => updateThreshold('level', field, value)}
        />
      </div>
    </div>
  );
}

type ThresholdPanelProps = {
  title: string;
  values: ValueThresholdConfig;
  onChange: (field: keyof ValueThresholdConfig, value: number) => void;
};

function ThresholdPanel({ title, values, onChange }: ThresholdPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title={title}>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput label="alarmLow" onChange={(value) => onChange('alarmLow', value)} value={values.alarmLow} />
        <NumberInput label="warningLow" onChange={(value) => onChange('warningLow', value)} value={values.warningLow} />
        <NumberInput label="warningHigh" onChange={(value) => onChange('warningHigh', value)} value={values.warningHigh} />
        <NumberInput label="alarmHigh" onChange={(value) => onChange('alarmHigh', value)} value={values.alarmHigh} />
      </div>
    </Panel>
  );
}
