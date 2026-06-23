import type {
  AppConfig,
  ChannelConfig,
  ChannelDataType,
  ChannelType,
  ScalingConfig
} from '../../../../shared/types/config.types';
import { createUniqueId } from '../../config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type ChannelsSettingsTabProps = {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
};

export function ChannelsSettingsTab({
  config,
  onChange
}: ChannelsSettingsTabProps): React.JSX.Element {
  function updateChannel(index: number, channel: ChannelConfig): void {
    onChange({
      ...config,
      channels: config.channels.map((item, itemIndex) => (itemIndex === index ? channel : item))
    });
  }

  function addChannel(type: ChannelType): void {
    const channelNumber = config.channels.length + 1;
    const name = type === 'level' ? `Уровень бочки ${channelNumber}` : `Температура бочки ${channelNumber}`;
    const idBase = type === 'level' ? `level-barrel-${channelNumber}` : `temperature-barrel-${channelNumber}`;
    const channel = createDefaultChannel(
      type,
      createUniqueId(idBase, config.channels.map((item) => item.id)),
      name,
      config.device.id
    );
    onChange({ ...config, channels: [...config.channels, channel] });
  }

  function deleteChannel(channel: ChannelConfig): void {
    const usedByBarrel = config.barrels.find(
      (barrel) =>
        barrel.temperatureChannelId === channel.id || barrel.levelChannelId === channel.id
    );

    if (usedByBarrel) {
      window.alert(`Канал используется бочкой ${usedByBarrel.name}. Сначала измените привязку бочки.`);
      return;
    }

    onChange({ ...config, channels: config.channels.filter((item) => item.id !== channel.id) });
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5" title="Каналы">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => addChannel('temperature')} variant="secondary">
            Добавить температуру
          </Button>
          <Button onClick={() => addChannel('level')} variant="secondary">
            Добавить уровень
          </Button>
          <Button onClick={() => addChannel('custom')} variant="ghost">
            Добавить custom
          </Button>
        </div>
        {config.channels.length === 0 ? (
          <Alert type="warning">Каналы не настроены. Добавьте хотя бы один канал.</Alert>
        ) : (
          <div className="space-y-4">
            {config.channels.map((channel, index) => (
              <ChannelForm
                channel={channel}
                deviceId={config.device.id}
                index={index}
                key={`${channel.id}-${index}`}
                onChange={(nextChannel) => updateChannel(index, nextChannel)}
                onDelete={() => deleteChannel(channel)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

type ChannelFormProps = {
  channel: ChannelConfig;
  deviceId: string;
  index: number;
  onChange: (channel: ChannelConfig) => void;
  onDelete: () => void;
};

function ChannelForm({
  channel,
  deviceId,
  index,
  onChange,
  onDelete
}: ChannelFormProps): React.JSX.Element {
  function updateScaling(scaling: ScalingConfig): void {
    onChange({ ...channel, scaling });
  }

  function updateLinearScaling(
    field: 'rawMin' | 'rawMax' | 'displayMin' | 'displayMax',
    value: number
  ): void {
    if (channel.scaling.type === 'linear') {
      updateScaling({ ...channel.scaling, [field]: value });
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">
            Канал {index + 1}: {channel.name || channel.id}
          </div>
          <div className="mt-1 text-xs text-slate-500">{channel.id}</div>
        </div>
        <Button onClick={onDelete} variant="danger">
          Удалить
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextInput label="id" onChange={(id) => onChange({ ...channel, id })} value={channel.id} />
        <TextInput
          label="name"
          onChange={(name) => onChange({ ...channel, name })}
          value={channel.name}
        />
        <Select
          label="type"
          onChange={(type) => onChange(applyTypeDefaults({ ...channel, type }))}
          options={[
            { label: 'temperature', value: 'temperature' },
            { label: 'level', value: 'level' },
            { label: 'custom', value: 'custom' }
          ]}
          value={channel.type}
        />
        <TextInput
          label="deviceId"
          onChange={(nextDeviceId) => onChange({ ...channel, deviceId: nextDeviceId })}
          value={channel.deviceId || deviceId}
        />
        <NumberInput
          label="moduleInputNumber"
          min={1}
          onChange={(moduleInputNumber) => onChange({ ...channel, moduleInputNumber })}
          value={channel.moduleInputNumber}
        />
        <NumberInput
          label="registerAddress"
          min={0}
          onChange={(registerAddress) => onChange({ ...channel, registerAddress })}
          value={channel.registerAddress}
        />
        <Select
          label="modbusFunction"
          onChange={(modbusFunction) => onChange({ ...channel, modbusFunction })}
          options={[
            { label: '3', value: 3 },
            { label: '4', value: 4 }
          ]}
          value={channel.modbusFunction}
        />
        <Select
          label="dataType"
          onChange={(dataType) =>
            onChange({
              ...channel,
              dataType,
              registerCount: dataType === 'float32' ? 2 : channel.registerCount
            })
          }
          options={[
            { label: 'int16', value: 'int16' },
            { label: 'uint16', value: 'uint16' },
            { label: 'int32', value: 'int32' },
            { label: 'uint32', value: 'uint32' },
            { label: 'float32', value: 'float32' }
          ]}
          value={channel.dataType}
        />
        <NumberInput
          label="registerCount"
          min={1}
          onChange={(registerCount) => onChange({ ...channel, registerCount })}
          value={channel.registerCount}
        />
        <Select
          label="byteOrder"
          onChange={(byteOrder) => onChange({ ...channel, byteOrder })}
          options={[
            { label: 'ABCD', value: 'ABCD' },
            { label: 'CDAB', value: 'CDAB' },
            { label: 'BADC', value: 'BADC' },
            { label: 'DCBA', value: 'DCBA' }
          ]}
          value={channel.byteOrder}
        />
        <TextInput
          label="rawUnit"
          onChange={(rawUnit) => onChange({ ...channel, rawUnit })}
          value={channel.rawUnit}
        />
        <TextInput
          label="displayUnit"
          onChange={(displayUnit) => onChange({ ...channel, displayUnit })}
          value={channel.displayUnit}
        />
        <NumberInput
          label="decimals"
          min={0}
          onChange={(decimals) => onChange({ ...channel, decimals })}
          value={channel.decimals}
        />
        <Select
          label="scaling.type"
          onChange={(type) =>
            updateScaling(
              type === 'none'
                ? { type: 'none' }
                : channel.scaling.type === 'linear'
                  ? channel.scaling
                  : { type: 'linear', rawMin: 4, rawMax: 20, displayMin: 0, displayMax: 100 }
            )
          }
          options={[
            { label: 'none', value: 'none' },
            { label: 'linear', value: 'linear' }
          ]}
          value={channel.scaling.type}
        />
      </div>
      {channel.scaling.type === 'linear' ? (
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <NumberInput
            label="rawMin"
            onChange={(rawMin) => updateLinearScaling('rawMin', rawMin)}
            step={0.01}
            value={channel.scaling.rawMin}
          />
          <NumberInput
            label="rawMax"
            onChange={(rawMax) => updateLinearScaling('rawMax', rawMax)}
            step={0.01}
            value={channel.scaling.rawMax}
          />
          <NumberInput
            label="displayMin"
            onChange={(displayMin) => updateLinearScaling('displayMin', displayMin)}
            step={0.01}
            value={channel.scaling.displayMin}
          />
          <NumberInput
            label="displayMax"
            onChange={(displayMax) => updateLinearScaling('displayMax', displayMax)}
            step={0.01}
            value={channel.scaling.displayMax}
          />
        </div>
      ) : null}
    </div>
  );
}

function createDefaultChannel(
  type: ChannelType,
  id: string,
  name: string,
  deviceId: string
): ChannelConfig {
  const common = {
    id,
    name,
    type,
    deviceId,
    modbusFunction: 4 as const,
    dataType: 'float32' as ChannelDataType,
    registerCount: 2,
    byteOrder: 'ABCD' as const
  };

  if (type === 'level') {
    return {
      ...common,
      moduleInputNumber: 2,
      registerAddress: 10,
      rawUnit: 'mA',
      displayUnit: '%',
      decimals: 0,
      scaling: { type: 'linear', rawMin: 4, rawMax: 20, displayMin: 0, displayMax: 100 }
    };
  }

  return {
    ...common,
    moduleInputNumber: 1,
    registerAddress: 4,
    rawUnit: '°C',
    displayUnit: '°C',
    decimals: 1,
    scaling: { type: 'none' }
  };
}

function applyTypeDefaults(channel: ChannelConfig): ChannelConfig {
  if (channel.type === 'level') {
    return {
      ...channel,
      rawUnit: channel.rawUnit || 'mA',
      displayUnit: channel.displayUnit || '%',
      decimals: 0,
      scaling:
        channel.scaling.type === 'linear'
          ? channel.scaling
          : { type: 'linear', rawMin: 4, rawMax: 20, displayMin: 0, displayMax: 100 }
    };
  }

  if (channel.type === 'temperature') {
    return {
      ...channel,
      rawUnit: channel.rawUnit || '°C',
      displayUnit: channel.displayUnit || '°C',
      decimals: 1,
      scaling: { type: 'none' }
    };
  }

  return channel;
}
