import type { BarrelMonitorApi } from '../../../shared/types/ipc.types';

declare global {
  interface Window {
    barrelMonitor: BarrelMonitorApi;
  }
}

export {};
