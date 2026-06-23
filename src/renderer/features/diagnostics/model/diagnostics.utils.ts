import type { DiagnosticsData } from './diagnostics.types';
import { stringifyPrettyJson } from '../../../../shared/lib/format';

export function createDiagnosticsReport(data: DiagnosticsData, lastTestResult: unknown): string {
  return stringifyPrettyJson({
    generatedAt: new Date().toISOString(),
    systemInfo: data.systemInfo,
    app: data.config.app,
    connection: data.config.connection,
    device: data.config.device,
    serviceStatus: data.serviceStatus,
    snapshot: data.snapshot,
    lastTestConnectionResult: lastTestResult,
    recentEvents: data.recentEvents
  });
}

export function formatScalingForDiagnostics(scaling: unknown): string {
  if (!scaling || typeof scaling !== 'object') {
    return '—';
  }

  if ('type' in scaling && scaling.type === 'none') {
    return 'none';
  }

  return stringifyPrettyJson(scaling);
}
