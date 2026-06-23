import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../../../../shared/types/config.types';

type AppConfigState = {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  validationError: string | null;
};

type UseAppConfigResult = AppConfigState & {
  refresh: () => Promise<void>;
};

export function useAppConfig(): UseAppConfigResult {
  const isMountedRef = useRef(false);
  const [state, setState] = useState<AppConfigState>({
    config: null,
    isLoading: true,
    error: null,
    validationError: null
  });

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      const result = await window.barrelMonitor.config.get();

      if (isMountedRef.current) {
        setState({
          config: result.config,
          isLoading: false,
          error: null,
          validationError: result.validationError ?? null
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IPC config error';
      console.error(message, error);

      if (isMountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          isLoading: false,
          error: message
        }));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadConfig();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadConfig]);

  return {
    ...state,
    refresh: loadConfig
  };
}
