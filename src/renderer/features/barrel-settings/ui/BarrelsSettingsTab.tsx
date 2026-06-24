import { useState } from 'react';
import type { AppConfig, BarrelConfig } from '../../../../shared/types/config.types';
import { createUniqueId } from '../../config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { DangerZone } from '../../../shared/ui/DangerZone';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type BarrelsSettingsTabProps = {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
};

export function BarrelsSettingsTab({ config, onChange }: BarrelsSettingsTabProps): React.JSX.Element {
  const [pendingDelete, setPendingDelete] = useState<BarrelConfig | null>(null);
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
    onChange({ ...config, barrels: config.barrels.filter((item) => item.id !== barrel.id) });
    setPendingDelete(null);
  }

  return (
    <>
      <Panel className="p-5" title="Бочки">
        <div className="mb-4">
          <Button onClick={addBarrel} variant="secondary">
            Добавить бочку
          </Button>
        </div>
        {config.barrels.length === 0 ? (
          <Alert type="warning">
            Бочки не настроены. Добавьте бочку и привяжите каналы температуры и уровня.
          </Alert>
        ) : (
          <div className="space-y-4">
            {config.barrels.map((barrel, index) => (
              <BarrelForm
                barrel={barrel}
                index={index}
                key={`${barrel.id}-${index}`}
                levelChannels={levelChannels}
                onChange={(nextBarrel) => updateBarrel(index, nextBarrel)}
                onRequestDelete={() => setPendingDelete(barrel)}
                temperatureChannels={temperatureChannels}
              />
            ))}
          </div>
        )}
      </Panel>

      {pendingDelete ? (
        <ConfirmDialog
          cancelText="Отмена"
          confirmText="Удалить"
          details={
            config.barrels.length === 1 ? (
              <Alert type="warning">Это последняя бочка. После сохранения мониторинг покажет пустое состояние.</Alert>
            ) : null
          }
          message="Бочка будет удалена из config.json после сохранения настроек."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteBarrel(pendingDelete)}
          title="Удалить бочку?"
        />
      ) : null}
    </>
  );
}

type BarrelFormProps = {
  barrel: BarrelConfig;
  index: number;
  temperatureChannels: AppConfig['channels'];
  levelChannels: AppConfig['channels'];
  onChange: (barrel: BarrelConfig) => void;
  onRequestDelete: () => void;
};

function BarrelForm({
  barrel,
  index,
  temperatureChannels,
  levelChannels,
  onChange,
  onRequestDelete
}: BarrelFormProps): React.JSX.Element {
  const hasMissingTemperatureChannel =
    !barrel.temperatureChannelId ||
    !temperatureChannels.some((channel) => channel.id === barrel.temperatureChannelId);
  const hasMissingLevelChannel =
    !barrel.levelChannelId || !levelChannels.some((channel) => channel.id === barrel.levelChannelId);

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">
            Бочка {index + 1}: {barrel.name || barrel.id}
          </div>
          <div className="mt-1 text-xs text-slate-500">{barrel.id}</div>
        </div>
      </div>
      {hasMissingTemperatureChannel || hasMissingLevelChannel ? (
        <div className="mb-4">
          <Alert type="warning">
            Заполните каналы температуры и уровня. Активная бочка без каналов не сможет отображать данные.
          </Alert>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextInput label="id" onChange={(id) => onChange({ ...barrel, id })} value={barrel.id} />
        <TextInput
          label="name"
          onChange={(name) => onChange({ ...barrel, name })}
          value={barrel.name}
        />
        <Select
          error={hasMissingTemperatureChannel ? 'Выберите существующий канал температуры' : undefined}
          label="Канал температуры"
          onChange={(temperatureChannelId) => onChange({ ...barrel, temperatureChannelId })}
          options={[
            { label: '—', value: '' },
            ...temperatureChannels.map((channel) => ({ label: channel.name, value: channel.id }))
          ]}
          value={barrel.temperatureChannelId}
        />
        <Select
          error={hasMissingLevelChannel ? 'Выберите существующий канал уровня' : undefined}
          label="Канал уровня"
          onChange={(levelChannelId) => onChange({ ...barrel, levelChannelId })}
          options={[
            { label: '—', value: '' },
            ...levelChannels.map((channel) => ({ label: channel.name, value: channel.id }))
          ]}
          value={barrel.levelChannelId}
        />
        <NumberInput
          label="Порядок"
          min={1}
          onChange={(displayOrder) => onChange({ ...barrel, displayOrder })}
          value={barrel.displayOrder}
        />
        <Select
          label="Размер карточки"
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
          label="Активна"
          onChange={(active) => onChange({ ...barrel, active })}
        />
        <Checkbox
          checked={barrel.visible}
          label="Видима"
          onChange={(visible) => onChange({ ...barrel, visible })}
        />
      </div>
      <div className="mt-4">
        <DangerZone
          description="Удаление применится только после сохранения настроек."
          title="Опасное действие"
        >
          <Button onClick={onRequestDelete} variant="danger">
            Удалить бочку
          </Button>
        </DangerZone>
      </div>
    </div>
  );
}
