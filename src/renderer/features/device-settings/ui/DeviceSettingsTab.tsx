import { useState } from 'react';
import type { AppConfig, ConnectionConfig, DeviceConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError } from '../../../../shared/types/ipc.types';
import { createUniqueId, getValidationError } from '../../config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { CollapsibleSection } from '../../../shared/ui/CollapsibleSection';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type DeviceSettingsTabProps = {
  config: AppConfig;
  validationErrors: ConfigValidationError[];
  onChange: (config: AppConfig) => void;
};

export function DeviceSettingsTab({
  config,
  validationErrors,
  onChange
}: DeviceSettingsTabProps): React.JSX.Element {
  const [pendingDelete, setPendingDelete] = useState<DeviceConfig | null>(null);

  function updateDevice(index: number, device: DeviceConfig): void {
    onChange({
      ...config,
      devices: config.devices.map((item, itemIndex) => (itemIndex === index ? device : item))
    });
  }

  function addDevice(): void {
    const nextNumber = config.devices.length + 1;
    const connection = config.devices[0]?.connection ?? createDefaultConnection();
    const device: DeviceConfig = {
      id: createUniqueId(`mv110-${nextNumber}`, config.devices.map((item) => item.id)),
      name: `МВ110 №${nextNumber}`,
      model: 'МВ110-224.8А',
      protocol: 'modbus-rtu',
      modbusAddress: 16,
      active: true,
      connection: { ...connection }
    };

    onChange({ ...config, devices: [...config.devices, device] });
  }

  function getUsedByChannels(device: DeviceConfig): string[] {
    return config.channels.filter((channel) => channel.deviceId === device.id).map((channel) => channel.name);
  }

  function deleteDevice(device: DeviceConfig): void {
    if (getUsedByChannels(device).length > 0) {
      return;
    }

    onChange({ ...config, devices: config.devices.filter((item) => item.id !== device.id) });
    setPendingDelete(null);
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5" title="Устройства">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button onClick={addDevice} variant="secondary">
            Добавить устройство
          </Button>
          <span className="text-sm text-slate-500">
            У каждого устройства свои порт, скорость и Modbus-адрес.
          </span>
        </div>
        {config.devices.length === 0 ? (
          <Alert type="warning">Добавьте хотя бы одно Modbus-устройство.</Alert>
        ) : (
          <div className="space-y-3">
            {config.devices.map((device, index) => (
              <DeviceForm
                device={device}
                index={index}
                key={`${device.id}-${index}`}
                onChange={(nextDevice) => updateDevice(index, nextDevice)}
                onRequestDelete={() => setPendingDelete(device)}
                usedByChannels={getUsedByChannels(device)}
                validationErrors={validationErrors}
              />
            ))}
          </div>
        )}
      </Panel>

      {pendingDelete ? (
        <ConfirmDialog
          cancelText="Отмена"
          confirmText="Удалить"
          message="Устройство будет удалено после сохранения настроек."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteDevice(pendingDelete)}
          title="Удалить устройство?"
        />
      ) : null}
    </div>
  );
}

type DeviceFormProps = {
  device: DeviceConfig;
  index: number;
  usedByChannels: string[];
  validationErrors: ConfigValidationError[];
  onChange: (device: DeviceConfig) => void;
  onRequestDelete: () => void;
};

