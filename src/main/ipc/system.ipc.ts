import { app, ipcMain, shell } from 'electron';
import { dirname } from 'node:path';
import type { IpcActionResult, SystemInfo } from '../../shared/types/ipc.types';
import type { ConfigService } from '../services/config/config.service';
import type { EventLogService } from '../services/event-log/event-log.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerSystemIpc(
  configService: ConfigService,
  eventLogService: EventLogService
): void {
  ipcMain.handle(IPC_CHANNELS.system.getInfo, async (_event): Promise<SystemInfo> => {
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      platform: process.platform,
      configPath: configService.getConfigPath(),
      logsPath: eventLogService.getEventsLogPath()
    };
  });

  ipcMain.handle(IPC_CHANNELS.system.openConfigFolder, async (_event): Promise<IpcActionResult> => {
    return openPath(dirname(configService.getConfigPath()));
  });

  ipcMain.handle(IPC_CHANNELS.system.openLogsFolder, async (_event): Promise<IpcActionResult> => {
    return openPath(dirname(eventLogService.getEventsLogPath()));
  });
}

async function openPath(pathToOpen: string): Promise<IpcActionResult> {
  const errorMessage = await shell.openPath(pathToOpen);

  if (errorMessage) {
    return { success: false, message: errorMessage };
  }

  return { success: true };
}
