import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  GetTrendQuery,
  MonitoringProfile,
  MonitoringSession,
  TrendSeries
} from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Alert } from '../../../shared/ui/Alert';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type ProfileRow = {
  id: string;
  assetName: string;
  name: string;
  points: number;
  enabled: boolean;
  active: boolean;
};

const aggregationOptions: Array<{ label: string; value: NonNullable<GetTrendQuery['aggregation']> }> = [
  { label: 'Последнее', value: 'last' },
  { label: 'Среднее', value: 'avg' },
  { label: 'Минимум', value: 'min' },
  { label: 'Максимум', value: 'max' },
  { label: 'Raw', value: 'raw' }
];

const modeOptions: Array<{ label: string; value: MonitoringProfile['pointConfigs'][number]['mode'] }> = [
  { label: 'Интервал + изменение', value: 'both' },
  { label: 'Только интервал', value: 'interval' },
  { label: 'Только изменение', value: 'onChange' }
];

export function HistoryPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();
  const [searchParams] = useSearchParams();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [hoursBack, setHoursBack] = useState(1);
  const [aggregation, setAggregation] = useState<NonNullable<GetTrendQuery['aggregation']>>('last');
  const [bucketMinutes, setBucketMinutes] = useState(1);
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [activeSessions, setActiveSessions] = useState<MonitoringSession[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [recordingPointIds, setRecordingPointIds] = useState<string[]>([]);
  const [recordMode, setRecordMode] = useState<MonitoringProfile['pointConfigs'][number]['mode']>('both');
  const [sampleIntervalMs, setSampleIntervalMs] = useState(5000);
  const [minChangeDelta, setMinChangeDelta] = useState(0);
  const [retentionDays, setRetentionDays] = useState(30);

  const queryAssetId = searchParams.get('assetId') ?? '';
  const assets = config?.assets ?? [];
  const assetId = selectedAssetId || queryAssetId || assets[0]?.id || '';
  const asset = assets.find((item) => item.id === assetId);
  const assetPoints = useMemo(
    () =>
      config && asset
        ? config.points.filter((point) => point.assetId === asset.id || asset.pointIds.includes(point.id))
        : [],
    [asset, config]
  );
  const recordablePoints = assetPoints.filter((point) => point.recordable && point.enabled);
  const pointIds = selectedPointIds.length > 0 ? selectedPointIds : recordablePoints.map((point) => point.id);
  const pointIdKey = pointIds.join('|');
  const profiles = useMemo(
    () => (config ? config.monitoringProfiles.filter((profile) => profile.assetId === assetId) : []),
    [assetId, config]
  );
  const currentProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];
  const activeSession =
    activeSessions.find((session) => session.assetId === assetId) ??
    config?.monitoringSessions.find((session) => session.assetId === assetId && session.status === 'running');
  const rows = (config?.monitoringProfiles ?? []).map((profile) => ({
    id: profile.id,
    assetName: config?.assets.find((item) => item.id === profile.assetId)?.name ?? profile.assetId,
    name: profile.name,
    points: profile.pointConfigs.filter((point) => point.enabled).length,
    enabled: profile.enabled,
    active: Boolean(activeSessions.find((session) => session.profileId === profile.id))
  }));
  const columns: DataTableColumn<ProfileRow>[] = [
    {
      key: 'name',
      title: 'Профиль',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-100">{row.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{row.id}</div>
        </div>
      )
    },
    { key: 'asset', title: 'Объект', render: (row) => row.assetName },
    { key: 'points', title: 'Точки', render: (row) => row.points },
    { key: 'enabled', title: 'Статус', render: (row) => <ProfileStatus row={row} /> }
  ];
  const query = useMemo<GetTrendQuery>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - hoursBack * 60 * 60 * 1000);
    return {
      assetId,
      pointIds,
      from: from.toISOString(),
      to: to.toISOString(),
      aggregation,
      bucketMs: aggregation === 'raw' ? undefined : bucketMinutes * 60_000
    };
  }, [aggregation, assetId, bucketMinutes, hoursBack, pointIdKey]);

  useEffect(() => {
    if (!selectedAssetId && queryAssetId) {
      setSelectedAssetId(queryAssetId);
    }
  }, [queryAssetId, selectedAssetId]);

  useEffect(() => {
    if (!config) {
      return;
    }

    void refreshSessions();
  }, [config?.monitoringSessions.length]);

  useEffect(() => {
    if (!asset) {
      return;
    }

    const profile = currentProfile;
    const enabledPointConfigs = profile?.pointConfigs.filter((item) => item.enabled) ?? [];
    const firstPointConfig = enabledPointConfigs[0];
    setProfileName(profile?.name ?? `Мониторинг ${asset.name}`);
    setRecordingPointIds(
      enabledPointConfigs.length > 0 ? enabledPointConfigs.map((item) => item.pointId) : recordablePoints.map((point) => point.id)
    );
    setRecordMode(firstPointConfig?.mode ?? 'both');
    setSampleIntervalMs(firstPointConfig?.sampleIntervalMs ?? 5000);
    setMinChangeDelta(firstPointConfig?.minChangeDelta ?? 0);
    setRetentionDays(firstPointConfig?.retentionDays ?? 30);
  }, [asset, currentProfile?.id]);

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  async function refreshSessions(): Promise<void> {
    setActiveSessions(await window.barrelMonitor.sessions.getActive());
  }

  async function loadTrend(): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      const result = await window.barrelMonitor.history.getTrend(query);
      setSeries(result);
      setMessage('График обновлен');
      await refreshSessions();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Ошибка загрузки истории');
    } finally {
      setIsBusy(false);
    }
  }

  async function exportCsv(): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      const result = await window.barrelMonitor.history.exportCsv(query);
      if (!result.success) {
        throw new Error(result.message ?? 'CSV export failed');
      }
      setMessage(`CSV экспортирован: ${result.path}. Строк: ${result.rows}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Ошибка CSV export');
    } finally {
      setIsBusy(false);
    }
  }

  async function saveProfile(): Promise<void> {
    if (!asset) {
      return;
    }

    setIsBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      const now = new Date().toISOString();
      const profile: MonitoringProfile = {
        id: currentProfile?.id ?? `${asset.id}-monitoring-profile`,
        assetId: asset.id,
        name: profileName.trim() || `Мониторинг ${asset.name}`,
        enabled: true,
        pointConfigs: recordingPointIds.map((pointId) => ({
          pointId,
          enabled: true,
          mode: recordMode,
          sampleIntervalMs,
          minChangeDelta: minChangeDelta > 0 ? minChangeDelta : undefined,
          retentionDays
        })),
        createdAt: currentProfile?.createdAt ?? now,
        updatedAt: now
      };
      const savedProfile = await window.barrelMonitor.sessions.saveProfile(profile);
      setSelectedProfileId(savedProfile.id);
      setMessage('MonitoringProfile сохранен');
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Ошибка сохранения профиля');
    } finally {
      setIsBusy(false);
    }
  }

  async function startSession(profile: MonitoringProfile): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      await window.barrelMonitor.sessions.start(profile.assetId, profile.id);
      setMessage('MonitoringSession запущена');
      await refresh();
      await refreshSessions();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Ошибка запуска мониторинга');
    } finally {
      setIsBusy(false);
    }
  }

  async function stopSession(sessionId: string): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      await window.barrelMonitor.sessions.stop(sessionId);
      setMessage('MonitoringSession остановлена');
      await refresh();
      await refreshSessions();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Ошибка остановки мониторинга');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Промышленный мониторинг"
        title="История"
        description="Профили записи, активные сессии, trend query и CSV export для TimeSeriesRecord."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={isBusy || pointIds.length === 0} onClick={() => void loadTrend()} variant="secondary">
              Построить график
            </Button>
            <Button disabled={isBusy || pointIds.length === 0} onClick={() => void exportCsv()} variant="ghost">
              Export CSV
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        {message ? <Alert type="success">{message}</Alert> : null}
        {actionError ? <Alert type="error">{actionError}</Alert> : null}

        <Panel className="p-5" title="Запись истории">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr_220px]">
            <Select
              label="Объект"
              onChange={(nextAssetId) => {
                setSelectedAssetId(nextAssetId);
                setSelectedProfileId('');
                setSelectedPointIds([]);
                setSeries([]);
              }}
              options={config.assets.map((item) => ({ label: item.name, value: item.id }))}
              value={assetId}
            />
            <div className="grid gap-2 md:grid-cols-2">
              {recordablePoints.map((point) => (
                <Checkbox
                  checked={pointIds.includes(point.id)}
                  hint={point.id}
                  key={point.id}
                  label={point.name}
                  onChange={(checked) =>
                    setSelectedPointIds(toggleSelection(selectedPointIds.length > 0 ? selectedPointIds : pointIds, point.id, checked))
                  }
                />
              ))}
            </div>
            <div className="grid gap-3">
              <NumberInput label="Период, часов" min={1} max={168} onChange={setHoursBack} value={hoursBack} />
              <Select label="Агрегация" onChange={setAggregation} options={aggregationOptions} value={aggregation} />
              <NumberInput
                disabled={aggregation === 'raw'}
                label="Bucket, минут"
                min={1}
                max={1440}
                onChange={setBucketMinutes}
                value={bucketMinutes}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profiles.map((profile) => (
              <Button
                disabled={isBusy || Boolean(activeSession) || profile.pointConfigs.every((item) => !item.enabled)}
                key={profile.id}
                onClick={() => void startSession(profile)}
                variant="secondary"
              >
                Включить: {profile.name}
              </Button>
            ))}
            {activeSession ? (
              <Button disabled={isBusy} onClick={() => void stopSession(activeSession.id)} variant="danger">
                Остановить сессию
              </Button>
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Panel className="p-5" title="Профиль мониторинга">
            <div className="space-y-4">
              {profiles.length > 0 ? (
                <Select
                  label="Профиль"
                  onChange={setSelectedProfileId}
                  options={profiles.map((profile) => ({ label: profile.name, value: profile.id }))}
                  value={currentProfile?.id ?? profiles[0]?.id ?? ''}
                />
              ) : null}
              <TextInput label="Название" onChange={setProfileName} value={profileName} />
              <div className="grid gap-3 md:grid-cols-2">
                <Select label="Правило записи" onChange={setRecordMode} options={modeOptions} value={recordMode} />
                <NumberInput
                  label="Интервал, мс"
                  min={250}
                  step={250}
                  onChange={setSampleIntervalMs}
                  value={sampleIntervalMs}
                />
                <NumberInput
                  label="Минимальное изменение"
                  min={0}
                  step={0.1}
                  onChange={setMinChangeDelta}
                  value={minChangeDelta}
                />
                <NumberInput label="Retention, дней" min={1} max={3650} onChange={setRetentionDays} value={retentionDays} />
              </div>
              <div className="grid gap-2">
                {recordablePoints.length === 0 ? (
                  <EmptyState title="Нет recordable points" description="Включите запись истории у telemetry points." />
                ) : (
                  recordablePoints.map((point) => (
                    <Checkbox
                      checked={recordingPointIds.includes(point.id)}
                      hint={point.id}
                      key={point.id}
                      label={point.name}
                      onChange={(checked) => setRecordingPointIds(toggleSelection(recordingPointIds, point.id, checked))}
                    />
                  ))
                )}
              </div>
              <Button disabled={isBusy || !asset || recordingPointIds.length === 0} onClick={() => void saveProfile()} variant="primary">
                Сохранить профиль
              </Button>
            </div>
          </Panel>

          <Panel className="p-5" title="Тренд">
            {series.length === 0 ? (
              <EmptyState title="Нет данных для графика" description="Запустите MonitoringSession, подождите записи значений и постройте график." />
            ) : (
              <TrendChart series={series} />
            )}
          </Panel>
        </div>

        <Panel className="p-5" title="Профили мониторинга">
          {rows.length === 0 ? (
            <EmptyState title="Профили не настроены" description="Создайте MonitoringProfile для объекта с recordable points." />
          ) : (
            <DataTable compact columns={columns} getRowKey={(row) => row.id} rows={rows} />
          )}
        </Panel>
      </div>
    </section>
  );
}

function ProfileStatus({ row }: { row: ProfileRow }): React.JSX.Element {
  if (row.active) {
    return <Badge tone="success">running</Badge>;
  }

  return <Badge tone={row.enabled ? 'info' : 'warning'}>{row.enabled ? 'enabled' : 'disabled'}</Badge>;
}

function TrendChart({ series }: { series: TrendSeries[] }): React.JSX.Element {
  const numericPoints = series.flatMap((item) =>
    item.values
      .filter((value) => typeof value.value === 'number')
      .map((value) => ({ pointId: item.pointId, timestamp: new Date(value.timestamp).getTime(), value: value.value as number }))
  );

  if (numericPoints.length === 0) {
    return <EmptyState title="Нет числовых значений" description="График строится для number values. Boolean/string доступны в CSV." />;
  }

  const minX = Math.min(...numericPoints.map((point) => point.timestamp));
  const maxX = Math.max(...numericPoints.map((point) => point.timestamp));
  const minY = Math.min(...numericPoints.map((point) => point.value));
  const maxY = Math.max(...numericPoints.map((point) => point.value));
  const colors = ['#2dd4bf', '#38bdf8', '#fbbf24', '#fb7185', '#a78bfa'];

  return (
    <div className="space-y-4">
      <svg className="h-[320px] w-full rounded-md border border-white/10 bg-slate-950/55" role="img" viewBox="0 0 1000 320">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1="50" x2="980" y1={40 + line * 60} y2={40 + line * 60} stroke="rgba(148,163,184,0.18)" />
        ))}
        {series.map((item, index) => {
          const points = item.values
            .filter((value) => typeof value.value === 'number')
            .map((value) => {
              const x = scale(new Date(value.timestamp).getTime(), minX, maxX, 60, 970);
              const y = scale(value.value as number, minY, maxY, 280, 35);
              return `${x},${y}`;
            })
            .join(' ');
          return <polyline fill="none" key={item.pointId} points={points} stroke={colors[index % colors.length]} strokeWidth="3" />;
        })}
        <text fill="rgb(148,163,184)" fontSize="12" x="58" y="24">
          {formatChartValue(maxY)}
        </text>
        <text fill="rgb(148,163,184)" fontSize="12" x="58" y="303">
          {formatChartValue(minY)}
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 text-sm">
        {series.map((item, index) => (
          <span className="inline-flex items-center gap-2 text-slate-300" key={item.pointId}>
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            {item.pointName}
            {item.unit ? <span className="text-slate-500">{item.unit}</span> : null}
          </span>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {series.map((item) => (
          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3 text-sm" key={item.pointId}>
            <div className="font-medium text-slate-100">{item.pointName}</div>
            <div className="mt-1 text-slate-500">{item.values.length} точек</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toggleSelection(values: string[], value: string, checked: boolean): string[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }

  return values.filter((item) => item !== value);
}

function scale(value: number, min: number, max: number, outMin: number, outMax: number): number {
  if (min === max) {
    return (outMin + outMax) / 2;
  }

  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function formatChartValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
