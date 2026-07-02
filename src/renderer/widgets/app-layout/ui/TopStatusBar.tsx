import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../../../shared/lib/format';
import type { DataServiceStatus, Status } from '../../../../shared/types/monitoring.types';
import { useMonitoringSnapshot } from '../../../entities/monitoring/model/useMonitoringSnapshot';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function TopStatusBar(): React.JSX.Element {
  const { t } = useTranslation();
  const { data, error, refresh } = useMonitoringSnapshot();
  const [serviceStatus, setServiceStatus] = useState<DataServiceStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus(): Promise<void> {
      const nextStatus = await window.barrelMonitor.monitoring.getStatus();
      if (isMounted) {
        setServiceStatus(nextStatus);
      }
    }

    void loadStatus();
    const intervalId = setInterval(() => {
      void loadStatus();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [data?.updatedAt]);

  const modeText = data?.mode === 'real' ? t('layout.modeEquipment') : t('layout.modeSimulation');
  const deviceConnection = getDeviceConnectionStatus(data?.status, Boolean(error), t);
  const modbusConnectionText = getModbusConnectionText(serviceStatus, t);
  const warningsCount = data?.activeWarningsCount ?? 0;
  const alarmsCount = data?.activeAlarmsCount ?? 0;

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-300">{t('layout.operatorPanel')}</span>
        <span className="text-slate-500">{modeText}</span>
        <StatusBadge label={deviceConnection.label} status={deviceConnection.status} />
        <span className={serviceStatus?.connectionStatus === 'ok' ? 'text-teal-200' : 'text-amber-200'}>
          {modbusConnectionText}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">
          {t('layout.updated', { value: data ? formatDateTime(data.updatedAt) : t('layout.waitingData') })}
        </span>
        {serviceStatus?.lastSuccessfulReadAt ? (
          <span className="text-slate-500">
            {t('layout.lastOk', { value: formatDateTime(serviceStatus.lastSuccessfulReadAt) })}
          </span>
        ) : null}
        <span className={warningsCount > 0 ? 'text-amber-200' : 'text-slate-500'}>
          {t('layout.warnings', { count: warningsCount })}
        </span>
        <span className={alarmsCount > 0 ? 'text-rose-200' : 'text-slate-500'}>
          {t('layout.alarms', { count: alarmsCount })}
        </span>
        <button
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
          onClick={() => void refresh()}
          type="button"
        >
          {t('layout.refresh')}
        </button>
      </div>
    </header>
  );
}

function getDeviceConnectionStatus(
  status: Status | undefined,
  hasError: boolean,
  t: (key: string) => string
): { status: Status; label: string } {
  if (hasError || status === 'connection-error') {
    return { status: 'connection-error', label: t('layout.deviceConnectionError') };
  }

  if (!status || status === 'no-data') {
    return { status: 'no-data', label: t('layout.deviceConnectionWaiting') };
  }

  return { status: 'ok', label: t('layout.deviceConnectionOk') };
}

function getModbusConnectionText(status: DataServiceStatus | null, t: (key: string) => string): string {
  if (!status) {
    return t('layout.modbusConnectionWaiting');
  }

  if (status.connectionStatus === 'ok') {
    return t('layout.modbusConnectionOk');
  }

  const error = status.lastError?.toLowerCase() ?? '';

  if (error.includes('порт') || error.includes('port')) {
    return t('layout.modbusPortError');
  }

  if (error.includes('ответ') || error.includes('timeout')) {
    return t('layout.modbusNoDeviceResponse');
  }

  return t('layout.modbusConnectionError');
}
