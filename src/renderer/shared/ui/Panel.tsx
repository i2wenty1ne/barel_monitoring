type PanelProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export function Panel({ children, className = '', title }: PanelProps): React.JSX.Element {
  return (
    <section className={`rounded-lg border border-white/10 bg-white/[0.045] ${className}`}>
      {title ? <h2 className="mb-4 text-lg font-medium text-white">{title}</h2> : null}
      {children}
    </section>
  );
}
