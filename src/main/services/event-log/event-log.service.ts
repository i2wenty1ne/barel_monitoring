import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  EventLogEntry,
  EventLogFilter,
  EventLogInput
} from '../../../shared/types/event.types';
import { getEventsLogPath } from '../../utils/paths';
import { safeJsonParse } from '../../utils/safe-json';

export type EventLogServiceOptions = {
  eventsLogPath?: string;
  logsDir?: string;
};

export class EventLogService {
  private readonly eventsLogPath: string;
  private readonly listeners = new Set<(entry: EventLogEntry) => void>();

  public constructor(options: EventLogServiceOptions = {}) {
    this.eventsLogPath = getEventsLogPath(options.eventsLogPath, options.logsDir);
  }

  public getEventsLogPath(): string {
    return this.eventsLogPath;
  }

  public async addEvent(input: EventLogInput): Promise<EventLogEntry> {
    const entry: EventLogEntry = {
      id: randomUUID(),
      timestamp: input.timestamp ?? new Date().toISOString(),
      level: input.level,
      source: input.source,
      entityId: input.entityId,
      message: input.message,
      details: input.details
    };

    await mkdir(dirname(this.eventsLogPath), { recursive: true });
    await writeFile(this.eventsLogPath, `${JSON.stringify(entry)}\n`, {
      encoding: 'utf8',
      flag: 'a'
    });
    this.emit(entry);
    return entry;
  }

  public async listEvents(filter: EventLogFilter = {}): Promise<EventLogEntry[]> {
    let rawContent = '';

    try {
      rawContent = await readFile(this.eventsLogPath, 'utf8');
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return [];
      }

      throw error;
    }

    const events = rawContent
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .flatMap((line) => {
        const parsed = safeJsonParse<EventLogEntry>(line);
        return parsed.success ? [parsed.data] : [];
      })
      .filter((entry) => (filter.level ? entry.level === filter.level : true))
      .filter((entry) => (filter.source ? entry.source === filter.source : true));

    if (typeof filter.limit === 'number') {
      return events.slice(-filter.limit);
    }

    return events;
  }

  public async clearEvents(): Promise<void> {
    try {
      await rm(this.eventsLogPath);
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  }

  public subscribe(listener: (entry: EventLogEntry) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(entry: EventLogEntry): void {
    this.listeners.forEach((listener) => listener(entry));
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}
