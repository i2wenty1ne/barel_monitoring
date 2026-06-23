export type EventLogLevel = 'info' | 'warning' | 'error';

export type EventLogEntry = {
  id: string;
  timestamp: string;
  level: EventLogLevel;
  source: string;
  entityId?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type EventLogInput = Omit<EventLogEntry, 'id' | 'timestamp'> & {
  timestamp?: string;
};

export type EventLogFilter = {
  level?: EventLogLevel;
  source?: string;
  limit?: number;
};
