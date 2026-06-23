import type { EventLogEntry } from '../../../../shared/types/event.types';
import { formatDateTime, formatEventLevel } from '../../../../shared/lib/format';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable';

type EventLogTableProps = {
  events: EventLogEntry[];
  onOpenDetails: (event: EventLogEntry) => void;
};

export function EventLogTable({ events, onOpenDetails }: EventLogTableProps): React.JSX.Element {
  const columns: DataTableColumn<EventLogEntry>[] = [
    { key: 'timestamp', title: 'Timestamp', render: (event) => formatDateTime(event.timestamp) },
    {
      key: 'level',
      title: 'Level',
      render: (event) => <Badge tone={getLevelTone(event.level)}>{formatEventLevel(event.level)}</Badge>
    },
    { key: 'source', title: 'Source', render: (event) => <Badge>{event.source}</Badge> },
    { key: 'entityId', title: 'Entity', render: (event) => event.entityId ?? '—' },
    { key: 'message', title: 'Message', render: (event) => event.message },
    {
      key: 'details',
      title: 'Details',
      render: (event) =>
        event.details ? (
          <Button onClick={() => onOpenDetails(event)} variant="ghost">
            Подробнее
          </Button>
        ) : (
          '—'
        )
    }
  ];

  return (
    <DataTable
      columns={columns}
      emptyText="Событий пока нет"
      getRowKey={(event) => event.id}
      rows={events}
    />
  );
}

function getLevelTone(level: EventLogEntry['level']): 'info' | 'warning' | 'danger' {
  if (level === 'error') {
    return 'danger';
  }

  if (level === 'warning') {
    return 'warning';
  }

  return 'info';
}
