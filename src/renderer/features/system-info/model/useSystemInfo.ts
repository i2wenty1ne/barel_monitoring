import { useCallback, useEffect, useRef, useState } from 'react';
import type { SystemInfo } from '../../../../shared/types/ipc.types';

type UseSystemInfoResult = {
  data: SystemInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  openConfigFolder: () => Promise<void>;
  openLogsFolder: () => Promise<void>;
};

export function useSystemInfo(): UseSystemInfoResult {
  const isMountedRef = useRef(false);
  const [data, setData] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await window.barrelMonitor.system.getInfo();
      if (isMountedRef.current) {
        setData(info);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'System info error';
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
    void refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  const openConfigFolder = useCallback(async (): Promise<void> => {
    const result = await window.barrelMonitor.system.openConfigFolder();
    if (!result.success) {
      setError(result.message ?? 'Не удалось открыть папку config');
    }
  }, []);

  const openLogsFolder = useCallback(async (): Promise<void> => {
    const result = await window.barrelMonitor.system.openLogsFolder();
    if (!result.success) {
      setError(result.message ?? 'Не удалось открыть папку логов');
    }
  }, []);

  return { data, isLoading, error, refresh, openConfigFolder, openLogsFolder };
}
