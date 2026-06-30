import { useState } from 'react';
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
import { CollapsibleSection } from '../../../shared/ui/CollapsibleSection';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
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
  const [pendingDelete, setPendingDelete] = useState<ChannelConfig | null>(null);

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
      config.devices[0]?.id ?? 'device-1'
    );
    onChange({ ...config, channels: [...config.channels, channel] });
  }

  function getChannelUsage(channel: ChannelConfig): string[] {
    return config.barrels
      .filter(
        (barrel) =>
          barrel.temperatureChannelId === channel.id || barrel.levelChannelId === channel.id
      )
      .map((barrel) => barrel.name);
  }

  function deleteChannel(channel: ChannelConfig): void {
    const usedByBarrel = config.barrels.find(
      (barrel) =>
        barrel.temperatureChannelId === channel.id || barrel.levelChannelId === channel.id
    );

    if (usedByBarrel) {
      return;
    }

    onChange({ ...config, channels: config.channels.filter((item) => item.id !== channel.id) });
    setPendingDelete(null);
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
          <div className="space-y-3">
            {config.channels.map((channel, index) => (
              <ChannelForm
                channel={channel}
                devices={config.devices}
                index={index}
                key={`${channel.id}-${index}`}
                onChange={(nextChannel) => updateChannel(index, nextChannel)}
                onRequestDelete={() => setPendingDelete(channel)}
                usedByBarrels={getChannelUsage(channel)}
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
            <div className="rounded-md border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
              <div className="font-medium text-slate-100">{pendingDelete.name}</div>
              <div className="mt-1 font-mono text-xs text-slate-500">{pendingDelete.id}</div>
            </div>
          }
          message="Канал будет удалён из config.json после сохранения настроек."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteChannel(pendingDelete)}
          title="Удалить канал?"
        />
      ) : null}
    </div>
  );
}

type ChannelFormProps = {
  channel: ChannelConfig;
  devices: AppConfig['devices'];
  index: number;
  usedByBarrels: string[];
  onChange: (channel: ChannelConfig) => void;
  onRequestDelete: () => void;
};

