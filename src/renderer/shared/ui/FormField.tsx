type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function FormField({ label, error, hint, children }: FormFieldProps): React.JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}
