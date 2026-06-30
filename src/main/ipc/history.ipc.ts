import { ipcMain } from 'electron';
import type {
  ExportResult,
  GetTrendQuery,
  MonitoringProfile,
  MonitoringSession,
  TrendSeries
} from '../../shared/types/config.types';
import type { ConfigService } from '../services/config/config.service';
import type { MonitoringSessionService } from '../services/history/monitoring-session.service';
import type { TimeSeriesStorage } from '../services/history/time-series-storage';
import { IPC_CHANNELS } from './ipc-channels';

export function registerHistoryIpc(
  configService: ConfigService,
  storage: TimeSeriesStorage,
  sessionService: MonitoringSessionService
): void {
  ipcMain.handle(IPC_CHANNELS.history.getTrend, async (_event, query: GetTrendQuery): Promise<TrendSeries[]> => {
    return storage.query(query, getPointNames(configService));
  });

  ipcMain.handle(IPC_CHANNELS.history.exportCsv, async (_event, query: GetTrendQuery): Promise<ExportResult> => {
    return storage.exportCsv(query, getPointNames(configService));
  });

  ipcMain.handle(
    IPC_CHANNELS.sessions.start,
    async (_event, assetId: string, profileId: string): Promise<MonitoringSession> =>
      sessionService.start(assetId, profileId)
  );

  ipcMain.handle(
    IPC_CHANNELS.sessions.stop,
    async (_event, sessionId: string): Promise<void> => sessionService.stop(sessionId)
  );

  ipcMain.handle(
    IPC_CHANNELS.sessions.getActive,
    async (_event): Promise<MonitoringSession[]> => sessionService.getActiveSessions()
  );

  ipcMain.handle(
    IPC_CHANNELS.sessions.getProfiles,
    async (_event, assetId: string): Promise<MonitoringProfile[]> => sessionService.getProfiles(assetId)
  );

  ipcMain.handle(
    IPC_CHANNELS.sessions.saveProfile,
    async (_event, profile: MonitoringProfile): Promise<MonitoringProfile> => sessionService.saveProfile(profile)
  );
}

function getPointNames(configService: ConfigService): Map<string, { name: string; unit?: string }> {
  return new Map(
    configService.getCurrentConfig().points.map((point) => [
      point.id,
      { name: point.name, unit: point.displayUnit ?? point.rawUnit }
    ])
  );
}
