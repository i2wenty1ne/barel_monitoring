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
    const config = configService.getCurrentConfig();

    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
      appMode: config.app.mode,
      configPath: configService.getConfigPath(),
      logsPath: eventLogService.getEventsLogPath(),
      currentDeviceName: config.device.name,
      currentDeviceModel: config.device.model,
      currentDeviceAddress: config.device.modbusAddress,
      currentConnectionPort: config.connection.port,
      currentConnectionBaudRate: config.connection.baudRate,
      currentConnectionParity: config.connection.parity,
      currentConnectionStopBits: config.connection.stopBits,
      currentConnectionDataBits: config.connection.dataBits
    };
  });

  ipcMain.handle(IPC_CHANNELS.system.openConfigFolder, async (_event): Promise<IpcActionResult> => {
    const result = await openPath(dirname(configService.getConfigPath()));
    await eventLogService.addEvent({
      level: result.success ? 'info' : 'error',
      source: 'system',
      message: 'Open config folder clicked',
      details: result
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.system.openLogsFolder, async (_event): Promise<IpcActionResult> => {
    const result = await openPath(dirname(eventLogService.getEventsLogPath()));
    await eventLogService.addEvent({
      level: result.success ? 'info' : 'error',
      source: 'system',
      message: 'Open logs folder clicked',
      details: result
    });
    return result;
  });
}

async function openPath(pathToOpen: string): Promise<IpcActionResult> {
  const errorMessage = await shell.openPath(pathToOpen);

  if (errorMessage) {
    return { success: false, message: errorMessage };
  }

  return { success: true };
}
