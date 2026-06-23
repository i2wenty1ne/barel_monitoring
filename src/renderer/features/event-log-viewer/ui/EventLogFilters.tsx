import type { EventLogFiltersState } from '../model/event-log-filters';
import { Select } from '../../../shared/ui/Select';
import { TextInput } from '../../../shared/ui/TextInput';

type EventLogFiltersProps = {
  filters: EventLogFiltersState;
  sources: string[];
  onChange: (filters: EventLogFiltersState) => void;
};

export function EventLogFilters({
  filters,
  sources,
  onChange
}: EventLogFiltersProps): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Select
        label="Level"
        onChange={(level) => onChange({ ...filters, level })}
        options={[
          { label: 'all', value: 'all' },
          { label: 'info', value: 'info' },
          { label: 'warning', value: 'warning' },
          { label: 'error', value: 'error' }
        ]}
        value={filters.level}
      />
      <Select
        label="Source"
        onChange={(source) => onChange({ ...filters, source })}
        options={[
          { label: 'all', value: 'all' },
          ...sources.map((source) => ({ label: source, value: source }))
        ]}
        value={filters.source}
      />
      <TextInput
        label="Search"
        onChange={(search) => onChange({ ...filters, search })}
        placeholder="message, entityId, details"
        value={filters.search}
      />
      <Select
        label="Limit"
        onChange={(limit) => onChange({ ...filters, limit })}
        options={[
          { label: '50', value: 50 },
          { label: '100', value: 100 },
          { label: '500', value: 500 },
          { label: 'all', value: 'all' }
        ]}
        value={filters.limit}
      />
    </div>
  );
}
