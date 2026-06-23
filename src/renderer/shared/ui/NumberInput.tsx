import { FormField } from './FormField';

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberInput({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  min,
  max,
  step
}: NumberInputProps): React.JSX.Element {
  return (
    <FormField error={error} hint={hint} label={label}>
      <input
        className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={Number.isFinite(value) ? value : 0}
      />
    </FormField>
  );
}
