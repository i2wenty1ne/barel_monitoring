import type { ConfigValidationError } from '../../../../shared/types/ipc.types';
import { Alert } from '../../../shared/ui/Alert';

type ConfigValidationSummaryProps = {
  validationErrors: ConfigValidationError[];
};

export function ConfigValidationSummary({
  validationErrors
}: ConfigValidationSummaryProps): React.JSX.Element | null {
  if (validationErrors.length === 0) {
    return null;
  }

  return (
    <Alert title="Нельзя сохранить настройки" type="error">
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {validationErrors.map((error) => (
          <li key={`${error.path}-${error.message}`}>
            <span className="font-mono text-xs">{error.path}</span>: {error.message}
          </li>
        ))}
      </ul>
    </Alert>
  );
}
