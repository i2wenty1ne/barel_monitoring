import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';
import { ConfigService } from './services/config/config.service';
import { CommandService } from './services/command/command.service';
import { DataServiceManager } from './services/data/data-service-manager';
import { EventLogService } from './services/event-log/event-log.service';
import { ProcessRuntimeService } from './services/process-runtime/process-runtime.service';
import type { AppConfig } from '../shared/types/config.types';

let mainWindow: BrowserWindow | null = null;
let dataServiceManager: DataServiceManager | null = null;

async function createMainWindow(config: AppConfig): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: 'Barrel Monitor',
    backgroundColor: '#0f172a',
    fullscreen: config.interface.fullscreenOnStart,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const configResult = await configService.loadConfig();
  const eventLogService = new EventLogService();

  await eventLogService.addEvent({
    level: 'info',
    source: 'application',
    message: 'Application started'
  });

  if (configResult.validationError) {
    await eventLogService.addEvent({
      level: 'error',
      source: 'config',
      message: 'Configuration load failed, default config is used as fallback',
      details: { error: configResult.validationError }
    });
  }

  if (configResult.migration) {
    await eventLogService.addEvent({
      level: 'info',
      source: 'config',
      message: 'Config migrated to schema v2',
      details: configResult.migration
    });
  }

  dataServiceManager = new DataServiceManager(configResult.config, eventLogService);
  const commandService = new CommandService(configService, dataServiceManager, eventLogService);
  const processRuntimeService = new ProcessRuntimeService(
    configService,
    dataServiceManager,
    commandService,
    eventLogService
  );
  mainWindow = await createMainWindow(configResult.config);

  registerIpcHandlers({
    mainWindow,
    configService,
    eventLogService,
    dataServiceManager,
    commandService,
    processRuntimeService
  });

  await dataServiceManager.start();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  void bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void bootstrap();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (dataServiceManager) {
    void dataServiceManager.stop();
  }
});