function ChannelForm({
  channel,
  devices,
  index,
  usedByBarrels,
  onChange,
  onRequestDelete
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

  const isUsed = usedByBarrels.length > 0;
  const selectedDevice = devices.find((device) => device.id === channel.deviceId) ?? null;
  const deviceOptions = selectedDevice
    ? devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id }))
    : [
        { label: `Не найдено (${channel.deviceId})`, value: channel.deviceId },
        ...devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id }))
      ];

  return (
    <CollapsibleSection
      actions={
        <Button disabled={isUsed} onClick={onRequestDelete} variant="danger">
          Удалить
        </Button>
      }
      defaultOpen={index === 0}
      summary={<ChannelSummary channel={channel} device={selectedDevice} usedByBarrels={usedByBarrels} />}
      title={`Канал ${index + 1}: ${channel.name || channel.id}`}
    >
      {isUsed ? (
        <div className="mb-4">
          <Alert type="warning">
            Канал используется: {usedByBarrels.join(', ')}. Перед удалением измените привязку бочек.
          </Alert>
        </div>
      ) : null}
      {!selectedDevice ? (
        <div className="mb-4">
          <Alert type="error">
            Устройство {channel.deviceId} не найдено. Выберите существующее устройство перед сохранением.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <FieldGroup title="Основное">
          <TextInput
            hint="Уникальный id канала. Используется в привязках бочек."
            label="ID канала"
            onChange={(id) => onChange({ ...channel, id })}
            value={channel.id}
          />
        <TextInput
          label="Название"
          onChange={(name) => onChange({ ...channel, name })}
          value={channel.name}
        />
        <Select
          hint="Тип влияет на дефолтные единицы и масштабирование."
          label="Тип канала"
          onChange={(type) => onChange(applyTypeDefaults({ ...channel, type }))}
          options={[
            { label: 'temperature', value: 'temperature' },
            { label: 'level', value: 'level' },
            { label: 'custom', value: 'custom' }
          ]}
          value={channel.type}
        />
        <Select
          hint="Канал будет читаться через параметры подключения выбранного устройства."
          label="Устройство"
          onChange={(deviceId) => onChange({ ...channel, deviceId })}
          options={deviceOptions}
          value={channel.deviceId}
        />
        </FieldGroup>

        <FieldGroup title="Modbus">
        <NumberInput
          hint="Физический номер входа на модуле."
          label="Номер входа"
          min={1}
          onChange={(moduleInputNumber) => onChange({ ...channel, moduleInputNumber })}
          value={channel.moduleInputNumber}
        />
        <NumberInput
          hint="Адрес регистра Modbus. Для МВ110 обычно берётся из карты регистров."
          label="Адрес регистра"
          min={0}
          onChange={(registerAddress) => onChange({ ...channel, registerAddress })}
          value={channel.registerAddress}
        />
        <Select
          hint="3 - Holding Registers, 4 - Input Registers."
          label="Функция чтения"
          onChange={(modbusFunction) => onChange({ ...channel, modbusFunction })}
          options={[
            { label: '3 Holding', value: 3 },
            { label: '4 Input', value: 4 }
          ]}
          value={channel.modbusFunction}
        />
        </FieldGroup>

        <FieldGroup title="Формат данных">
        <Select
          hint="Тип определяет, как декодировать один или несколько регистров."
          label="Тип данных"
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
          hint="Для 32-bit и float32 требуется 2 регистра."
          label="Количество регистров"
          min={1}
          onChange={(registerCount) => onChange({ ...channel, registerCount })}
          value={channel.registerCount}
        />
        <Select
          hint="Порядок байтов/слов для 32-bit значений."
          label="Порядок байтов"
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
          label="Единица raw"
          onChange={(rawUnit) => onChange({ ...channel, rawUnit })}
          value={channel.rawUnit}
        />
        <TextInput
          label="Единица отображения"
          onChange={(displayUnit) => onChange({ ...channel, displayUnit })}
          value={channel.displayUnit}
        />
        <NumberInput
          label="Знаков после запятой"
          min={0}
          onChange={(decimals) => onChange({ ...channel, decimals })}
          value={channel.decimals}
        />
        </FieldGroup>

        <FieldGroup title="Масштабирование">
        <Select
          hint="Linear переводит raw диапазон в инженерные единицы."
          label="Тип масштабирования"
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
      {channel.scaling.type === 'linear' ? (
        <>
          <NumberInput
            label="Сырой минимум"
            onChange={(rawMin) => updateLinearScaling('rawMin', rawMin)}
            step={0.01}
            value={channel.scaling.rawMin}
          />
          <NumberInput
            label="Сырой максимум"
            onChange={(rawMax) => updateLinearScaling('rawMax', rawMax)}
            step={0.01}
            value={channel.scaling.rawMax}
          />
          <NumberInput
            label="Минимум отображения"
            onChange={(displayMin) => updateLinearScaling('displayMin', displayMin)}
            step={0.01}
            value={channel.scaling.displayMin}
          />
          <NumberInput
            label="Максимум отображения"
            onChange={(displayMax) => updateLinearScaling('displayMax', displayMax)}
            step={0.01}
            value={channel.scaling.displayMax}
          />
          <ScalingPreview scaling={channel.scaling} unit={channel.displayUnit} />
        </>
      ) : null}
        </FieldGroup>
      </div>
    </CollapsibleSection>
  );
}

type FieldGroupProps = {
  title: string;
  children: React.ReactNode;
};

function FieldGroup({ title, children }: FieldGroupProps): React.JSX.Element {
  return (
    <section className="rounded-md border border-white/10 bg-slate-950/35 p-4">
      <h3 className="mb-4 text-sm font-medium text-slate-100">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

type ChannelSummaryProps = {
  channel: ChannelConfig;
  device: AppConfig['devices'][number] | null;
  usedByBarrels: string[];
};

function ChannelSummary({ channel, device, usedByBarrels }: ChannelSummaryProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <SummaryPill label="ID" value={channel.id} monospace />
      <SummaryPill
        label="Устройство"
        tone={device ? 'default' : 'error'}
        value={device ? `${device.name} (${device.id})` : channel.deviceId}
        monospace={!device}
      />
      <SummaryPill label="Тип" value={channel.type} />
      <SummaryPill label="Регистр" value={`${channel.modbusFunction}:${channel.registerAddress}`} />
      <SummaryPill label="Формат" value={`${channel.dataType} x${channel.registerCount}`} />
      <SummaryPill label="Порядок" value={channel.byteOrder} />
      <SummaryPill label="Масштаб" value={formatScaling(channel.scaling)} />
      <SummaryPill
        label="Используется"
        tone={usedByBarrels.length > 0 ? 'ok' : 'muted'}
        value={usedByBarrels.length > 0 ? usedByBarrels.join(', ') : 'нет'}
      />
    </div>
  );
}

type SummaryPillProps = {
  label: string;
  value: string;
  monospace?: boolean;
  tone?: 'default' | 'ok' | 'muted' | 'error';
};

function SummaryPill({
  label,
  value,
  monospace,
  tone = 'default'
}: SummaryPillProps): React.JSX.Element {
  const toneClassName =
    tone === 'ok'
      ? 'border-teal-300/20 bg-teal-400/10 text-teal-100'
      : tone === 'muted'
        ? 'border-white/10 bg-white/[0.03] text-slate-500'
        : tone === 'error'
          ? 'border-rose-300/25 bg-rose-400/10 text-rose-100'
          : 'border-white/10 bg-white/[0.04] text-slate-300';

  return (
    <span className={`rounded-md border px-2 py-1 ${toneClassName}`}>
      <span className="text-slate-500">{label}: </span>
      <span className={monospace ? 'font-mono' : ''}>{value}</span>
    </span>
  );
}

type ScalingPreviewProps = {
  scaling: Extract<ScalingConfig, { type: 'linear' }>;
  unit: string;
};

function ScalingPreview({ scaling, unit }: ScalingPreviewProps): React.JSX.Element {
  const rawMid = (scaling.rawMin + scaling.rawMax) / 2;
  const displayMid = (scaling.displayMin + scaling.displayMax) / 2;

  return (
    <div className="md:col-span-2 rounded-md border border-teal-300/20 bg-teal-400/10 p-3 text-sm text-teal-50">
      Preview: {scaling.rawMin} {'->'} {scaling.displayMin}
      {unit}, {rawMid.toFixed(2)} {'->'} {displayMid.toFixed(2)}
      {unit}, {scaling.rawMax} {'->'} {scaling.displayMax}
      {unit}
    </div>
  );
}

function formatScaling(scaling: ScalingConfig): string {
  if (scaling.type === 'none') {
    return 'нет';
  }

  if (scaling.type === 'factor') {
    return `factor: x${scaling.factor}${scaling.offset ? ` + ${scaling.offset}` : ''}`;
  }

  return `${scaling.rawMin}-${scaling.rawMax} -> ${scaling.displayMin}-${scaling.displayMax}`;
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
