import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonitoringSnapshot } from '../../../../shared/types/monitoring.types';

type MonitoringSnapshotState = {
  data: MonitoringSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

type UseMonitoringSnapshotResult = MonitoringSnapshotState & {
  refresh: () => Promise<void>;
  lastUpdatedAt: string | null;
};

export function useMonitoringSnapshot(): UseMonitoringSnapshotResult {
  const isMountedRef = useRef(false);
  const [state, setState] = useState<MonitoringSnapshotState>({
    data: null,
    isLoading: true,
    error: null
  });

  const setSafeState = useCallback((nextState: Partial<MonitoringSnapshotState>) => {
    if (isMountedRef.current) {
      setState((currentState) => ({ ...currentState, ...nextState }));
    }
  }, []);

  const loadSnapshot = useCallback(
    async (useManualRead: boolean): Promise<void> => {
      try {
        const snapshot = useManualRead
          ? await window.barrelMonitor.monitoring.readAllNow()
          : await window.barrelMonitor.monitoring.getSnapshot();
        setSafeState({ data: snapshot, isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'IPC monitoring error';
        console.error(message, error);
        setSafeState({ isLoading: false, error: message });
      }
    },
    [setSafeState]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await loadSnapshot(true);
  }, [loadSnapshot]);

  useEffect(() => {
    isMountedRef.current = true;
    let unsubscribe: (() => void) | null = null;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    void loadSnapshot(false);

    try {
      unsubscribe = window.barrelMonitor.monitoring.subscribe((snapshot) => {
        setSafeState({ data: snapshot, isLoading: false, error: null });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Monitoring subscribe error';
      console.error(message, error);
      pollingInterval = setInterval(() => {
        void loadSnapshot(false);
      }, 1000);
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe?.();

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [loadSnapshot, setSafeState]);

  return {
    ...state,
    refresh,
    lastUpdatedAt: state.data?.updatedAt ?? null
  };
}
