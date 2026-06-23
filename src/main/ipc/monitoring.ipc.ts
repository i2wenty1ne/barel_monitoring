import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type {
  DataServiceStatus,
  ManualReadRequest,
  ManualReadResult,
  MonitoringSnapshot,
  TestConnectionResult
} from '../../shared/types/monitoring.types';
import type { DataServiceManager } from '../services/data/data-service-manager';
import type { EventLogService } from '../services/event-log/event-log.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerMonitoringIpc(
  mainWindow: BrowserWindow,
  dataServiceManager: DataServiceManager,
  eventLogService: EventLogService
): void {
  ipcMain.handle(
    IPC_CHANNELS.monitoring.getSnapshot,
    async (_event): Promise<MonitoringSnapshot> => dataServiceManager.readAllChannels()
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.readAllNow,
    async (_event): Promise<MonitoringSnapshot> => {
      try {
        const snapshot = await dataServiceManager.readAllChannels();
        await eventLogService.addEvent({
          level: 'info',
          source: 'diagnostics',
          message: 'Read all channels clicked',
          details: { status: snapshot.status, updatedAt: snapshot.updatedAt }
        });
        return snapshot;
      } catch (error) {
        await eventLogService.addEvent({
          level: 'error',
          source: 'diagnostics',
          message: 'Read all channels failed',
          details: { error: error instanceof Error ? error.message : 'Unknown read error' }
        });
        throw error;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.readRegisters,
    async (_event, request: ManualReadRequest): Promise<ManualReadResult> => {
      const result = await dataServiceManager.readRegisters(request);
      await eventLogService.addEvent({
        level: result.success ? 'info' : 'error',
        source: 'diagnostics',
        message: result.success ? 'Manual register read completed' : 'Manual register read failed',
        details: { request, result }
      });
      return result;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.testConnection,
    async (_event): Promise<TestConnectionResult> => {
      const result = await dataServiceManager.testConnection();
      await eventLogService.addEvent({
        level: result.success ? 'info' : 'warning',
        source: 'settings',
        message: 'Test connection from settings',
        details: { result }
      });
      return result;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.getStatus,
    async (_event): Promise<DataServiceStatus> => dataServiceManager.getStatus()
  );

  dataServiceManager.subscribe((snapshot) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.monitoring.snapshotUpdated, snapshot);
    }
  });
}
