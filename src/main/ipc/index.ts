import type { BrowserWindow } from 'electron';
import type { ConfigService } from '../services/config/config.service';
import type { DataServiceManager } from '../services/data/data-service-manager';
import type { EventLogService } from '../services/event-log/event-log.service';
import { registerConfigIpc } from './config.ipc';
import { registerEventsIpc } from './events.ipc';
import { registerMonitoringIpc } from './monitoring.ipc';
import { registerSystemIpc } from './system.ipc';

export function registerIpcHandlers(options: {
  mainWindow: BrowserWindow;
  configService: ConfigService;
  eventLogService: EventLogService;
  dataServiceManager: DataServiceManager;
}): void {
  registerConfigIpc(options.configService, options.dataServiceManager, options.eventLogService);
  registerMonitoringIpc(options.mainWindow, options.dataServiceManager, options.eventLogService);
  registerEventsIpc(options.mainWindow, options.eventLogService);
  registerSystemIpc(options.configService, options.eventLogService);
}
