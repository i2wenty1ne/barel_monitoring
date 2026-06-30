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
  const errors = getThresholdErrors(values);

  return (
    <Panel className="p-5" title={title}>
      {errors.length > 0 ? (
        <div className="mb-4">
          <Alert type="warning">{errors.join(' ')}</Alert>
        </div>
      ) : null}
      <ThresholdScale values={values} />
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          error={values.alarmLow > values.warningLow ? 'Должен быть <= warningLow' : undefined}
          label="Авария min"
          onChange={(value) => onChange('alarmLow', value)}
          value={values.alarmLow}
        />
        <NumberInput
          error={values.warningLow >= values.warningHigh ? 'Должен быть < warningHigh' : undefined}
          label="Предупреждение min"
          onChange={(value) => onChange('warningLow', value)}
          value={values.warningLow}
        />
        <NumberInput
          error={values.warningHigh > values.alarmHigh ? 'Должен быть <= alarmHigh' : undefined}
          label="Предупреждение max"
          onChange={(value) => onChange('warningHigh', value)}
          value={values.warningHigh}
        />
        <NumberInput
          label="Авария max"
          onChange={(value) => onChange('alarmHigh', value)}
          value={values.alarmHigh}
        />
      </div>
    </Panel>
  );
}

function getThresholdErrors(values: ValueThresholdConfig): string[] {
  const errors: string[] = [];

  if (values.alarmLow > values.warningLow) {
    errors.push('Нижняя авария должна быть меньше или равна нижнему предупреждению.');
  }

  if (values.warningLow >= values.warningHigh) {
    errors.push('Нижнее предупреждение должно быть меньше верхнего предупреждения.');
  }

  if (values.warningHigh > values.alarmHigh) {
    errors.push('Верхнее предупреждение должно быть меньше или равно верхней аварии.');
  }

  return errors;
}

function ThresholdScale({ values }: { values: ValueThresholdConfig }): React.JSX.Element {
  return (
    <div className="mb-5 rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="grid grid-cols-4 overflow-hidden rounded-md text-center text-xs font-medium">
        <div className="bg-rose-500/25 px-2 py-2 text-rose-100">Нижняя авария</div>
        <div className="bg-amber-400/20 px-2 py-2 text-amber-100">Нижнее предупреждение</div>
        <div className="bg-teal-400/20 px-2 py-2 text-teal-100">Рабочая зона</div>
        <div className="bg-rose-500/25 px-2 py-2 text-rose-100">Верхняя авария</div>
      </div>
      <div className="mt-2 grid grid-cols-4 text-center text-xs text-slate-400">
        <span>{values.alarmLow}</span>
        <span>{values.warningLow}</span>
        <span>{values.warningHigh}</span>
        <span>{values.alarmHigh}</span>
      </div>
    </div>
  );
}
