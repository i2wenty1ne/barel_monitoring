import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AppConfig } from '../../../shared/types/config.types';
import { defaultConfig } from '../../../shared/config/default-config';
import { appConfigSchema } from '../../../shared/validation/config.schema';
import { getConfigPath } from '../../utils/paths';
import { safeJsonParse, toPrettyJson } from '../../utils/safe-json';

export type ConfigServiceOptions = {
  configPath?: string;
  configDir?: string;
};

export type ConfigLoadResult = {
  config: AppConfig;
  validationError?: string;
};

export class ConfigService {
  private readonly configPath: string;
  private currentConfig: AppConfig = defaultConfig;
  private lastValidationError?: string;

  public constructor(options: ConfigServiceOptions = {}) {
    this.configPath = getConfigPath(options.configPath, options.configDir);
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public getLastValidationError(): string | undefined {
    return this.lastValidationError;
  }

  public async loadConfig(): Promise<ConfigLoadResult> {
    await mkdir(dirname(this.configPath), { recursive: true });

    try {
      const rawConfig = await readFile(this.configPath, 'utf8');
      const parsedJson = safeJsonParse<unknown>(rawConfig);

      if (!parsedJson.success) {
        this.currentConfig = defaultConfig;
        this.lastValidationError = `config.json содержит некорректный JSON: ${parsedJson.error}`;
        return { config: this.currentConfig, validationError: this.lastValidationError };
      }

      const parsedConfig = appConfigSchema.safeParse(parsedJson.data);

      if (!parsedConfig.success) {
        this.currentConfig = defaultConfig;
        this.lastValidationError = parsedConfig.error.issues
          .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
          .join('; ');
        return { config: this.currentConfig, validationError: this.lastValidationError };
      }

      this.currentConfig = parsedConfig.data as AppConfig;
      this.lastValidationError = undefined;
      return { config: this.currentConfig };
    } catch (error) {
      if (isFileNotFoundError(error)) {
        await this.saveConfig(defaultConfig);
        this.currentConfig = defaultConfig;
        this.lastValidationError = undefined;
        return { config: this.currentConfig };
      }

      this.currentConfig = defaultConfig;
      this.lastValidationError = error instanceof Error ? error.message : 'Unknown config load error';
      return { config: this.currentConfig, validationError: this.lastValidationError };
    }
  }

  public async saveConfig(config: AppConfig): Promise<void> {
    const parsedConfig = appConfigSchema.safeParse(config);

    if (!parsedConfig.success) {
      const message = parsedConfig.error.issues
        .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Config validation failed: ${message}`);
    }

    await mkdir(dirname(this.configPath), { recursive: true });
    await writeFile(this.configPath, toPrettyJson(parsedConfig.data), 'utf8');
    this.currentConfig = parsedConfig.data as AppConfig;
    this.lastValidationError = undefined;
  }

  public async reloadConfig(): Promise<ConfigLoadResult> {
    return this.loadConfig();
  }

  public async resetConfig(): Promise<ConfigLoadResult> {
    await this.saveConfig(defaultConfig);
    return { config: this.currentConfig };
  }

  public getCurrentConfig(): AppConfig {
    return this.currentConfig;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}
