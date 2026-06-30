import { useEffect, useState } from 'react';
import type {
  Actuator,
  ActuatorType,
  Command,
  CommandResult,
  CommandType,
  ControlPoint,
  DataSource,
  Interlock,
  Point
} from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { createUniqueId } from '../../../features/config-editor/model/config-editor.utils';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type ActuatorDraft = {
  id: string;
  name: string;
  type: ActuatorType;
  assetId: string;
  dataSourceId: string;
  commandPointId: string;
  feedbackPointId: string;
  supportedCommands: CommandType[];
  writeMode: WriteMode;
  coilAddress: number;
  outputNumber: number;
  maskRegisterAddress: number;
  slaveId: number;
  requiresConfirmation: boolean;
  safetyLevel: ControlPoint['safetyLevel'];
  enabled: boolean;
  isNew: boolean;
};

type PendingCommand = {
  actuator: Actuator;
  commandType: CommandType;
  controlPoint: ControlPoint;
  value: boolean | number | string;
};

type InterlockDraft = {
  targetActuatorId: string;
  targetCommand: CommandType;
  pointId: string;
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  expected: string;
  effect: Interlock['effect'];
  message: string;
};

type WriteMode = 'mu110-mask-fc16' | 'coil-fc5';

const actuatorTypes: ActuatorType[] = ['pump', 'valve', 'relay', 'led', 'motor', 'heater', 'fan', 'alarm', 'custom'];
const commandTypes: CommandType[] = ['start', 'stop', 'open', 'close', 'turnOn', 'turnOff', 'reset', 'setValue', 'custom'];
const interlockOperators: InterlockDraft['operator'][] = ['<', '<=', '>', '>=', '==', '!='];
const writeModeOptions: Array<{ label: string; value: WriteMode }> = [
  { label: 'МУ110: регистр маски выходов (FC16)', value: 'mu110-mask-fc16' },
  { label: 'Coil (FC5)', value: 'coil-fc5' }
];
const defaultCommandsByType: Record<ActuatorType, CommandType[]> = {
  pump: ['start', 'stop'],
  valve: ['open', 'close'],
  relay: ['turnOn', 'turnOff'],
  led: ['turnOn', 'turnOff'],
  motor: ['start', 'stop'],
  heater: ['turnOn', 'turnOff'],
  fan: ['start', 'stop'],
  alarm: ['turnOn', 'turnOff', 'reset'],
  custom: ['custom']
};

