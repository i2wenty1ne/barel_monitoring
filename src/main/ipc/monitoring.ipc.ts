import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type {
  DataServiceStatus,
  MonitoringSnapshot,
  TestConnectionResult
} from '../../shared/types/monitoring.types';
import type { DataServiceManager } from '../services/data/data-service-manager';
import { IPC_CHANNELS } from './ipc-channels';

export function registerMonitoringIpc(
  mainWindow: BrowserWindow,
  dataServiceManager: DataServiceManager
): void {
  ipcMain.handle(
    IPC_CHANNELS.monitoring.getSnapshot,
    async (_event): Promise<MonitoringSnapshot> => dataServiceManager.readAllChannels()
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.readAllNow,
    async (_event): Promise<MonitoringSnapshot> => dataServiceManager.readAllChannels()
  );

  ipcMain.handle(
    IPC_CHANNELS.monitoring.testConnection,
    async (_event): Promise<TestConnectionResult> => dataServiceManager.testConnection()
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
