import type { Status } from '../types/monitoring.types';
import type { ValueThresholdConfig } from '../types/config.types';

const statusPriority: Record<Status, number> = {
  'connection-error': 5,
  'no-data': 4,
  alarm: 3,
  warning: 2,
  ok: 1
};

export function getValueStatus(value: number, thresholds: ValueThresholdConfig): Status {
  if (value <= thresholds.alarmLow || value >= thresholds.alarmHigh) {
    return 'alarm';
  }

  if (value <= thresholds.warningLow || value >= thresholds.warningHigh) {
    return 'warning';
  }

  return 'ok';
}

export function getWorstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, current) => {
    return statusPriority[current] > statusPriority[worst] ? current : worst;
  }, 'ok');
}