function DeviceForm({
  device,
  index,
  usedByChannels,
  validationErrors,
  onChange,
  onRequestDelete
}: DeviceFormProps): React.JSX.Element {
  const isUsed = usedByChannels.length > 0;

  function updateConnection(connection: ConnectionConfig): void {
    onChange({ ...device, connection });
  }

  return (
    <CollapsibleSection
      actions={
        <Button disabled={isUsed} onClick={onRequestDelete} variant="danger">
          Удалить
        </Button>
      }
      defaultOpen={index === 0}
      summary={<DeviceSummary device={device} usedByChannels={usedByChannels} />}
      title={`Устройство ${index + 1}: ${device.name || device.id}`}
    >
      {isUsed ? (
        <div className="mb-4">
          <Alert type="warning">
            Устройство используется каналами: {usedByChannels.join(', ')}. Перед удалением переназначьте каналы.
          </Alert>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-white/10 bg-slate-950/35 p-4">
          <h3 className="mb-4 text-sm font-medium text-slate-100">Устройство</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              error={getValidationError(validationErrors, `devices.${index}.id`)}
              hint="ID используется каналами для выбора устройства."
              label="ID устройства"
              onChange={(id) => onChange({ ...device, id })}
              value={device.id}
            />
            <TextInput
              error={getValidationError(validationErrors, `devices.${index}.name`)}
              label="Название"
              onChange={(name) => onChange({ ...device, name })}
              value={device.name}
            />
            <TextInput
              error={getValidationError(validationErrors, `devices.${index}.model`)}
              label="Модель"
              onChange={(model) => onChange({ ...device, model })}
              value={device.model}
            />
            <Select
              disabled
              label="Протокол"
              onChange={() => undefined}
              options={[{ label: 'modbus-rtu', value: 'modbus-rtu' }]}
              value={device.protocol}
            />
            <NumberInput
              error={getValidationError(validationErrors, `devices.${index}.modbusAddress`)}
              hint="Адрес slave-устройства: 1-247."
              label="Modbus-адрес"
              max={247}
              min={1}
              onChange={(modbusAddress) => onChange({ ...device, modbusAddress })}
              value={device.modbusAddress}
            />
            <Checkbox
              checked={device.active}
              label="Активно"
              onChange={(active) => onChange({ ...device, active })}
            />
          </div>
        </section>

        <section className="rounded-md border border-white/10 bg-slate-950/35 p-4">
          <h3 className="mb-4 text-sm font-medium text-slate-100">Подключение</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              error={getValidationError(validationErrors, `devices.${index}.connection.port`)}
              label="COM-порт"
              onChange={(port) => updateConnection({ ...device.connection, port })}
              placeholder="COM3"
              value={device.connection.port}
            />
            <NumberInput
              label="Скорость"
              min={1}
              onChange={(baudRate) => updateConnection({ ...device.connection, baudRate })}
              value={device.connection.baudRate}
            />
            <Select
              label="Биты данных"
              onChange={(dataBits) => updateConnection({ ...device.connection, dataBits })}
              options={[
                { label: '7', value: 7 },
                { label: '8', value: 8 }
              ]}
              value={device.connection.dataBits}
            />
            <Select
              label="Стоп-биты"
              onChange={(stopBits) => updateConnection({ ...device.connection, stopBits })}
              options={[
                { label: '1', value: 1 },
                { label: '2', value: 2 }
              ]}
              value={device.connection.stopBits}
            />
            <Select
              label="Четность"
              onChange={(parity) => updateConnection({ ...device.connection, parity })}
              options={[
                { label: 'none', value: 'none' },
                { label: 'even', value: 'even' },
                { label: 'odd', value: 'odd' }
              ]}
              value={device.connection.parity}
            />
            <NumberInput
              label="Timeout, ms"
              min={1}
              onChange={(timeoutMs) => updateConnection({ ...device.connection, timeoutMs })}
              value={device.connection.timeoutMs}
            />
            <NumberInput
              label="Повторы"
              min={0}
              onChange={(retries) => updateConnection({ ...device.connection, retries })}
              value={device.connection.retries}
            />
          </div>
        </section>
      </div>
    </CollapsibleSection>
  );
}

function DeviceSummary({
  device,
  usedByChannels
}: {
  device: DeviceConfig;
  usedByChannels: string[];
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <SummaryPill label="ID" value={device.id} />
      <SummaryPill label="Порт" value={device.connection.port} />
      <SummaryPill label="Скорость" value={String(device.connection.baudRate)} />
      <SummaryPill label="Адрес" value={String(device.modbusAddress)} />
      <SummaryPill label="Каналы" value={String(usedByChannels.length)} />
      <SummaryPill label="Статус" value={device.active ? 'Активно' : 'Неактивно'} />
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-300">
      <span className="text-slate-500">{label}: </span>
      {value}
    </span>
  );
}

function createDefaultConnection(): ConnectionConfig {
  return {
    type: 'modbus-rtu',
    port: 'COM3',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeoutMs: 1000,
    retries: 3
  };
}
