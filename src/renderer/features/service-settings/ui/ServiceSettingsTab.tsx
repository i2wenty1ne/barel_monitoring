import type { AppConfig } from '../../../../shared/types/config.types';
import type { SystemInfo } from '../../../../shared/types/ipc.types';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { DangerZone } from '../../../shared/ui/DangerZone';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';

type ServiceSettingsTabProps = {
  config: AppConfig;
  systemInfo: SystemInfo | null;
  onChange: (config: AppConfig) => void;
  onOpenConfigFolder: () => void;
  onOpenLogsFolder: () => void;
  onReloadConfig: () => void;
  onRequestResetToDefault: () => void;
};

export function ServiceSettingsTab({
  config,
  systemInfo,
  onChange,
  onOpenConfigFolder,
  onOpenLogsFolder,
  onReloadConfig,
  onRequestResetToDefault
}: ServiceSettingsTabProps): React.JSX.Element {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Panel className="p-5" title="Сервисные параметры">
        <div className="grid gap-4">
          <Select
            label="Режим данных"
            onChange={(mode) => onChange({ ...config, app: { ...config.app, mode } })}
            options={[
              { label: 'Симуляция', value: 'mock' },
              { label: 'Реальное оборудование', value: 'real' }
            ]}
            value={config.app.mode}
          />
          <div className="rounded-md border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
            При выборе реального режима будет использоваться Modbus RTU сервис для чтения данных.
          </div>
          <Checkbox
            checked={config.app.simulationCommandsOnly}
            hint="Когда включено, команды проходят проверки и историю, но не пишутся в оборудование."
            label="Только симуляция команд"
            onChange={(simulationCommandsOnly) => onChange({ ...config, app: { ...config.app, simulationCommandsOnly } })}
          />
          <Checkbox
            checked={config.app.realWriteEnabled}
            disabled={config.app.mode !== 'real'}
            hint="Разрешает реальную запись команд в Modbus. Для выполнения записи также отключите симуляцию команд."
            label="Разрешить реальную запись в Modbus"
            onChange={(realWriteEnabled) => onChange({ ...config, app: { ...config.app, realWriteEnabled } })}
          />
          {config.app.mode === 'real' ? (
            <Alert type="warning">
              Для реального режима требуется подключённый USB-RS485 адаптер и корректные параметры Modbus.
              Команды пишутся в оборудование только когда включена реальная запись и выключена симуляция команд.
            </Alert>
          ) : null}
        </div>
      </Panel>

      <Panel className="p-5" title="Файлы и действия">
        <dl className="grid gap-3 text-sm">
          <InfoRow label="Версия" value={systemInfo?.appVersion ?? '—'} />
          <InfoRow label="Платформа" value={systemInfo?.platform ?? '—'} />
          <InfoRow label="Конфиг" value={systemInfo?.configPath ?? '—'} />
          <InfoRow label="Журнал" value={systemInfo?.logsPath ?? '—'} />
          <InfoRow label="Текущий режим" value={config.app.mode === 'mock' ? 'Симуляция' : 'Реальное оборудование'} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onOpenConfigFolder} variant="secondary">
            Открыть папку конфигурации
          </Button>
          <Button onClick={onOpenLogsFolder} variant="secondary">
            Открыть папку логов
          </Button>
          <Button onClick={onReloadConfig} variant="ghost">
            Перечитать config.json
          </Button>
        </div>
        <div className="mt-5">
          <DangerZone
            description="Файл конфигурации будет перезаписан настройками по умолчанию после подтверждения."
            title="Сброс конфигурации"
          >
            <Button onClick={onRequestResetToDefault} variant="danger">
              Сбросить настройки
            </Button>
          </DangerZone>
        </div>
      </Panel>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}
