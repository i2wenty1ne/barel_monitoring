import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventLogEntry } from '../../../../shared/types/event.types';
import {
  applyEventLogFilters,
  defaultEventLogFilters,
  resolveEventLogLimit,
  type EventLogFiltersState
} from './event-log-filters';

type UseEventLogResult = {
  events: EventLogEntry[];
  filteredEvents: EventLogEntry[];
  filters: EventLogFiltersState;
  isLoading: boolean;
  error: string | null;
  setFilters: (filters: EventLogFiltersState) => void;
  refresh: () => Promise<void>;
  clearEvents: () => Promise<void>;
};

export function useEventLog(): UseEventLogResult {
  const isMountedRef = useRef(false);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [filters, setFilters] = useState<EventLogFiltersState>(defaultEventLogFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const nextEvents = await window.barrelMonitor.events.list({
        limit: resolveEventLogLimit(filters.limit)
      });
      if (isMountedRef.current) {
        setEvents(nextEvents);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Event log load error';
      console.error(message, caughtError);
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters.limit]);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = window.barrelMonitor.events.subscribe((entry) => {
        setEvents((currentEvents) => [entry, ...currentEvents]);
      });
    } catch (caughtError) {
      console.error('Event log subscribe error', caughtError);
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe?.();
    };
  }, [refresh]);

  const clearEvents = useCallback(async (): Promise<void> => {
    const result = await window.barrelMonitor.events.clear();
    if (!result.success) {
      setError(result.message ?? 'Не удалось очистить журнал');
      return;
    }

    await refresh();
  }, [refresh]);

  const filteredEvents = useMemo(
    () => applyEventLogFilters(events, filters),
    [events, filters]
  );

  return {
    events,
    filteredEvents,
    filters,
    isLoading,
    error,
    setFilters,
    refresh,
    clearEvents
  };
}
