import type { DiagnosticsData } from '../model/diagnostics.types';
import { createDiagnosticsReport } from '../model/diagnostics.utils';
import type { TestConnectionResult } from '../../../../shared/types/monitoring.types';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { Panel } from '../../../shared/ui/Panel';

type DiagnosticActionsPanelProps = {
  data: DiagnosticsData;
  actionMessage: { type: 'success' | 'error'; message: string } | null;
  lastTestResult: TestConnectionResult | null;
  onRefresh: () => void;
  onReadAll: () => void;
  onTestConnection: () => void;
};

export function DiagnosticActionsPanel({
  data,
  actionMessage,
  lastTestResult,
  onRefresh,
  onReadAll,
  onTestConnection
}: DiagnosticActionsPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Действия">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onTestConnection} variant="secondary">
          Проверить подключение
        </Button>
        <Button onClick={onReadAll} variant="secondary">
          Прочитать все точки
        </Button>
        <Button onClick={onRefresh} variant="ghost">
          Обновить диагностику
        </Button>
        <CopyButton
          getText={() => createDiagnosticsReport(data, lastTestResult)}
          label="Скопировать диагностику"
          onError={(message) => window.alert(message)}
        />
      </div>
      {actionMessage ? (
        <div className="mt-4">
          <Alert type={actionMessage.type === 'success' ? 'success' : 'error'}>
            {actionMessage.message}
          </Alert>
        </div>
      ) : null}
    </Panel>
  );
}
