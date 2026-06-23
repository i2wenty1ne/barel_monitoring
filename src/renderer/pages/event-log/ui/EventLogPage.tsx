import { useMemo, useState } from 'react';
import type { EventLogEntry } from '../../../../shared/types/event.types';
import { ClearEventsButton } from '../../../features/event-log-viewer/ui/ClearEventsButton';
import { EventDetailsDialog } from '../../../features/event-log-viewer/ui/EventDetailsDialog';
import { EventLogFilters } from '../../../features/event-log-viewer/ui/EventLogFilters';
import { EventLogTable } from '../../../features/event-log-viewer/ui/EventLogTable';
import { useEventLog } from '../../../features/event-log-viewer/model/useEventLog';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';

export function EventLogPage(): React.JSX.Element {
  const eventLog = useEventLog();
  const [selectedEvent, setSelectedEvent] = useState<EventLogEntry | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const sources = useMemo(
    () => [...new Set(eventLog.events.map((event) => event.source))].sort(),
    [eventLog.events]
  );

  if (eventLog.isLoading && eventLog.events.length === 0) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Engineering" title="Журнал событий" />
        <LoadingState />
      </section>
    );
  }

  if (eventLog.error && eventLog.events.length === 0) {
    return (
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Engineering" title="Журнал событий" />
        <ErrorState message={eventLog.error} onRetry={() => void eventLog.refresh()} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <>
            <Button onClick={() => void eventLog.refresh()} variant="secondary">
              Обновить
            </Button>
            <ClearEventsButton onClick={() => setIsClearDialogOpen(true)} />
          </>
        }
        eyebrow="Engineering"
        title="Журнал событий"
        description="JSONL-события приложения с фильтрами, поиском и live-обновлением."
      />

      <div className="space-y-5">
        {eventLog.error ? <Alert type="error">{eventLog.error}</Alert> : null}
        {eventLog.filters.limit === 'all' && eventLog.events.length > 500 ? (
          <Alert type="warning">Загружено больше 500 событий. Фильтрация может быть тяжелее.</Alert>
        ) : null}

        <Panel className="p-5" title="Фильтры">
          <EventLogFilters
            filters={eventLog.filters}
            onChange={eventLog.setFilters}
            sources={sources}
          />
        </Panel>

        <Panel className="p-5" title={`События (${eventLog.filteredEvents.length})`}>
          <EventLogTable events={eventLog.filteredEvents} onOpenDetails={setSelectedEvent} />
        </Panel>
      </div>

      {selectedEvent ? (
        <EventDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      ) : null}

      {isClearDialogOpen ? (
        <ConfirmDialog
          cancelText="Отмена"
          confirmText="Очистить"
          message="Вы уверены, что хотите очистить журнал событий? Это действие нельзя отменить."
          onCancel={() => setIsClearDialogOpen(false)}
          onConfirm={() => {
            setIsClearDialogOpen(false);
            void eventLog.clearEvents();
          }}
          title="Очистить журнал событий?"
        />
      ) : null}
    </section>
  );
}
