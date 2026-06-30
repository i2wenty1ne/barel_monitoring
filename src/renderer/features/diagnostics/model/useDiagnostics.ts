import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonitoringSnapshot, TestConnectionResult } from '../../../../shared/types/monitoring.types';
import type { DiagnosticsState } from './diagnostics.types';

type UseDiagnosticsResult = DiagnosticsState & {
  refresh: () => Promise<void>;
  readAllNow: () => Promise<void>;
  testConnection: () => Promise<void>;
};

export function useDiagnostics(): UseDiagnosticsResult {
  const isMountedRef = useRef(false);
  const [state, setState] = useState<DiagnosticsState>({
    data: null,
    isLoading: true,
    error: null,
    actionResult: null,
    testConnectionResult: null
  });

  const loadDiagnostics = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const [configResult, snapshot, serviceStatus, systemInfo, recentEvents] = await Promise.all([
        window.barrelMonitor.config.get(),
        window.barrelMonitor.monitoring.getSnapshot(),
        window.barrelMonitor.monitoring.getStatus(),
        window.barrelMonitor.system.getInfo(),
        window.barrelMonitor.events.list({ limit: 20 })
      ]);

      if (isMountedRef.current) {
        setState((current) => ({
          ...current,
          data: {
            config: configResult.config,
            snapshot,
            serviceStatus,
            systemInfo,
            recentEvents
          },
          isLoading: false,
          error: null
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnostics load error';
      console.error(message, error);
      if (isMountedRef.current) {
        setState((current) => ({ ...current, isLoading: false, error: message }));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadDiagnostics();

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = window.barrelMonitor.monitoring.subscribe((snapshot: MonitoringSnapshot) => {
        setState((current) =>
          current.data
            ? {
                ...current,
                data: {
                  ...current.data,
                  snapshot
                }
              }
            : current
        );
      });
    } catch (error) {
      console.error('Diagnostics subscribe error', error);
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe?.();
    };
  }, [loadDiagnostics]);

  const readAllNow = useCallback(async (): Promise<void> => {
    try {
      const snapshot = await window.barrelMonitor.monitoring.readAllNow();
      const serviceStatus = await window.barrelMonitor.monitoring.getStatus();
      if (isMountedRef.current) {
        setState((current) =>
          current.data
            ? {
                ...current,
                data: { ...current.data, snapshot, serviceStatus },
                actionResult: { type: 'success', message: 'Все каналы прочитаны' }
              }
            : current
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Read all points error';
      console.error(message, error);
      if (isMountedRef.current) {
        setState((current) => ({ ...current, actionResult: { type: 'error', message } }));
      }
    }
  }, []);

  const testConnection = useCallback(async (): Promise<void> => {
    try {
      const result: TestConnectionResult = await window.barrelMonitor.monitoring.testConnection();
      if (isMountedRef.current) {
        setState((current) => ({
          ...current,
          testConnectionResult: result,
          actionResult: {
            type: result.success ? 'success' : 'error',
            message: result.message
          }
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test connection error';
      console.error(message, error);
      if (isMountedRef.current) {
        setState((current) => ({ ...current, actionResult: { type: 'error', message } }));
      }
    }
  }, []);

  return {
    ...state,
    refresh: loadDiagnostics,
    readAllNow,
    testConnection
  };
}
