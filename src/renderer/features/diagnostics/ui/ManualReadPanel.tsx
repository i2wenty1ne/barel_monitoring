import { useState } from 'react';
import type { AppConfig } from '../../../../shared/types/config.types';
import type { ManualReadRequest, ManualReadResult } from '../../../../shared/types/monitoring.types';
import { stringifyPrettyJson } from '../../../../shared/lib/format';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { CodeBlock } from '../../../shared/ui/CodeBlock';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';

type ManualReadPanelProps = {
  config: AppConfig;
};

export function ManualReadPanel({ config }: ManualReadPanelProps): React.JSX.Element {
  const [request, setRequest] = useState<ManualReadRequest>({
    deviceAddress: config.device.modbusAddress,
    modbusFunction: 4,
    registerAddress: config.channels[0]?.registerAddress ?? 0,
    registerCount: config.channels[0]?.registerCount ?? 2,
    dataType: config.channels[0]?.dataType ?? 'float32',
    byteOrder: config.channels[0]?.byteOrder ?? 'ABCD'
  });
  const [result, setResult] = useState<ManualReadResult | null>(null);
  const [isReading, setIsReading] = useState(false);

  async function handleRead(): Promise<void> {
    setIsReading(true);
    try {
      const nextResult = await window.barrelMonitor.monitoring.readRegisters(request);
      setResult(nextResult);
    } finally {
      setIsReading(false);
    }
  }

  return (
    <Panel className="p-5" title="Ручное чтение регистров">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <NumberInput
          label="Адрес устройства"
          max={247}
          min={1}
          onChange={(deviceAddress) => setRequest({ ...request, deviceAddress })}
          value={request.deviceAddress ?? config.device.modbusAddress}
        />
        <Select
          label="Функция"
          onChange={(modbusFunction) => setRequest({ ...request, modbusFunction })}
          options={[
            { label: '3 Holding', value: 3 },
            { label: '4 Input', value: 4 }
          ]}
          value={request.modbusFunction}
        />
        <NumberInput
          label="Адрес регистра"
          min={0}
          onChange={(registerAddress) => setRequest({ ...request, registerAddress })}
          value={request.registerAddress}
        />
        <NumberInput
          label="Кол-во регистров"
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
      <div className="mt-4">
        <Button disabled={isReading} onClick={() => void handleRead()} variant="secondary">
          {isReading ? 'Чтение...' : 'Прочитать'}
        </Button>
      </div>
      {result ? (
        <div className="mt-4 space-y-3">
          <Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert>
          <CodeBlock
            value={stringifyPrettyJson({
              registers: result.registers ?? [],
              decodedValue: result.decodedValue,
              error: result.error
            })}
          />
        </div>
      ) : null}
    </Panel>
  );
}