export function ActuatorsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ActuatorDraft | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);
  const [criticalConfirmation, setCriticalConfirmation] = useState('');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [interlockDraft, setInterlockDraft] = useState<InterlockDraft | null>(null);

  useEffect(() => {
    if (!config) {
      return;
    }

    void window.barrelMonitor.commands.getHistory({ limit: 50 }).then(setCommandHistory);
  }, [config?.commands.length]);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const currentConfig = config;
  const controlPoints = currentConfig.points.filter((point): point is ControlPoint => point.kind === 'control');
  const telemetryPoints = currentConfig.points.filter((point) => point.kind === 'telemetry' || point.kind === 'calculated');
  const actuatorColumns: DataTableColumn<Actuator>[] = [
    {
      key: 'name',
      title: 'Механизм',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-100">{item.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{item.id}</div>
        </div>
      )
    },
    { key: 'type', title: 'Тип', render: (item) => <Badge tone="info">{item.type}</Badge> },
    { key: 'asset', title: 'Asset', render: (item) => currentConfig.assets.find((asset) => asset.id === item.assetId)?.name ?? item.assetId ?? '-' },
    { key: 'points', title: 'Control/feedback', render: (item) => `${item.commandPointIds.length}/${item.feedbackPointIds.length}` },
    { key: 'commands', title: 'Команды', render: (item) => item.supportedCommands.join(', ') || '-' },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'warning'}>{item.enabled ? 'enabled' : 'disabled'}</Badge> },
    {
      key: 'actions',
      title: '',
      render: (item) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={isSaving} onClick={() => setDraft(createDraftFromActuator(item, currentConfig.points))} variant="secondary">
            Редактировать
          </Button>
          <Button disabled={isSaving} onClick={() => void deleteActuator(item)} variant="danger">
            Удалить
          </Button>
        </div>
      )
    }
  ];
  const historyColumns: DataTableColumn<Command>[] = [
    {
      key: 'requestedAt',
      title: 'Время',
      render: (item) => new Date(item.requestedAt).toLocaleString()
    },
    {
      key: 'actuator',
      title: 'Механизм',
      render: (item) => currentConfig.actuators.find((actuator) => actuator.id === item.actuatorId)?.name ?? item.actuatorId
    },
    { key: 'command', title: 'Команда', render: (item) => item.commandType },
    { key: 'status', title: 'Статус', render: (item) => <CommandStatusBadge status={item.status} /> },
    { key: 'result', title: 'Result', render: (item) => item.result?.success ? 'success' : item.error ?? item.result?.error ?? '-' }
  ];
  const interlockColumns: DataTableColumn<Interlock>[] = [
    {
      key: 'name',
      title: 'Interlock',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-100">{item.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{item.condition}</div>
        </div>
      )
    },
    {
      key: 'target',
      title: 'Target',
      render: (item) => `${currentConfig.actuators.find((actuator) => actuator.id === item.targetActuatorId)?.name ?? item.targetActuatorId} / ${item.targetCommand}`
    },
    { key: 'effect', title: 'Effect', render: (item) => <Badge tone={item.effect === 'block' ? 'danger' : 'warning'}>{item.effect}</Badge> },
    { key: 'enabled', title: 'Статус', render: (item) => <Badge tone={item.enabled ? 'success' : 'neutral'}>{item.enabled ? 'enabled' : 'disabled'}</Badge> },
    {
      key: 'actions',
      title: '',
      render: (item) => (
        <Button disabled={isSaving} onClick={() => void deleteInterlock(item)} variant="danger">
          Удалить
        </Button>
      )
    }
  ];

  async function save(nextConfig: typeof currentConfig, successMessage: string): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setSaveError(null);
    setLastResult(null);
    try {
      const result = await window.barrelMonitor.config.save(nextConfig);
      if (!result.success) {
        throw new Error(result.message ?? 'Не удалось сохранить config');
      }
      setMessage(successMessage);
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения config');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }

    if (draft.supportedCommands.length === 0) {
      setSaveError('Выберите хотя бы одну supported command.');
      return;
    }

    const now = new Date().toISOString();
    const commandPoint = createControlPointFromDraft(draft, currentConfig.dataSources, now);
    const actuator: Actuator = {
      id: draft.id,
      name: draft.name.trim() || draft.id,
      type: draft.type,
      assetId: draft.assetId || undefined,
      commandPointIds: [draft.commandPointId],
      feedbackPointIds: draft.feedbackPointId ? [draft.feedbackPointId] : [],
      supportedCommands: draft.supportedCommands,
      enabled: draft.enabled,
      createdAt: currentConfig.actuators.find((item) => item.id === draft.id)?.createdAt ?? now,
      updatedAt: now
    };
    const existingActuatorIds = new Set(currentConfig.actuators.map((item) => item.id));
    const existingActuator = currentConfig.actuators.find((item) => item.id === draft.id);
    const pointIdsToReplace = new Set([draft.commandPointId, ...(existingActuator?.commandPointIds ?? [])]);

    await save(
      {
        ...currentConfig,
        actuators: existingActuatorIds.has(actuator.id)
          ? currentConfig.actuators.map((item) => item.id === actuator.id ? actuator : item)
          : [...currentConfig.actuators, actuator],
        points: [
          ...currentConfig.points.filter((point) => !pointIdsToReplace.has(point.id)),
          commandPoint
        ],
        assets: currentConfig.assets.map((asset) => {
          const withoutActuator = asset.actuatorIds.filter((actuatorId) => actuatorId !== actuator.id);
          const withoutCommandPoint = asset.pointIds.filter((pointId) => !pointIdsToReplace.has(pointId));
          return asset.id === actuator.assetId
            ? {
                ...asset,
                actuatorIds: [...withoutActuator, actuator.id],
                pointIds: [...withoutCommandPoint, commandPoint.id],
                updatedAt: now
              }
            : {
                ...asset,
                actuatorIds: withoutActuator,
                pointIds: withoutCommandPoint,
                updatedAt: now
              };
        })
      },
      draft.isNew ? 'Actuator и ControlPoint созданы' : 'Actuator и ControlPoint сохранены'
    );
    setDraft(null);
  }

  async function deleteActuator(actuator: Actuator): Promise<void> {
    const commandPointIds = new Set(actuator.commandPointIds);
    const removedPointIds = new Set(actuator.commandPointIds);
    await save(
      {
        ...currentConfig,
        actuators: currentConfig.actuators.filter((item) => item.id !== actuator.id),
        interlocks: currentConfig.interlocks.filter((interlock) => interlock.targetActuatorId !== actuator.id),
        commands: currentConfig.commands.filter((command) => command.actuatorId !== actuator.id),
        points: currentConfig.points.filter((point) => !commandPointIds.has(point.id)),
        assets: currentConfig.assets.map((asset) => ({
          ...asset,
          actuatorIds: asset.actuatorIds.filter((actuatorId) => actuatorId !== actuator.id),
          pointIds: asset.pointIds.filter((pointId) => !removedPointIds.has(pointId))
        })),
        monitoringProfiles: currentConfig.monitoringProfiles.map((profile) => ({
          ...profile,
          pointConfigs: profile.pointConfigs.filter((pointConfig) => !removedPointIds.has(pointConfig.pointId))
        }))
      },
      'Исполнительный механизм удален'
    );
  }

  async function executeCommand(command: PendingCommand, confirmed: boolean): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setSaveError(null);
    setLastResult(null);
    try {
      const result = await window.barrelMonitor.commands.execute({
        actuatorId: command.actuator.id,
        commandType: command.commandType,
        value: command.value,
        confirmed,
        requestedBy: 'operator'
      });
      setLastResult(result);
      if (!result.success) {
        throw new Error(result.error ?? 'Команда не выполнена');
      }
      setMessage(`Command ${command.commandType} выполнена`);
      setCommandHistory(await window.barrelMonitor.commands.getHistory({ limit: 50 }));
      await refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка выполнения команды');
      setCommandHistory(await window.barrelMonitor.commands.getHistory({ limit: 50 }));
      await refresh();
    } finally {
      setPendingCommand(null);
      setCriticalConfirmation('');
      setIsSaving(false);
    }
  }

  function requestCommand(actuator: Actuator, commandType: CommandType): void {
    const controlPoint = findControlPoint(currentConfig.points, actuator);
    if (!controlPoint) {
      setSaveError('У механизма нет ControlPoint.');
      return;
    }

    const command: PendingCommand = {
      actuator,
      commandType,
      controlPoint,
      value: getCommandValue(commandType)
    };
    const needsConfirmation = controlPoint.requiresConfirmation || controlPoint.safetyLevel !== 'normal';

    if (needsConfirmation) {
      setPendingCommand(command);
      setCriticalConfirmation('');
      return;
    }

    void executeCommand(command, false);
  }

  async function saveInterlock(): Promise<void> {
    if (!interlockDraft) {
      return;
    }

    const actuator = currentConfig.actuators.find((item) => item.id === interlockDraft.targetActuatorId);
    const point = currentConfig.points.find((item) => item.id === interlockDraft.pointId);
    if (!actuator || !point) {
      setSaveError('Выберите actuator и point для interlock.');
      return;
    }

    const now = new Date().toISOString();
    const condition = `${interlockDraft.pointId} ${interlockDraft.operator} ${interlockDraft.expected}`;
    const interlock: Interlock = {
      id: createUniqueId(`${actuator.id}-${interlockDraft.targetCommand}-interlock`, currentConfig.interlocks.map((item) => item.id)),
      name: `${actuator.name}: ${point.name}`,
      targetActuatorId: actuator.id,
      targetCommand: interlockDraft.targetCommand,
      enabled: true,
      condition,
      effect: interlockDraft.effect,
      message: interlockDraft.message.trim() || `Command ${interlockDraft.targetCommand} blocked by ${condition}`,
      createdAt: now,
      updatedAt: now
    };

    await save(
      {
        ...currentConfig,
        interlocks: [...currentConfig.interlocks, interlock]
      },
      'Interlock сохранен'
    );
    setInterlockDraft(null);
  }

  async function deleteInterlock(interlock: Interlock): Promise<void> {
    await save(
      {
        ...currentConfig,
        interlocks: currentConfig.interlocks.filter((item) => item.id !== interlock.id)
      },
      'Interlock удален'
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="Исполнительные механизмы"
        description="Механизмы, точки управления, безопасные команды симуляции, блокировки и история команд."
        actions={
          <Button disabled={isSaving} onClick={() => setDraft(createNewDraft(currentConfig))} variant="secondary">
            Создать actuator
          </Button>
        }
      />
      <div className="space-y-5">
        {message ? <Alert type="success">{message}</Alert> : null}
        {saveError ? <Alert type="error">{saveError}</Alert> : null}
        {lastResult ? (
          <Alert type={lastResult.success ? 'success' : 'error'} title="Результат команды">
            commandId: {lastResult.commandId}; feedback: {lastResult.feedbackPointId ?? '-'} = {String(lastResult.feedbackValue ?? '-')}; error: {lastResult.error ?? '-'}
          </Alert>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Panel className="p-5" title="Механизмы">
            {currentConfig.actuators.length === 0 ? (
              <EmptyState title="Механизмы ещё не настроены" description="Создайте actuator: он автоматически получит ControlPoint для simulation command." />
            ) : (
              <DataTable compact columns={actuatorColumns} getRowKey={(item) => item.id} rows={currentConfig.actuators} />
            )}
          </Panel>

          <Panel className="p-5" title="Команды">
            <div className="space-y-4">
              <Alert type={currentConfig.app.mode === 'real' && currentConfig.app.realWriteEnabled && !currentConfig.app.simulationCommandsOnly ? 'warning' : 'info'}>
                {currentConfig.app.mode === 'real' && currentConfig.app.realWriteEnabled && !currentConfig.app.simulationCommandsOnly
                  ? 'Real write mode enabled. Команды выполнят реальную запись в Modbus после проверок CommandService.'
                  : 'Simulation mode: команды валидируются, пишутся в event log и command history без записи в железо.'}
              </Alert>
              {currentConfig.actuators.length === 0 ? (
                <EmptyState title="Нет actuator для команд" description="Создайте механизм слева." />
              ) : (
                currentConfig.actuators.map((actuator) => {
                  const controlPoint = findControlPoint(currentConfig.points, actuator);
                  return (
                    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3" key={actuator.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-100">{actuator.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {controlPoint ? `${controlPoint.safetyLevel}${controlPoint.requiresConfirmation ? ', confirmation' : ''}` : 'ControlPoint не найден'}
                          </div>
                        </div>
                        <Badge tone={actuator.enabled ? 'success' : 'warning'}>{actuator.enabled ? 'enabled' : 'disabled'}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actuator.supportedCommands.map((commandType) => (
                          <Button
                            disabled={isSaving || !actuator.enabled || !controlPoint}
                            key={commandType}
                            onClick={() => requestCommand(actuator, commandType)}
                            variant="secondary"
                          >
                            {commandType}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </div>

        {draft ? (
          <Panel className="p-5" title={draft.isNew ? 'Создание Actuator + ControlPoint' : `Редактирование: ${draft.name}`}>
            <ActuatorForm
              controlPoints={controlPoints}
              dataSources={currentConfig.dataSources}
              draft={draft}
              feedbackPoints={telemetryPoints}
              onChange={setDraft}
              assets={currentConfig.assets}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={() => void saveDraft()} variant="primary">
                Сохранить
              </Button>
              <Button disabled={isSaving} onClick={() => setDraft(null)} variant="ghost">
                Отмена
              </Button>
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Panel className="p-5" title="Блокировки">
            <div className="space-y-4">
              {currentConfig.actuators.length > 0 && telemetryPoints.length > 0 ? (
                <Button disabled={isSaving} onClick={() => setInterlockDraft(createDefaultInterlockDraft(currentConfig.actuators, telemetryPoints))} variant="secondary">
                  Создать interlock
                </Button>
              ) : null}
              {interlockDraft ? (
                <InterlockForm
                  actuators={currentConfig.actuators}
                  draft={interlockDraft}
                  onChange={setInterlockDraft}
                  points={telemetryPoints}
                />
              ) : null}
              {interlockDraft ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isSaving} onClick={() => void saveInterlock()} variant="primary">
                    Сохранить interlock
                  </Button>
                  <Button disabled={isSaving} onClick={() => setInterlockDraft(null)} variant="ghost">
                    Отмена
                  </Button>
                </div>
              ) : null}
              {currentConfig.interlocks.length === 0 ? (
                <EmptyState title="Interlocks не настроены" description="Добавьте правило, например запрет пуска при низком уровне." />
              ) : (
                <DataTable compact columns={interlockColumns} getRowKey={(item) => item.id} rows={currentConfig.interlocks} />
              )}
            </div>
          </Panel>

          <Panel className="p-5" title="История команд">
            {commandHistory.length === 0 ? (
              <EmptyState title="Команд ещё нет" description="Выполните simulation command, чтобы увидеть CommandResult." />
            ) : (
              <DataTable compact columns={historyColumns} getRowKey={(item) => item.id} maxHeight="420px" rows={commandHistory} />
            )}
          </Panel>
        </div>
      </div>

      {pendingCommand ? (
        <ConfirmDialog
          cancelText="Отмена"
          confirmDisabled={pendingCommand.controlPoint.safetyLevel === 'critical' && criticalConfirmation !== 'ПОДТВЕРЖДАЮ'}
          confirmText="Выполнить"
          details={
            <div className="space-y-3">
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                {pendingCommand.actuator.name} / {pendingCommand.commandType} / value: {String(pendingCommand.value)}
              </div>
              {pendingCommand.controlPoint.safetyLevel === 'critical' ? (
                <TextInput
                  hint="Для critical-команды введите ПОДТВЕРЖДАЮ"
                  label="Подтверждение"
                  onChange={setCriticalConfirmation}
                  value={criticalConfirmation}
                />
              ) : null}
            </div>
          }
          message="Команда требует подтверждения перед выполнением."
          onCancel={() => {
            setPendingCommand(null);
            setCriticalConfirmation('');
          }}
          onConfirm={() => void executeCommand(pendingCommand, true)}
          title="Подтвердить command"
        />
      ) : null}
    </section>
  );
}

function ActuatorForm({
  assets,
  controlPoints,
  dataSources,
  draft,
  feedbackPoints,
  onChange
}: {
  assets: Array<{ id: string; name: string }>;
  controlPoints: ControlPoint[];
  dataSources: DataSource[];
  draft: ActuatorDraft;
  feedbackPoints: Point[];
  onChange: (draft: ActuatorDraft) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput disabled={!draft.isNew} label="ID" onChange={(id) => onChange({ ...draft, id })} value={draft.id} />
        <TextInput label="Название" onChange={(name) => onChange({ ...draft, name })} value={draft.name} />
        <Select
          label="Тип"
          onChange={(type) => onChange({ ...draft, type, supportedCommands: defaultCommandsByType[type] })}
          options={actuatorTypes.map((type) => ({ label: type, value: type }))}
          value={draft.type}
        />
        <Select
          label="Объект"
          onChange={(assetId) => onChange({ ...draft, assetId })}
          options={[{ label: '-', value: '' }, ...assets.map((asset) => ({ label: asset.name, value: asset.id }))]}
          value={draft.assetId}
        />
        <Select
          label="Источник данных"
          onChange={(dataSourceId) => onChange({ ...draft, dataSourceId })}
          options={[{ label: '-', value: '' }, ...dataSources.map((source) => ({ label: source.name, value: source.id }))]}
          value={draft.dataSourceId}
        />
        <Select
          label="Точка обратной связи"
          onChange={(feedbackPointId) => onChange({ ...draft, feedbackPointId })}
          options={[{ label: '-', value: '' }, ...feedbackPoints.map((point) => ({ label: point.name, value: point.id }))]}
          value={draft.feedbackPointId}
        />
        <TextInput label="ID точки управления" onChange={(commandPointId) => onChange({ ...draft, commandPointId })} value={draft.commandPointId} />
        <Select
          label="Режим записи"
          onChange={(writeMode) => onChange({ ...draft, writeMode })}
          options={writeModeOptions}
          value={draft.writeMode}
        />
        <NumberInput label="Адрес Modbus" min={1} max={247} onChange={(slaveId) => onChange({ ...draft, slaveId })} value={draft.slaveId} />
        {draft.writeMode === 'mu110-mask-fc16' ? (
          <>
            <NumberInput
              hint="DO1 = bitIndex 0, DO16 = bitIndex 15"
              label="Выход DO"
              min={1}
              max={16}
              onChange={(outputNumber) => onChange({ ...draft, outputNumber })}
              value={draft.outputNumber}
            />
            <NumberInput
              hint="Для МУ110-224.16Р по документации: 50 / 0x0032"
              label="Регистр маски"
              min={0}
              onChange={(maskRegisterAddress) => onChange({ ...draft, maskRegisterAddress })}
              value={draft.maskRegisterAddress}
            />
          </>
        ) : (
          <NumberInput label="Адрес coil" min={0} onChange={(coilAddress) => onChange({ ...draft, coilAddress })} value={draft.coilAddress} />
        )}
        <Select
          label="Уровень безопасности"
          onChange={(safetyLevel) => onChange({ ...draft, safetyLevel })}
          options={[
            { label: 'normal', value: 'normal' },
            { label: 'dangerous', value: 'dangerous' },
            { label: 'critical', value: 'critical' }
          ]}
          value={draft.safetyLevel}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <Checkbox
          checked={draft.enabled}
          label="Механизм включен"
          onChange={(enabled) => onChange({ ...draft, enabled })}
        />
        <Checkbox
          checked={draft.requiresConfirmation}
          label="Требует подтверждения"
          onChange={(requiresConfirmation) => onChange({ ...draft, requiresConfirmation })}
        />
        <Checkbox
          checked={controlPoints.some((point) => point.id === draft.commandPointId)}
          disabled
          label="Точка управления связана"
          hint={draft.commandPointId}
          onChange={() => undefined}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        {commandTypes.map((commandType) => (
          <Checkbox
            checked={draft.supportedCommands.includes(commandType)}
            key={commandType}
            label={commandType}
            onChange={(checked) => onChange({ ...draft, supportedCommands: toggleCommand(draft.supportedCommands, commandType, checked) })}
          />
        ))}
      </div>
    </div>
  );
}

function InterlockForm({
  actuators,
  draft,
  onChange,
  points
}: {
  actuators: Actuator[];
  draft: InterlockDraft;
  onChange: (draft: InterlockDraft) => void;
  points: Point[];
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <Select
        label="Механизм"
        onChange={(targetActuatorId) => onChange({ ...draft, targetActuatorId })}
        options={actuators.map((actuator) => ({ label: actuator.name, value: actuator.id }))}
        value={draft.targetActuatorId}
      />
      <Select
        label="Команда"
        onChange={(targetCommand) => onChange({ ...draft, targetCommand })}
        options={commandTypes.map((commandType) => ({ label: commandType, value: commandType }))}
        value={draft.targetCommand}
      />
      <Select
        label="Точка"
        onChange={(pointId) => onChange({ ...draft, pointId })}
        options={points.map((point) => ({ label: point.name, value: point.id }))}
        value={draft.pointId}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Оператор"
          onChange={(operator) => onChange({ ...draft, operator })}
          options={interlockOperators.map((operator) => ({ label: operator, value: operator }))}
          value={draft.operator}
        />
        <TextInput label="Ожидаемое значение" onChange={(expected) => onChange({ ...draft, expected })} value={draft.expected} />
        <Select
          label="Действие"
          onChange={(effect) => onChange({ ...draft, effect })}
          options={[{ label: 'block', value: 'block' }, { label: 'warn', value: 'warn' }]}
          value={draft.effect}
        />
      </div>
      <TextInput label="Сообщение" onChange={(message) => onChange({ ...draft, message })} value={draft.message} />
    </div>
  );
}

function CommandStatusBadge({ status }: { status: Command['status'] }): React.JSX.Element {
  const tone = status === 'confirmed' || status === 'sent'
    ? 'success'
    : status === 'blocked' || status === 'failed'
      ? 'danger'
      : status === 'pendingConfirmation'
        ? 'warning'
        : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}

function createNewDraft(config: { actuators: Actuator[]; assets: Array<{ id: string }>; dataSources: DataSource[] }): ActuatorDraft {
  const id = createUniqueId('actuator-1', config.actuators.map((item) => item.id));
  const dataSource = config.dataSources.find((source) => source.enabled) ?? config.dataSources[0];
  return {
    id,
    name: 'Реле',
    type: 'relay',
    assetId: config.assets[0]?.id ?? '',
    dataSourceId: dataSource?.id ?? '',
    commandPointId: `${id}-run-command`,
    feedbackPointId: '',
    supportedCommands: ['turnOn', 'turnOff'],
    writeMode: 'mu110-mask-fc16',
    coilAddress: 0,
    outputNumber: 1,
    maskRegisterAddress: 50,
    slaveId: getDefaultSlaveId(dataSource),
    requiresConfirmation: true,
    safetyLevel: 'dangerous',
    enabled: true,
    isNew: true
  };
}

function createDraftFromActuator(actuator: Actuator, points: Point[]): ActuatorDraft {
  const commandPoint = points.find((point): point is ControlPoint => point.id === actuator.commandPointIds[0] && point.kind === 'control');
  const writeAddress = commandPoint?.writeAddress?.protocol === 'modbus' ? commandPoint.writeAddress : null;
  const writeMode: WriteMode = writeAddress?.functionCode === 16 ? 'mu110-mask-fc16' : 'coil-fc5';
  return {
    id: actuator.id,
    name: actuator.name,
    type: actuator.type,
    assetId: actuator.assetId ?? '',
    dataSourceId: commandPoint?.dataSourceId ?? '',
    commandPointId: commandPoint?.id ?? `${actuator.id}-run-command`,
    feedbackPointId: actuator.feedbackPointIds[0] ?? '',
    supportedCommands: actuator.supportedCommands,
    writeMode,
    coilAddress: writeAddress?.coilAddress ?? 0,
    outputNumber: writeAddress?.bitIndex !== undefined ? writeAddress.bitIndex + 1 : 1,
    maskRegisterAddress: writeAddress?.registerAddress ?? 50,
    slaveId: writeAddress?.slaveId ?? 1,
    requiresConfirmation: commandPoint?.requiresConfirmation ?? true,
    safetyLevel: commandPoint?.safetyLevel ?? 'dangerous',
    enabled: actuator.enabled,
    isNew: false
  };
}

function createControlPointFromDraft(draft: ActuatorDraft, dataSources: DataSource[], now: string): ControlPoint {
  const slaveId = draft.slaveId || getDefaultSlaveId(dataSources.find((source) => source.id === draft.dataSourceId));
  const writeAddress = draft.writeMode === 'mu110-mask-fc16'
    ? {
        protocol: 'modbus' as const,
        slaveId,
        area: 'holding-register' as const,
        functionCode: 16 as const,
        registerAddress: clampInteger(draft.maskRegisterAddress, 0, Number.MAX_SAFE_INTEGER),
        registerCount: 1,
        valueType: 'uint16' as const,
        bitIndex: clampInteger(draft.outputNumber - 1, 0, 15)
      }
    : {
        protocol: 'modbus' as const,
        slaveId,
        area: 'coil' as const,
        functionCode: 5 as const,
        coilAddress: clampInteger(draft.coilAddress, 0, Number.MAX_SAFE_INTEGER),
        valueType: 'boolean' as const
      };

  return {
    id: draft.commandPointId,
    name: `${draft.name} command`,
    kind: 'control',
    assetId: draft.assetId || undefined,
    dataSourceId: draft.dataSourceId || undefined,
    valueType: 'boolean',
    recordable: false,
    enabled: draft.enabled,
    allowedValues: [true, false],
    requiresConfirmation: draft.requiresConfirmation,
    safetyLevel: draft.safetyLevel,
    writeAddress,
    createdAt: now,
    updatedAt: now
  };
}

function createDefaultInterlockDraft(actuators: Actuator[], points: Point[]): InterlockDraft {
  return {
    targetActuatorId: actuators[0]?.id ?? '',
    targetCommand: actuators[0]?.supportedCommands[0] ?? 'start',
    pointId: points[0]?.id ?? '',
    operator: '<',
    expected: '10',
    effect: 'block',
    message: 'Команда заблокирована interlock.'
  };
}

function findControlPoint(points: Point[], actuator: Actuator): ControlPoint | null {
  const point = points.find((item) => actuator.commandPointIds.includes(item.id) && item.kind === 'control');
  return point ? (point as ControlPoint) : null;
}

function getCommandValue(commandType: CommandType): boolean | number | string {
  if (commandType === 'stop' || commandType === 'close' || commandType === 'turnOff') {
    return false;
  }

  return true;
}

function toggleCommand(commands: CommandType[], commandType: CommandType, checked: boolean): CommandType[] {
  if (checked) {
    return commands.includes(commandType) ? commands : [...commands, commandType];
  }

  return commands.filter((item) => item !== commandType);
}

function getDefaultSlaveId(dataSource?: DataSource): number {
  return typeof dataSource?.metadata?.slaveId === 'number' ? dataSource.metadata.slaveId : 1;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
}
