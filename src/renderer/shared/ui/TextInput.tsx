import { FormField } from './FormField';

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  placeholder
}: TextInputProps): React.JSX.Element {
  return (
    <FormField error={error} hint={hint} label={label}>
      <input
        className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </FormField>
  );
}
