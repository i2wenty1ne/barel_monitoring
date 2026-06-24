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
        label="Уровень"
        onChange={(level) => onChange({ ...filters, level })}
        options={[
          { label: 'Все', value: 'all' },
          { label: 'Информация', value: 'info' },
          { label: 'Предупреждение', value: 'warning' },
          { label: 'Ошибка', value: 'error' }
        ]}
        value={filters.level}
      />
      <Select
        label="Источник"
        onChange={(source) => onChange({ ...filters, source })}
        options={[
          { label: 'Все', value: 'all' },
          ...sources.map((source) => ({ label: source, value: source }))
        ]}
        value={filters.source}
      />
      <TextInput
        label="Поиск"
        onChange={(search) => onChange({ ...filters, search })}
        placeholder="message, entityId, details"
        value={filters.search}
      />
      <Select
        label="Лимит"
        onChange={(limit) => onChange({ ...filters, limit })}
        options={[
          { label: '50', value: 50 },
          { label: '100', value: 100 },
          { label: '500', value: 500 },
          { label: 'Все', value: 'all' }
        ]}
        value={filters.limit}
      />
    </div>
  );
}
