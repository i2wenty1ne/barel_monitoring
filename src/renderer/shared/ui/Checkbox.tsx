type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
};

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  disabled
}: CheckboxProps): React.JSX.Element {
  return (
    <label className="flex items-start gap-3 rounded-md border border-white/10 bg-slate-950/35 p-3">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-500 focus:ring-teal-300/40"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}
