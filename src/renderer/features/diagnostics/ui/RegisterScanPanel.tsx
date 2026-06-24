import { useMemo, useState } from 'react';
import type { AppConfig, ChannelConfig } from '../../../../shared/types/config.types';
import type {
  RegisterScanRequest,
  RegisterScanResult,
  RegisterScanRow
} from '../../../../shared/types/monitoring.types';
import { formatDateTime } from '../../../../shared/lib/format';
import { createUniqueId } from '../../config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';

type RegisterScanPanelProps = {
  config: AppConfig;
};

export function RegisterScanPanel({ config }: RegisterScanPanelProps): React.JSX.Element {
  const [request, setRequest] = useState<RegisterScanRequest>({
    deviceId: config.devices[0]?.id ?? '',
    startAddress: 0,
    endAddress: 255,
    registerCount: config.channels[0]?.registerCount ?? 1,
    modbusFunctions: [3, 4],
    dataType: config.channels[0]?.dataType ?? 'float32',
    byteOrder: config.channels[0]?.byteOrder ?? 'ABCD'
  });
  const [result, setResult] = useState<RegisterScanResult | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const validationError = getValidationError(request);

  const columns = useMemo<DataTableColumn<RegisterScanRow>[]>(
    () => [
      { key: 'fn', title: 'Функция', render: (row) => (row.modbusFunction === 3 ? '3 Holding' : '4 Input') },
      { key: 'register', title: 'Регистр', render: (row) => row.registerAddress },
      {
        key: 'status',
        title: 'Статус',
        render: (row) => (
          <span className={row.success ? 'text-teal-200' : 'text-rose-200'}>
            {row.success ? 'Успех' : 'Ошибка'}
          </span>
        )
      },
      { key: 'registers', title: 'Registers', render: (row) => row.registers?.join(', ') ?? '—' },
      { key: 'decoded', title: 'Decoded', render: (row) => formatDecodedValue(row.decodedValue) },
      { key: 'message', title: 'Сообщение', render: (row) => row.error ?? row.message }
    ],
    []
  );

  async function handleScan(): Promise<void> {
    if (validationError) {
      return;
    }

    setIsScanning(true);
    try {
      const nextResult = await window.barrelMonitor.monitoring.scanRegisters(request);
      setResult(nextResult);
      const importResult = await importFoundChannels(config, request, nextResult);
      setImportMessage(
        `Найдено успешно: ${nextResult.successCount}. Создано каналов: ${importResult.created}. Дубликатов пропущено: ${importResult.skipped}.`
      );
    } finally {
      setIsScanning(false);
    }
  }

  function toggleFunction(modbusFunction: 3 | 4, enabled: boolean): void {
    setRequest((current) => ({
      ...current,
      modbusFunctions: enabled
        ? [...new Set([...current.modbusFunctions, modbusFunction])].sort()
        : current.modbusFunctions.filter((item) => item !== modbusFunction)
    }));
  }

  return (
    <Panel className="p-5" title="Автоматический поиск регистров">
      <div className="mb-4">
        <Alert type="warning">
          Большой диапазон может занять много времени. Для полного поиска увеличивайте диапазон частями.
        </Alert>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Select
          label="Устройство"
          onChange={(deviceId) => setRequest({ ...request, deviceId })}
          options={config.devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id }))}
          value={request.deviceId}
        />
        <NumberInput
          label="Начальный регистр"
          min={0}
          onChange={(startAddress) => setRequest({ ...request, startAddress })}
          value={request.startAddress}
        />
        <NumberInput
          label="Конечный регистр"
          min={0}
          onChange={(endAddress) => setRequest({ ...request, endAddress })}
          value={request.endAddress}
        />
        <NumberInput
          label="Кол-во регистров"
          max={8}
          min={1}
          onChange={(registerCount) => setRequest({ ...request, registerCount })}
          value={request.registerCount}
        />
        <Select
          label="Тип данных"
          onChange={(dataType) => setRequest({ ...request, dataType })}
          options={[
            { label: 'int16', value: 'int16' },
            { label: 'uint16', value: 'uint16' },
            { label: 'int32', value: 'int32' },
            { label: 'uint32', value: 'uint32' },
            { label: 'float32', value: 'float32' }
          ]}
          value={request.dataType}
        />
        <Select
          label="Порядок байтов"
          onChange={(byteOrder) => setRequest({ ...request, byteOrder })}
          options={[
            { label: 'ABCD', value: 'ABCD' },
            { label: 'CDAB', value: 'CDAB' },
            { label: 'BADC', value: 'BADC' },
            { label: 'DCBA', value: 'DCBA' }
          ]}
          value={request.byteOrder}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Checkbox
          checked={request.modbusFunctions.includes(3)}
          label="3 Holding"
          onChange={(checked) => toggleFunction(3, checked)}
        />
        <Checkbox
          checked={request.modbusFunctions.includes(4)}
          label="4 Input"
          onChange={(checked) => toggleFunction(4, checked)}
        />
      </div>

      {validationError ? (
        <div className="mt-4">
          <Alert type="error">{validationError}</Alert>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={isScanning || Boolean(validationError)} onClick={() => void handleScan()} variant="secondary">
          {isScanning ? 'Поиск...' : 'Начать поиск'}
        </Button>
        <Button
          disabled={isScanning || !result}
          onClick={() => {
            setResult(null);
            setImportMessage(null);
          }}
          variant="ghost"
        >
          Очистить результат
        </Button>
      </div>

      {result ? (
        <div className="mt-5 space-y-4">
          {importMessage ? <Alert type="success">{importMessage}</Alert> : null}
          <ScanSummary result={result} />
          <DataTable
            compact
            columns={columns}
            getRowKey={(row) => `${row.modbusFunction}-${row.registerAddress}`}
            maxHeight="520px"
            rows={result.rows}
          />
        </div>
      ) : null}
    </Panel>
  );
}

