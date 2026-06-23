import type { EventLogEntry, EventLogLevel } from '../../../../shared/types/event.types';

export type EventLogLevelFilter = EventLogLevel | 'all';
export type EventLogLimit = 50 | 100 | 500 | 'all';

export type EventLogFiltersState = {
  level: EventLogLevelFilter;
  source: string;
  search: string;
  limit: EventLogLimit;
};

export const defaultEventLogFilters: EventLogFiltersState = {
  level: 'all',
  source: 'all',
  search: '',
  limit: 100
};

export function applyEventLogFilters(
  events: EventLogEntry[],
  filters: EventLogFiltersState
): EventLogEntry[] {
  const search = filters.search.trim().toLowerCase();

  return events
    .filter((event) => (filters.level === 'all' ? true : event.level === filters.level))
    .filter((event) => (filters.source === 'all' ? true : event.source === filters.source))
    .filter((event) => {
      if (!search) {
        return true;
      }

      return [
        event.message,
        event.entityId ?? '',
        event.source,
        event.level,
        event.details ? JSON.stringify(event.details) : ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export function resolveEventLogLimit(limit: EventLogLimit): number | undefined {
  return limit === 'all' ? undefined : limit;
}
