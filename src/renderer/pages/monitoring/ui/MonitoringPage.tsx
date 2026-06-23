import { useEffect, useMemo, useState } from 'react';
import type { AppMode } from '../../../../shared/types/config.types';
import type {
  DataServiceStatus,
  MonitoringSnapshot,
  TestConnectionResult
} from '../../../../shared/types/monitoring.types';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type PageState = {
  mode: AppMode;
  status: DataServiceStatus | null;
  snapshot: MonitoringSnapshot | null;
  validationError?: string;
};

export function MonitoringPage(): React.JSX.Element {
  const [pageState, setPageState] = useState<PageState>({
    mode: 'mock',
    status: null,
    snapshot: null
  });
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialState(): Promise<void> {
      const [configResult, status, snapshot] = await Promise.all([
        window.barrelMonitor.config.get(),
        window.barrelMonitor.monitoring.getStatus(),
        window.barrelMonitor.monitoring.getSnapshot()
      ]);

      if (isMounted) {
        setPageState({
          mode: configResult.config.app.mode,
          status,
          snapshot,
          validationError: configResult.validationError
        });
      }
    }

    void loadInitialState();

    const unsubscribe = window.barrelMonitor.monitoring.subscribe((snapshot) => {
      setPageState((currentState) => ({
        ...currentState,
        snapshot
      }));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const lastUpdate = useMemo(() => {
    const timestamp = pageState.snapshot?.updatedAt ?? pageState.status?.lastSuccessfulReadAt;

    if (!timestamp) {
      return 'No data yet';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(timestamp));
  }, [pageState.snapshot?.updatedAt, pageState.status?.lastSuccessfulReadAt]);

  async function handleTestConnection(): Promise<void> {
    setIsTesting(true);
    try {
      const result = await window.barrelMonitor.monitoring.testConnection();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-300/80">
          Barrel Monitor
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal text-white">
          Foundation is ready
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoPanel label="App mode" value={pageState.mode} />
        <InfoPanel
          label="Connection status"
          value={<StatusBadge status={pageState.status?.connectionStatus ?? 'no-data'} />}
        />
        <InfoPanel label="Last update" value={lastUpdate} />
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">IPC health check</h2>
            <p className="mt-1 text-sm text-slate-400">
              Renderer calls main process through the typed preload API.
            </p>
          </div>
          <button
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-teal-400 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300"
            disabled={isTesting}
            onClick={() => void handleTestConnection()}
            type="button"
          >
            {isTesting ? 'Testing...' : 'Test connection'}
          </button>
        </div>

        {testResult ? (
          <div className="mt-5 rounded-md border border-white/10 bg-slate-950/70 p-4 text-sm">
            <div className={testResult.success ? 'text-teal-200' : 'text-rose-200'}>
              {testResult.message}
            </div>
          </div>
        ) : null}

        {pageState.validationError ? (
          <div className="mt-5 rounded-md border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            {pageState.validationError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type InfoPanelProps = {
  label: string;
  value: React.ReactNode;
};

function InfoPanel({ label, value }: InfoPanelProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-3 text-base text-slate-100">{value}</div>
    </div>
  );
}
