import type { Status } from '../../../../shared/types/monitoring.types';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

type BarrelStatusProps = {
  status: Status;
};

export function BarrelStatus({ status }: BarrelStatusProps): React.JSX.Element {
  return <StatusBadge status={status} />;
}