function ScanSummary({ result }: { result: RegisterScanResult }): React.JSX.Element {
  const durationMs = new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime();

  return (
    <div className="grid gap-2 text-sm md:grid-cols-5">
      <SummaryTile label="Всего" value={String(result.total)} />
      <SummaryTile label="Успешно" tone="ok" value={String(result.successCount)} />
      <SummaryTile label="Ошибок" tone="error" value={String(result.errorCount)} />
      <SummaryTile label="Время" value={`${Math.max(0, durationMs)} ms`} />
      <SummaryTile label="Завершено" value={formatDateTime(result.finishedAt)} />
    </div>
  );
}

type SummaryTileProps = {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'error';
};

function SummaryTile({ label, value, tone = 'default' }: SummaryTileProps): React.JSX.Element {
  const valueClassName =
    tone === 'ok' ? 'text-teal-100' : tone === 'error' ? 'text-rose-100' : 'text-slate-100';

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-medium ${valueClassName}`}>{value}</div>
    </div>
  );
}

function getValidationError(request: RegisterScanRequest): string | null {
  if (request.startAddress < 0) {
    return 'Начальный регистр должен быть >= 0.';
  }

  if (request.endAddress < request.startAddress) {
    return 'Конечный регистр должен быть больше или равен начальному.';
  }

  if (request.endAddress - request.startAddress + 1 > 256) {
    return 'За один запуск можно сканировать максимум 256 адресов.';
  }

  if (request.registerCount < 1 || request.registerCount > 8) {
    return 'Количество регистров должно быть от 1 до 8.';
  }

  if (request.modbusFunctions.length === 0) {
    return 'Выберите хотя бы одну Modbus-функцию.';
  }

  if (!request.deviceId) {
    return 'Выберите устройство.';
  }

  return null;
}

function formatDecodedValue(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return String(Number(value.toFixed(6)));
}

async function importFoundChannels(
  config: AppConfig,
  request: RegisterScanRequest,
  result: RegisterScanResult
): Promise<{ created: number; skipped: number }> {
  const successRows = result.rows.filter((row) => row.success);
  const existingChannelIds = config.channels.map((channel) => channel.id);
  const nextChannels: ChannelConfig[] = [...config.channels];
  let created = 0;
  let skipped = 0;

  successRows.forEach((row) => {
    const isDuplicate = nextChannels.some(
      (channel) =>
        channel.deviceId === request.deviceId &&
        channel.modbusFunction === row.modbusFunction &&
        channel.registerAddress === row.registerAddress &&
        channel.registerCount === request.registerCount &&
        channel.dataType === request.dataType &&
        channel.byteOrder === request.byteOrder
    );

    if (isDuplicate) {
      skipped += 1;
      return;
    }

    const id = createUniqueId(
      `${request.deviceId}-fn${row.modbusFunction}-reg${row.registerAddress}`,
      [...existingChannelIds, ...nextChannels.map((channel) => channel.id)]
    );
    nextChannels.push({
      id,
      name: `Найденный регистр ${row.registerAddress} (${row.modbusFunction === 3 ? '3 Holding' : '4 Input'})`,
      type: 'custom',
      deviceId: request.deviceId,
      moduleInputNumber: created + 1,
      registerAddress: row.registerAddress,
      modbusFunction: row.modbusFunction,
      dataType: request.dataType,
      registerCount: request.registerCount,
      byteOrder: request.byteOrder,
      rawUnit: 'raw',
      displayUnit: 'raw',
      decimals: 2,
      scaling: { type: 'none' }
    });
    created += 1;
  });

  if (created > 0) {
    const saveResult = await window.barrelMonitor.config.save({ ...config, channels: nextChannels });
    if (!saveResult.success) {
      throw new Error(saveResult.message ?? 'Не удалось сохранить найденные каналы');
    }
  }

  return { created, skipped };
}
