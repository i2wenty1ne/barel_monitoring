import type { Point } from '../../../../shared/types/config.types';
import { useAppConfig } from '../../../entities/config/model/useAppConfig';
import { Badge } from '../../../shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function PointsPage(): React.JSX.Element {
  const { config, isLoading, error, refresh } = useAppConfig();

  if (isLoading || !config) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const columns: DataTableColumn<Point>[] = [
    {
      key: 'name',
      title: 'Точка',
      render: (point) => (
        <div>
          <div className="font-medium text-slate-100">{point.name}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{point.id}</div>
        </div>
      )
    },
    { key: 'kind', title: 'Kind', render: (point) => <Badge tone={point.kind === 'control' ? 'warning' : 'success'}>{point.kind}</Badge> },
    { key: 'asset', title: 'Asset', render: (point) => point.assetId ?? '—' },
    { key: 'source', title: 'DataSource', render: (point) => point.dataSourceId ?? '—' },
    { key: 'valueType', title: 'Тип', render: (point) => point.valueType },
    { key: 'address', title: 'Адрес', render: formatAddress },
    { key: 'recordable', title: 'История', render: (point) => (point.recordable ? 'пишется' : 'нет') }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Industrial Flow Monitor"
        title="Точки данных"
        description="TelemetryPoint и ControlPoint: универсальные читаемые и управляемые точки поверх источников данных."
      />
      <Panel className="p-5" title="Points">
        {config.points.length === 0 ? (
          <EmptyState title="Точки не настроены" description="Миграция channels создаёт telemetry points автоматически." />
        ) : (
          <DataTable compact columns={columns} getRowKey={(point) => point.id} maxHeight="620px" rows={config.points} />
        )}
      </Panel>
    </section>
  );
}

function formatAddress(point: Point): React.ReactNode {
  if (point.address?.protocol !== 'modbus') {
    return point.address?.protocol ?? '—';
  }

  const address = point.address.registerAddress ?? point.address.coilAddress ?? 0;
  return (
    <span className="font-mono text-xs">
      slave {point.address.slaveId} · fn {point.address.functionCode} · {point.address.area} {address}
    </span>
  );
}
