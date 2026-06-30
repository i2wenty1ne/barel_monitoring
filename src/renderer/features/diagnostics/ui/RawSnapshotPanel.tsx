import type { MonitoringSnapshot } from '../../../../shared/types/monitoring.types';
import { stringifyPrettyJson } from '../../../../shared/lib/format';
import { CodeBlock } from '../../../shared/ui/CodeBlock';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Panel } from '../../../shared/ui/Panel';

type RawSnapshotPanelProps = {
  snapshot: MonitoringSnapshot | null;
};

export function RawSnapshotPanel({ snapshot }: RawSnapshotPanelProps): React.JSX.Element {
  return (
    <Panel className="p-5" title="Сырые данные снимка">
      {!snapshot ? (
        <EmptyState title="Снимок отсутствует" description="Данные появятся после первого чтения" />
      ) : (
        <div className="space-y-3">
          <CopyButton getText={() => stringifyPrettyJson(snapshot)} label="Скопировать снимок" />
          <CodeBlock value={stringifyPrettyJson(snapshot)} />
        </div>
      )}
    </Panel>
  );
}
