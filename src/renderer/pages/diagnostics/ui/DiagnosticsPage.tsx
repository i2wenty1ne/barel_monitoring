import { formatDateTime } from '../../../../shared/lib/format';
import { AssetsDiagnosticsTable } from '../../../features/diagnostics/ui/AssetsDiagnosticsTable';
import { ConnectionDiagnosticsPanel } from '../../../features/diagnostics/ui/ConnectionDiagnosticsPanel';
import { DataSourcesDiagnosticsPanel } from '../../../features/diagnostics/ui/DataSourcesDiagnosticsPanel';
import { DiagnosticActionsPanel } from '../../../features/diagnostics/ui/DiagnosticActionsPanel';
import { ManualReadPanel } from '../../../features/diagnostics/ui/ManualReadPanel';
import { PointsDiagnosticsTable } from '../../../features/diagnostics/ui/PointsDiagnosticsTable';
import { RegisterScanPanel } from '../../../features/diagnostics/ui/RegisterScanPanel';
import { RawSnapshotPanel } from '../../../features/diagnostics/ui/RawSnapshotPanel';
import { useDiagnostics } from '../../../features/diagnostics/model/useDiagnostics';
import { Alert } from '../../../shared/ui/Alert';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function DiagnosticsPage(): React.JSX.Element {
  const diagnostics = useDiagnostics();

  if (diagnostics.isLoading && !diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Инженерный раздел" title="Диагностика" />
        <LoadingState />
      </section>
    );
  }

  if (diagnostics.error && !diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Инженерный раздел" title="Диагностика" />
        <ErrorState message={diagnostics.error} onRetry={() => void diagnostics.refresh()} />
      </section>
    );
  }

  if (!diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Инженерный раздел" title="Диагностика" />
        <ErrorState message="Диагностические данные не загружены" onRetry={() => void diagnostics.refresh()} />
      </section>
    );
  }

  const { config, snapshot, serviceStatus } = diagnostics.data;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Инженерный раздел"
        title="Диагностика"
        description="Состояние подключения, источников данных, точек, объектов и ручная проверка регистров."
      />

      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryPanel label="Режим данных" value={snapshot.mode} />
          <SummaryPanel label="Общий статус" value={<StatusBadge status={snapshot.status} />} />
          <SummaryPanel label="Последнее обновление" value={formatDateTime(snapshot.updatedAt)} />
          <SummaryPanel label="Предупреждения" value={String(snapshot.activeWarningsCount)} />
          <SummaryPanel label="Аварии" value={String(snapshot.activeAlarmsCount)} />
        </div>

        {config.app.mode === 'mock' ? (
          <Alert type="info">Приложение работает в mock-режиме. Реальное оборудование не опрашивается.</Alert>
        ) : (
          <Alert type="warning">Приложение работает в real-режиме. Проверьте порт, адрес устройства и параметры Modbus перед ручным чтением.</Alert>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <ConnectionDiagnosticsPanel config={config} serviceStatus={serviceStatus} />
          <div className="space-y-5">
            <DiagnosticActionsPanel
              actionMessage={diagnostics.actionResult}
              data={diagnostics.data}
              lastTestResult={diagnostics.testConnectionResult}
              onReadAll={() => void diagnostics.readAllNow()}
              onRefresh={() => void diagnostics.refresh()}
              onTestConnection={() => void diagnostics.testConnection()}
            />
            <DataSourcesDiagnosticsPanel dataSources={config.dataSources} />
          </div>
        </div>

        <ManualReadPanel config={config} />
        <RegisterScanPanel config={config} onConfigChanged={diagnostics.refresh} />
        <PointsDiagnosticsTable config={config} snapshot={snapshot} />
        <AssetsDiagnosticsTable config={config} snapshot={snapshot} />
        <RawSnapshotPanel snapshot={snapshot} />
      </div>
    </section>
  );
}

type SummaryPanelProps = {
  label: string;
  value: React.ReactNode;
};

function SummaryPanel({ label, value }: SummaryPanelProps): React.JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-100">{value}</div>
    </div>
  );
}
