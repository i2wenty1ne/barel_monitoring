import { app } from 'electron';
import { dirname, join } from 'node:path';

export function getUserDataPath(customUserDataPath?: string): string {
  return customUserDataPath ?? app.getPath('userData');
}

export function getConfigPath(customConfigPath?: string, customConfigDir?: string): string {
  if (customConfigPath) {
    return customConfigPath;
  }

  return join(customConfigDir ?? getUserDataPath(), 'config.json');
}

export function getConfigDir(configPath: string): string {
  return dirname(configPath);
}

export function getLogsDir(customLogsDir?: string, customUserDataPath?: string): string {
  return customLogsDir ?? join(getUserDataPath(customUserDataPath), 'logs');
}

export function getEventsLogPath(customEventsLogPath?: string, customLogsDir?: string): string {
  return customEventsLogPath ?? join(getLogsDir(customLogsDir), 'events.jsonl');
}
