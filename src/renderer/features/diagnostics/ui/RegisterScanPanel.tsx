import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppConfig, Point } from '../../../../shared/types/config.types';
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
import { translateLiteral } from '../../../shared/i18n/translateLiteral';

type RegisterScanPanelProps = {
  config: AppConfig;
  onConfigChanged?: () => Promise<void>;
};

type ImportMessage = {
  type: 'info' | 'success';
  text: string;
};

type ImportFoundPointsResult = {
  found: number;
  created: number;
  existing: number;
};

export function RegisterScanPanel({ config, onConfigChanged }: RegisterScanPanelProps): React.JSX.Element {
  const modbusSources = config.dataSources.filter((source) => source.type === 'modbus-rtu' && source.connection.type === 'modbus-rtu');
  const defaultPoint = config.points.find((point) => point.address?.protocol === 'modbus' && point.dataSourceId);
  const [request, setRequest] = useState<RegisterScanRequest>({
    dataSourceId: defaultPoint?.dataSourceId ?? modbusSources[0]?.id ?? '',
    startAddress: 0,
    endAddress: 255,
    registerCount: defaultPoint?.address?.protocol === 'modbus' ? defaultPoint.address.registerCount ?? 1 : 1,
    modbusFunctions: [3, 4],
    dataType: defaultPoint?.valueType !== 'boolean' && defaultPoint?.valueType !== 'string' ? defaultPoint?.valueType ?? 'float32' : 'float32',
    byteOrder: defaultPoint?.address?.protocol === 'modbus' ? defaultPoint.address.byteOrder ?? 'ABCD' : 'ABCD',
    attemptsPerRegister: 3,
    retryDelayMs: 80
  });
  const [result, setResult] = useState<RegisterScanResult | null>(null);
  const [importMessage, setImportMessage] = useState<ImportMessage | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const validationError = getValidationError(request);

  const columns = useMemo<DataTableColumn<RegisterScanRow>[]>(
    () => [
      { key: 'fn', title: 'Функция', render: (row) => (row.modbusFunction === 3 ? '3 Holding' : '4 Input') },
      { key: 'register', title: 'Регистр', render: (row) => row.registerAddress },
      { key: 'attempts', title: 'Попытки', render: (row) => row.attempts ?? 1 },
      {
        key: 'status',
        title: 'Статус',
        render: (row) => (
          <span className={row.success ? 'text-teal-200' : 'text-rose-200'}>
            {row.success ? 'Успех' : 'Ошибка'}
          </span>
        )
      },
      { key: 'registers', title: 'Значения регистров', render: (row) => row.registers?.join(', ') ?? '—' },
      { key: 'decoded', title: 'Расшифровано', render: (row) => formatDecodedValue(row.decodedValue) },
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
      const importResult = await importFoundPoints(config, request, nextResult);
      if (importResult.created > 0) {
        await onConfigChanged?.();
      }
      setImportMessage(createImportMessage(importResult));
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

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <Select
          label="Источник данных"
          onChange={(dataSourceId) => setRequest({ ...request, dataSourceId })}
          options={modbusSources.map((source) => ({ label: `${source.name} (${source.id})`, value: source.id }))}
          value={request.dataSourceId}
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
        <NumberInput
          label="Попыток на регистр"
          max={10}
          min={1}
          onChange={(attemptsPerRegister) => setRequest({ ...request, attemptsPerRegister })}
          value={request.attemptsPerRegister ?? 3}
        />
        <NumberInput
          label="Пауза, мс"
          max={5000}
          min={0}
          onChange={(retryDelayMs) => setRequest({ ...request, retryDelayMs })}
          value={request.retryDelayMs ?? 80}
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

      <div className="mt-4">
        <Alert type="info">
          Каждый адрес опрашивается до {request.attemptsPerRegister ?? 3} раз. Это снижает ложные ошибки, если устройство отвечает с задержкой.
        </Alert>
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
          {importMessage ? <Alert type={importMessage.type}>{importMessage.text}</Alert> : null}
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
  const { t } = useTranslation();
  const valueClassName =
    tone === 'ok' ? 'text-teal-100' : tone === 'error' ? 'text-rose-100' : 'text-slate-100';

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="text-xs text-slate-500">{translateLiteral(t, label)}</div>
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

  if ((request.attemptsPerRegister ?? 1) < 1 || (request.attemptsPerRegister ?? 1) > 10) {
    return 'Количество попыток на регистр должно быть от 1 до 10.';
  }

  if ((request.retryDelayMs ?? 0) < 0 || (request.retryDelayMs ?? 0) > 5000) {
    return 'Пауза между попытками должна быть от 0 до 5000 мс.';
  }

  if (request.modbusFunctions.length === 0) {
    return 'Выберите хотя бы одну Modbus-функцию.';
  }

  if (!request.dataSourceId) {
    return 'Выберите источник данных.';
  }

  return null;
}

function formatDecodedValue(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return String(Number(value.toFixed(6)));
}

async function importFoundPoints(
  config: AppConfig,
  request: RegisterScanRequest,
  result: RegisterScanResult
): Promise<ImportFoundPointsResult> {
  const successRows = result.rows.filter((row) => row.success);
  const existingPointIds = config.points.map((point) => point.id);
  const nextPoints: Point[] = [...config.points];
  const dataSource = config.dataSources.find((source) => source.id === request.dataSourceId);
  const slaveId = typeof dataSource?.metadata?.slaveId === 'number' ? dataSource.metadata.slaveId : 1;
  let created = 0;
  let existing = 0;

  successRows.forEach((row) => {
    const addressSignature = createScanAddressSignature(request, row);
    const isExistingPoint = nextPoints.some((point) => createPointAddressSignature(point) === addressSignature);

    if (isExistingPoint) {
      existing += 1;
      return;
    }

    const id = createUniqueId(
      `${request.dataSourceId}-fn${row.modbusFunction}-reg${row.registerAddress}`,
      [...existingPointIds, ...nextPoints.map((point) => point.id)]
    );
    const now = new Date().toISOString();
    nextPoints.push({
      id,
      name: `Найденный регистр ${row.registerAddress} (${row.modbusFunction === 3 ? '3 Holding' : '4 Input'})`,
      kind: 'telemetry',
      dataSourceId: request.dataSourceId,
      valueType: request.dataType,
      rawUnit: 'raw',
      displayUnit: 'raw',
      address: {
        protocol: 'modbus',
        slaveId,
        area: row.modbusFunction === 3 ? 'holding-register' : 'input-register',
        functionCode: row.modbusFunction,
        registerAddress: row.registerAddress,
        registerCount: request.registerCount,
        valueType: request.dataType,
        byteOrder: request.byteOrder
      },
      scaling: { type: 'none' },
      recordable: true,
      enabled: true,
      createdAt: now,
      updatedAt: now
    });
    created += 1;
  });

  if (created > 0) {
    const saveResult = await window.barrelMonitor.config.save({ ...config, points: nextPoints });
    if (!saveResult.success) {
      throw new Error(saveResult.message ?? 'Не удалось сохранить найденные точки');
    }
  }

  return { found: successRows.length, created, existing };
}

function createImportMessage(result: ImportFoundPointsResult): ImportMessage {
  if (result.found === 0) {
    return {
      type: 'info',
      text: 'Поиск завершен: успешных регистров не найдено, точки данных не создавались.'
    };
  }

  return {
    type: result.created > 0 ? 'success' : 'info',
    text: `Найдено регистров: ${result.found}. Создано точек: ${result.created}. Уже существовало: ${result.existing}.`
  };
}

function createScanAddressSignature(request: RegisterScanRequest, row: RegisterScanRow): string {
  return [
    request.dataSourceId,
    'modbus',
    row.modbusFunction,
    row.registerAddress,
    request.registerCount,
    request.dataType,
    request.byteOrder
  ].join('|');
}

function createPointAddressSignature(point: Point): string | null {
  if (point.address?.protocol !== 'modbus') {
    return null;
  }

  return [
    point.dataSourceId ?? '',
    point.address.protocol,
    point.address.functionCode,
    point.address.registerAddress ?? '',
    point.address.registerCount ?? '',
    point.valueType,
    point.address.byteOrder ?? 'ABCD'
  ].join('|');
}
