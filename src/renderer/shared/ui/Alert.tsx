type AlertType = 'info' | 'warning' | 'error' | 'success';

type AlertProps = {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
};

const classes: Record<AlertType, string> = {
  info: 'border-sky-300/25 bg-sky-500/10 text-sky-100',
  warning: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  error: 'border-rose-300/25 bg-rose-500/10 text-rose-100',
  success: 'border-teal-300/25 bg-teal-500/10 text-teal-100'
};

export function Alert({ type = 'info', title, children }: AlertProps): React.JSX.Element {
  return (
    <div className={`rounded-lg border p-4 text-sm ${classes[type]}`}>
      {title ? <div className="mb-1 font-medium">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}
