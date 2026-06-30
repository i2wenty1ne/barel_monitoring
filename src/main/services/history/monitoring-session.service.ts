import type { MonitoringProfile, MonitoringSession } from '../../../shared/types/config.types';
import type { ConfigService } from '../config/config.service';
import type { EventLogService } from '../event-log/event-log.service';

export class MonitoringSessionService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly eventLogService: EventLogService
  ) {}

  public getActiveSessions(): MonitoringSession[] {
    return this.configService.getCurrentConfig().monitoringSessions.filter((session) => session.status === 'running');
  }

  public getProfiles(assetId: string): MonitoringProfile[] {
    return this.configService.getCurrentConfig().monitoringProfiles.filter((profile) => profile.assetId === assetId);
  }

  public async saveProfile(profile: MonitoringProfile): Promise<MonitoringProfile> {
    const config = this.configService.getCurrentConfig();
    const now = new Date().toISOString();
    const nextProfile = { ...profile, updatedAt: now };
    await this.configService.saveConfig({
      ...config,
      monitoringProfiles: [
        ...config.monitoringProfiles.filter((item) => item.id !== profile.id),
        nextProfile
      ]
    });
    await this.eventLogService.addEvent({
      level: 'info',
      source: 'monitoring',
      entityId: profile.assetId,
      message: 'Monitoring profile saved',
      details: { profileId: profile.id }
    });
    return nextProfile;
  }

  public async start(assetId: string, profileId: string): Promise<MonitoringSession> {
    const config = this.configService.getCurrentConfig();
    const profile = config.monitoringProfiles.find((item) => item.id === profileId && item.assetId === assetId);

    if (!profile) {
      throw new Error('Monitoring profile not found');
    }

    const now = new Date().toISOString();
    const session: MonitoringSession = {
      id: `session-${Date.now()}`,
      assetId,
      profileId,
      status: 'running',
      startedAt: now,
      startedBy: 'operator'
    };
    await this.configService.saveConfig({
      ...config,
      monitoringSessions: [
        ...config.monitoringSessions.map((item) =>
          item.assetId === assetId && item.status === 'running'
            ? { ...item, status: 'stopped' as const, stoppedAt: now }
            : item
        ),
        session
      ]
    });
    await this.eventLogService.addEvent({
      level: 'info',
      source: 'monitoring',
      entityId: assetId,
      message: 'Monitoring session started',
      details: { session }
    });
    return session;
  }

  public async stop(sessionId: string): Promise<void> {
    const config = this.configService.getCurrentConfig();
    const session = config.monitoringSessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error('Monitoring session not found');
    }

    const now = new Date().toISOString();
    await this.configService.saveConfig({
      ...config,
      monitoringSessions: config.monitoringSessions.map((item) =>
        item.id === sessionId ? { ...item, status: 'stopped', stoppedAt: now } : item
      )
    });
    await this.eventLogService.addEvent({
      level: 'info',
      source: 'monitoring',
      entityId: session.assetId,
      message: 'Monitoring session stopped',
      details: { sessionId }
    });
  }
}
