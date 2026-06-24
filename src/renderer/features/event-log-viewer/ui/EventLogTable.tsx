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
    { key: 'timestamp', title: 'Время', render: (event) => formatDateTime(event.timestamp) },
    {
      key: 'level',
      title: 'Уровень',
      render: (event) => <Badge tone={getLevelTone(event.level)}>{formatEventLevel(event.level)}</Badge>
    },
    { key: 'source', title: 'Источник', render: (event) => <Badge>{event.source}</Badge> },
    { key: 'entityId', title: 'Объект', render: (event) => event.entityId ?? '—' },
    { key: 'message', title: 'Сообщение', render: (event) => event.message },
    {
      key: 'details',
      title: 'Детали',
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
      compact
      columns={columns}
      emptyText="Событий пока нет"
      getRowKey={(event) => event.id}
      maxHeight="520px"
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
