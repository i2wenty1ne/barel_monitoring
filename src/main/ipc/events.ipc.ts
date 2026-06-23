import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type { EventLogEntry, EventLogFilter } from '../../shared/types/event.types';
import type { IpcActionResult } from '../../shared/types/ipc.types';
import type { EventLogService } from '../services/event-log/event-log.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerEventsIpc(
  mainWindow: BrowserWindow,
  eventLogService: EventLogService
): void {
  ipcMain.handle(
    IPC_CHANNELS.events.list,
    async (_event, filter?: EventLogFilter): Promise<EventLogEntry[]> =>
      eventLogService.listEvents(filter)
  );

  ipcMain.handle(IPC_CHANNELS.events.clear, async (_event): Promise<IpcActionResult> => {
    try {
      await eventLogService.clearEvents();
      await eventLogService.addEvent({
        level: 'warning',
        source: 'events',
        message: 'Event log cleared'
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown events clear error'
      };
    }
  });

  eventLogService.subscribe((entry) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.events.entryCreated, entry);
    }
  });
}
