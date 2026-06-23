import { formatDateTime } from '../../../../shared/lib/format';
import { BarrelsDiagnosticsTable } from '../../../features/diagnostics/ui/BarrelsDiagnosticsTable';
import { ChannelsDiagnosticsTable } from '../../../features/diagnostics/ui/ChannelsDiagnosticsTable';
import { ConnectionDiagnosticsPanel } from '../../../features/diagnostics/ui/ConnectionDiagnosticsPanel';
import { DeviceDiagnosticsPanel } from '../../../features/diagnostics/ui/DeviceDiagnosticsPanel';
import { DiagnosticActionsPanel } from '../../../features/diagnostics/ui/DiagnosticActionsPanel';
import { ManualReadPanel } from '../../../features/diagnostics/ui/ManualReadPanel';
import { RawSnapshotPanel } from '../../../features/diagnostics/ui/RawSnapshotPanel';
import { useDiagnostics } from '../../../features/diagnostics/model/useDiagnostics';
import { Alert } from '../../../shared/ui/Alert';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function DiagnosticsPage(): React.JSX.Element {
  const diagnostics = useDiagnostics();

  if (diagnostics.isLoading && !diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Engineering" title="Диагностика" />
        <LoadingState />
      </section>
    );
  }

  if (diagnostics.error && !diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Engineering" title="Диагностика" />
        <ErrorState message={diagnostics.error} onRetry={() => void diagnostics.refresh()} />
      </section>
    );
  }

  if (!diagnostics.data) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Engineering" title="Диагностика" />
        <ErrorState message="Диагностические данные не загружены" onRetry={() => void diagnostics.refresh()} />
      </section>
    );
  }

  const { config, snapshot, serviceStatus } = diagnostics.data;

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Engineering"
        title="Диагностика"
        description="Read-only состояние приложения, config, DataService и последних mock-значений."
      />

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryPanel label="Режим данных" value={snapshot.mode} />
          <SummaryPanel label="Общий статус" value={<StatusBadge status={snapshot.status} />} />
          <SummaryPanel label="Последнее обновление" value={formatDateTime(snapshot.updatedAt)} />
          <SummaryPanel label="Warning" value={String(snapshot.activeWarningsCount)} />
          <SummaryPanel label="Alarm" value={String(snapshot.activeAlarmsCount)} />
        </div>

        {config.app.mode === 'mock' ? (
          <Alert type="info">Приложение работает в mock-режиме. Реальное оборудование не опрашивается.</Alert>
        ) : (
          <Alert type="warning">Real Modbus service пока не реализован. Подключение будет добавлено на этапе 5.</Alert>
        )}

        <DiagnosticActionsPanel
          actionMessage={diagnostics.actionResult}
          data={diagnostics.data}
          lastTestResult={diagnostics.testConnectionResult}
          onReadAll={() => void diagnostics.readAllNow()}
          onRefresh={() => void diagnostics.refresh()}
          onTestConnection={() => void diagnostics.testConnection()}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <ConnectionDiagnosticsPanel config={config} serviceStatus={serviceStatus} />
          <DeviceDiagnosticsPanel device={config.device} />
        </div>

        <ManualReadPanel config={config} />
        <ChannelsDiagnosticsTable config={config} snapshot={snapshot} />
        <BarrelsDiagnosticsTable config={config} snapshot={snapshot} />
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
    <Panel className="p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-3 text-lg font-semibold text-slate-100">{value}</div>
    </Panel>
  );
}
