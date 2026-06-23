import { useEffect, useState } from 'react';
import type { DataServiceStatus } from '../../../../shared/types/monitoring.types';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function TopStatusBar(): React.JSX.Element {
  const [status, setStatus] = useState<DataServiceStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    void window.barrelMonitor.monitoring.getStatus().then((nextStatus) => {
      if (isMounted) {
        setStatus(nextStatus);
      }
    });

    const unsubscribe = window.barrelMonitor.monitoring.subscribe(() => {
      void window.barrelMonitor.monitoring.getStatus().then((nextStatus) => {
        if (isMounted) {
          setStatus(nextStatus);
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-950/70 px-8">
      <div className="text-sm text-slate-300">Production barrel monitoring desktop</div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">Connection</span>
        <StatusBadge status={status?.connectionStatus ?? 'no-data'} />
      </div>
    </header>
  );
}
