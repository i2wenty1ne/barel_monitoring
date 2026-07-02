import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig } from '../../../../shared/types/config.types';
import type { ConfigValidationError, SystemInfo } from '../../../../shared/types/ipc.types';
import { i18n } from '../../../shared/i18n/i18n';
import { cloneConfig, hasConfigChanged } from './config-editor.utils';
import type { ConfigEditorState } from './config-editor.types';

type UseConfigEditorResult = ConfigEditorState & {
  updateConfig: (updater: (config: AppConfig) => AppConfig) => void;
  saveConfig: () => Promise<void>;
  resetDraft: () => void;
  reloadConfig: () => Promise<void>;
  resetToDefault: () => Promise<void>;
  openConfigFolder: () => Promise<void>;
  openLogsFolder: () => Promise<void>;
};

export function useConfigEditor(): UseConfigEditorResult {
  const isMountedRef = useRef(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<AppConfig | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ConfigValidationError[]>([]);

  const loadConfig = useCallback(async (mode: 'get' | 'reload'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const [configResult, nextSystemInfo] = await Promise.all([
        mode === 'reload' ? window.barrelMonitor.config.reload() : window.barrelMonitor.config.get(),
        window.barrelMonitor.system.getInfo()
      ]);

      if (!isMountedRef.current) {
        return;
      }

      setConfig(cloneConfig(configResult.config));
      setOriginalConfig(cloneConfig(configResult.config));
      setSystemInfo(nextSystemInfo);
      setValidationErrors(
        configResult.validationError
          ? [{ path: 'config', message: configResult.validationError }]
          : []
      );
      setSuccessMessage(mode === 'reload' ? i18n.t('settings.editor.reloaded') : null);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : i18n.t('settings.editor.loadError');
      console.error(message, caughtError);
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadConfig('get');

    return () => {
      isMountedRef.current = false;
    };
  }, [loadConfig]);

  const updateConfig = useCallback((updater: (config: AppConfig) => AppConfig): void => {
    setConfig((currentConfig) => (currentConfig ? updater(cloneConfig(currentConfig)) : currentConfig));
    setSuccessMessage(null);
    setValidationErrors([]);
  }, []);

  const saveConfig = useCallback(async (): Promise<void> => {
    if (!config) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await window.barrelMonitor.config.save(config);

      if (!isMountedRef.current) {
        return;
      }

      if (!result.success) {
        setValidationErrors(result.validationErrors ?? []);
        setError(result.message ?? 'Config validation failed');
        return;
      }

      const savedConfig = cloneConfig(result.config ?? config);
      setConfig(savedConfig);
      setOriginalConfig(cloneConfig(savedConfig));
      setValidationErrors([]);
      setSuccessMessage(i18n.t('settings.editor.saved'));
      await window.barrelMonitor.monitoring.readAllNow();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : i18n.t('settings.editor.saveError');
      console.error(message, caughtError);
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [config]);

  const resetDraft = useCallback((): void => {
    if (originalConfig) {
      setConfig(cloneConfig(originalConfig));
      setValidationErrors([]);
      setError(null);
      setSuccessMessage(i18n.t('settings.editor.draftReset'));
    }
  }, [originalConfig]);

  const reloadConfig = useCallback(async (): Promise<void> => {
    await loadConfig('reload');
    await window.barrelMonitor.monitoring.readAllNow();
  }, [loadConfig]);

  const resetToDefault = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await window.barrelMonitor.config.reset();

      if (!isMountedRef.current) {
        return;
      }

      setConfig(cloneConfig(result.config));
      setOriginalConfig(cloneConfig(result.config));
      setValidationErrors(
        result.validationError ? [{ path: 'config', message: result.validationError }] : []
      );
      setSuccessMessage(i18n.t('settings.editor.defaultsReset'));
      await window.barrelMonitor.monitoring.readAllNow();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : i18n.t('settings.editor.resetError');
      console.error(message, caughtError);
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, []);

  const openConfigFolder = useCallback(async (): Promise<void> => {
    const result = await window.barrelMonitor.system.openConfigFolder();
    if (!result.success) {
      setError(result.message ?? i18n.t('settings.editor.openConfigFolderError'));
    }
  }, []);

  const openLogsFolder = useCallback(async (): Promise<void> => {
    const result = await window.barrelMonitor.system.openLogsFolder();
    if (!result.success) {
      setError(result.message ?? i18n.t('settings.editor.openLogsFolderError'));
    }
  }, []);

  const hasUnsavedChanges = useMemo(
    () => hasConfigChanged(config, originalConfig),
    [config, originalConfig]
  );

  return {
    config,
    originalConfig,
    systemInfo,
    isLoading,
    isSaving,
    error,
    successMessage,
    validationErrors,
    hasUnsavedChanges,
    updateConfig,
    saveConfig,
    resetDraft,
    reloadConfig,
    resetToDefault,
    openConfigFolder,
    openLogsFolder
  };
}
