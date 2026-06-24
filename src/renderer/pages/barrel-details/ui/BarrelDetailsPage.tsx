import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChannelConfig, DeviceConfig, ScalingConfig } from '../../../../shared/types/config.types';
import {
  formatDateTime,
  formatPercent,
  formatRawValue,
  formatTemperature
} from '../../../../shared/lib/format';
import { selectBarrelViewModel } from '../../../entities/barrel/model/selectors';
import { BarrelTank } from '../../../entities/barrel/ui/BarrelTank';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { useMonitoringSnapshot } from '../../../entities/monitoring/model/useMonitoringSnapshot';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { CollapsibleSection } from '../../../shared/ui/CollapsibleSection';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function BarrelDetailsPage(): React.JSX.Element {
  const { barrelId } = useParams();
  const navigate = useNavigate();
  const configState = useAppConfig();
  const snapshotState = useMonitoringSnapshot();

  const viewModel = useMemo(() => {
    if (!configState.config || !barrelId) {
      return null;
    }

    return selectBarrelViewModel(configState.config, snapshotState.data, barrelId);
  }, [barrelId, configState.config, snapshotState.data]);

  const channels = useMemo(() => {
    if (!configState.config || !viewModel) {
      return { temperatureChannel: null, levelChannel: null };
    }

    return {
      temperatureChannel:
        configState.config.channels.find(
          (channel) => channel.id === viewModel.barrel.temperatureChannelId
        ) ?? null,
      levelChannel:
        configState.config.channels.find((channel) => channel.id === viewModel.barrel.levelChannelId) ??
        null
    };
  }, [configState.config, viewModel]);

  const error = configState.error ?? snapshotState.error;
  const isLoading =
    (configState.isLoading || snapshotState.isLoading) && !configState.config && !snapshotState.data;

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Детали" title="Загрузка бочки" />
        <LoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Детали" title="Ошибка загрузки" />
        <ErrorState
          message={error}
          onRetry={() => {
            void configState.refresh();
            void snapshotState.refresh();
          }}
        />
      </section>
    );
  }

  if (!barrelId || !configState.config || !viewModel) {
    return (
      <section className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Детали"
          title="Бочка не найдена"
          actions={<BackButton onClick={() => navigate('/monitoring')} />}
        />
        <EmptyState
          title="Бочка не найдена"
          description="Проверьте идентификатор бочки или вернитесь на экран мониторинга"
        />
      </section>
    );
  }

  const hasIncompleteConfig = !channels.temperatureChannel || !channels.levelChannel;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Детали бочки"
        title={viewModel.barrel.name}
        description="Live-обновление текущих значений, каналов и состояния бочки."
        actions={<BackButton onClick={() => navigate('/monitoring')} />}
      />

      {hasIncompleteConfig ? (
        <div className="mb-5 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Конфигурация неполная: один или несколько каналов бочки не найдены.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Panel className="flex flex-col items-center p-6">
          <BarrelTank levelPercent={viewModel.level?.displayValue} status={viewModel.status} size="large" />
          <div className="mt-6 flex items-center gap-3">
            <StatusBadge status={viewModel.status} />
            <span className="text-sm text-slate-500">
              Обновлено: {formatDateTime(viewModel.updatedAt)}
            </span>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="p-5">
            <h2 className="text-lg font-medium text-white">Текущие значения</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ValueTile label="Температура" value={formatTemperature(viewModel.temperature?.displayValue)} />
              <ValueTile label="Заполненность" value={formatPercent(viewModel.level?.displayValue)} />
              {configState.config.interface.showRawValuesInDetails ? (
                <ValueTile
                  label="Raw уровень"
                  value={formatRawValue(viewModel.level?.rawValue, viewModel.level?.rawUnit)}
                />
              ) : null}
              <ValueTile label="Статус" value={<StatusBadge status={viewModel.status} />} />
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-medium text-white">Источники данных</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChannelPanel
                title="Канал температуры"
                channel={channels.temperatureChannel}
                devices={configState.config.devices}
              />
              <ChannelPanel
                title="Канал уровня"
                channel={channels.levelChannel}
                devices={configState.config.devices}
              />
            </div>
          </Panel>

          <CollapsibleSection
            summary={<span className="text-sm text-slate-500">ID бочки, привязки каналов и режим данных</span>}
            title="Технические параметры"
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <TechRow label="ID бочки" monospace value={viewModel.barrel.id} />
              <TechRow label="Канал температуры" monospace value={viewModel.barrel.temperatureChannelId} />
              <TechRow label="Канал уровня" monospace value={viewModel.barrel.levelChannelId} />
              <TechRow label="Режим данных" value={snapshotState.data?.mode ?? configState.config.app.mode} />
            </dl>
          </CollapsibleSection>
        </div>
      </div>
    </section>
  );
}

type BackButtonProps = {
  onClick: () => void;
};

function BackButton({ onClick }: BackButtonProps): React.JSX.Element {
  return (
    <button
      className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
      onClick={onClick}
      type="button"
    >
      Назад
    </button>
  );
}

type ValueTileProps = {
  label: string;
  value: React.ReactNode;
};

function ValueTile({ label, value }: ValueTileProps): React.JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

type ChannelPanelProps = {
  title: string;
  channel: ChannelConfig | null;
  devices: DeviceConfig[];
};

function ChannelPanel({ title, channel, devices }: ChannelPanelProps): React.JSX.Element {
  if (!channel) {
    return (
      <div className="rounded-md border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        {title}: канал не найден
      </div>
    );
  }
  const device = devices.find((item) => item.id === channel.deviceId);

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-4">
      <h3 className="font-medium text-slate-100">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <TechRow label="Устройство" value={device ? `${device.name} (${device.id})` : channel.deviceId} />
        <TechRow label="ID канала" monospace value={channel.id} />
        <TechRow label="Номер входа" value={String(channel.moduleInputNumber)} />
        <TechRow label="Адрес регистра" value={String(channel.registerAddress)} />
        <TechRow label="Функция Modbus" value={String(channel.modbusFunction)} />
        <TechRow label="Тип данных" value={channel.dataType} />
        <TechRow label="Raw единица" value={channel.rawUnit} />
        <TechRow label="Единица отображения" value={channel.displayUnit} />
        <TechRow label="Масштабирование" value={formatScaling(channel.scaling)} />
      </dl>
    </div>
  );
}

type TechRowProps = {
  label: string;
  value: React.ReactNode;
  monospace?: boolean;
};

function TechRow({ label, value, monospace }: TechRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`min-w-0 break-words text-slate-200 ${monospace ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function formatScaling(scaling: ScalingConfig): string {
  if (scaling.type === 'none') {
    return 'none';
  }

  return `linear: ${scaling.rawMin}-${scaling.rawMax} -> ${scaling.displayMin}-${scaling.displayMax}`;
}
