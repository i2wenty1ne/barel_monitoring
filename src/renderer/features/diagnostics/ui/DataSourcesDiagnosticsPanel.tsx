import { useTranslation } from 'react-i18next';
import type { DataSource } from '../../../../shared/types/config.types';
import { translateLiteral, translateLiteralNode } from '../../../shared/i18n/translateLiteral';
import { Alert } from '../../../shared/ui/Alert';
import { Panel } from '../../../shared/ui/Panel';

type DataSourcesDiagnosticsPanelProps = {
  dataSources: DataSource[];
};

export function DataSourcesDiagnosticsPanel({ dataSources }: DataSourcesDiagnosticsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Источники данных">
      {dataSources.length === 0 ? (
        <Alert type="warning">Источники данных не настроены.</Alert>
      ) : (
        <div className="grid gap-4">
          {dataSources.map((source) => (
            <div className="rounded-md border border-white/10 bg-slate-950/35 p-4" key={source.id}>
              {!source.enabled ? (
                <div className="mb-3">
                  <Alert type="warning">{`Источник отключен: ${source.name}`}</Alert>
                </div>
              ) : null}
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <InfoRow label="ID" value={source.id} />
                <InfoRow label="Название" value={source.name} />
                <InfoRow label="Тип" value={source.type} />
                <InfoRow label="Включен" value={source.enabled ? 'Да' : 'Нет'} />
                {source.connection.type === 'modbus-rtu' ? (
                  <>
                    <InfoRow label="COM-порт" value={source.connection.port} />
                    <InfoRow label="Скорость" value={String(source.connection.baudRate)} />
                    <InfoRow label="Slave ID" value={String(source.metadata?.slaveId ?? '—')} />
                  </>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{translateLiteral(t, label)}</dt>
      <dd className="min-w-0 break-words text-slate-200">{translateLiteralNode(t, value)}</dd>
    </div>
  );
}
