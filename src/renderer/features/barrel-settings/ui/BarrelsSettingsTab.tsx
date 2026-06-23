import type { AppConfig, BarrelConfig } from '../../../../shared/types/config.types';
import { createUniqueId } from '../../config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type BarrelsSettingsTabProps = {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
};

export function BarrelsSettingsTab({ config, onChange }: BarrelsSettingsTabProps): React.JSX.Element {
  const temperatureChannels = config.channels.filter(
    (channel) => channel.type === 'temperature' || channel.type === 'custom'
  );
  const levelChannels = config.channels.filter(
    (channel) => channel.type === 'level' || channel.type === 'custom'
  );

  function updateBarrel(index: number, barrel: BarrelConfig): void {
    onChange({
      ...config,
      barrels: config.barrels.map((item, itemIndex) => (itemIndex === index ? barrel : item))
    });
  }

  function addBarrel(): void {
    const nextNumber = config.barrels.length + 1;
    const barrel: BarrelConfig = {
      id: createUniqueId(`barrel-${nextNumber}`, config.barrels.map((item) => item.id)),
      name: `Бочка ${nextNumber}`,
      active: true,
      visible: true,
      temperatureChannelId: temperatureChannels[0]?.id ?? '',
      levelChannelId: levelChannels[0]?.id ?? '',
      displayOrder: nextNumber,
      cardSize: 'medium'
    };
    onChange({ ...config, barrels: [...config.barrels, barrel] });
  }

  function deleteBarrel(barrel: BarrelConfig): void {
    if (config.barrels.length === 1) {
      window.alert('Удаляется последняя бочка. Мониторинг покажет состояние “Бочки не настроены”.');
    }

    onChange({ ...config, barrels: config.barrels.filter((item) => item.id !== barrel.id) });
  }

  return (
    <Panel className="p-5" title="Бочки">
      <div className="mb-4">
        <Button onClick={addBarrel} variant="secondary">
          Добавить бочку
        </Button>
      </div>
      {config.barrels.length === 0 ? (
        <Alert type="warning">Бочки не настроены. Мониторинг покажет EmptyState.</Alert>
      ) : (
        <div className="space-y-4">
          {config.barrels.map((barrel, index) => (
            <BarrelForm
              barrel={barrel}
              index={index}
              key={`${barrel.id}-${index}`}
              levelChannels={levelChannels}
              onChange={(nextBarrel) => updateBarrel(index, nextBarrel)}
              onDelete={() => deleteBarrel(barrel)}
              temperatureChannels={temperatureChannels}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

type BarrelFormProps = {
  barrel: BarrelConfig;
  index: number;
  temperatureChannels: AppConfig['channels'];
  levelChannels: AppConfig['channels'];
  onChange: (barrel: BarrelConfig) => void;
  onDelete: () => void;
};

function BarrelForm({
  barrel,
  index,
  temperatureChannels,
  levelChannels,
  onChange,
  onDelete
}: BarrelFormProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">
            Бочка {index + 1}: {barrel.name || barrel.id}
          </div>
          <div className="mt-1 text-xs text-slate-500">{barrel.id}</div>
        </div>
        <Button onClick={onDelete} variant="danger">
          Удалить
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextInput label="id" onChange={(id) => onChange({ ...barrel, id })} value={barrel.id} />
        <TextInput
          label="name"
          onChange={(name) => onChange({ ...barrel, name })}
          value={barrel.name}
        />
        <Select
          label="temperatureChannelId"
          onChange={(temperatureChannelId) => onChange({ ...barrel, temperatureChannelId })}
          options={[
            { label: '—', value: '' },
            ...temperatureChannels.map((channel) => ({ label: channel.name, value: channel.id }))
          ]}
          value={barrel.temperatureChannelId}
        />
        <Select
          label="levelChannelId"
          onChange={(levelChannelId) => onChange({ ...barrel, levelChannelId })}
          options={[
            { label: '—', value: '' },
            ...levelChannels.map((channel) => ({ label: channel.name, value: channel.id }))
          ]}
          value={barrel.levelChannelId}
        />
        <NumberInput
          label="displayOrder"
          min={1}
          onChange={(displayOrder) => onChange({ ...barrel, displayOrder })}
          value={barrel.displayOrder}
        />
        <Select
          label="cardSize"
          onChange={(cardSize) => onChange({ ...barrel, cardSize })}
          options={[
            { label: 'small', value: 'small' },
            { label: 'medium', value: 'medium' },
            { label: 'large', value: 'large' }
          ]}
          value={barrel.cardSize}
        />
        <Checkbox
          checked={barrel.active}
          label="active"
          onChange={(active) => onChange({ ...barrel, active })}
        />
        <Checkbox
          checked={barrel.visible}
          label="visible"
          onChange={(visible) => onChange({ ...barrel, visible })}
        />
      </div>
    </div>
  );
}
