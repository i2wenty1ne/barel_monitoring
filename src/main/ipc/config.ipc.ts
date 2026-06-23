import { ipcMain } from 'electron';
import type { AppConfig } from '../../shared/types/config.types';
import type { ConfigGetResult, IpcActionResult } from '../../shared/types/ipc.types';
import type { ConfigService } from '../services/config/config.service';
import type { DataServiceManager } from '../services/data/data-service-manager';
import type { EventLogService } from '../services/event-log/event-log.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerConfigIpc(
  configService: ConfigService,
  dataServiceManager: DataServiceManager,
  eventLogService: EventLogService
): void {
  ipcMain.handle(IPC_CHANNELS.config.get, async (_event): Promise<ConfigGetResult> => {
    return {
      config: configService.getCurrentConfig(),
      validationError: configService.getLastValidationError()
    };
  });

  ipcMain.handle(
    IPC_CHANNELS.config.save,
    async (_event, config: AppConfig): Promise<IpcActionResult> => {
      try {
        await configService.saveConfig(config);
        await dataServiceManager.restart(config);
        await eventLogService.addEvent({
          level: 'info',
          source: 'config',
          message: 'Configuration saved'
        });
        return { success: true };
      } catch (error) {
        const message = getErrorMessage(error);
        await eventLogService.addEvent({
          level: 'error',
          source: 'config',
          message: 'Configuration save failed',
          details: { error: message }
        });
        return { success: false, message };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.config.reload, async (_event): Promise<ConfigGetResult> => {
    const result = await configService.reloadConfig();
    await dataServiceManager.restart(result.config);
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.config.reset, async (_event): Promise<ConfigGetResult> => {
    const result = await configService.resetConfig();
    await dataServiceManager.restart(result.config);
    await eventLogService.addEvent({
      level: 'warning',
      source: 'config',
      message: 'Configuration reset to defaults'
    });
    return result;
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown config IPC error';
}
