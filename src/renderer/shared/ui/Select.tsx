import { FormField } from './FormField';

export type SelectOption<TValue extends string | number = string> = {
  label: string;
  value: TValue;
};

type SelectProps<TValue extends string | number> = {
  label: string;
  value: TValue;
  options: SelectOption<TValue>[];
  onChange: (value: TValue) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
};

export function Select<TValue extends string | number>({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  disabled
}: SelectProps<TValue>): React.JSX.Element {
  return (
    <FormField error={error} hint={hint} label={label}>
      <select
        className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => {
          const selectedOption = options.find((option) => String(option.value) === event.target.value);
          if (selectedOption) {
            onChange(selectedOption.value);
          }
        }}
        value={String(value)}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
