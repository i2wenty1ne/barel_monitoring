type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Panel({ children, className = '' }: PanelProps): React.JSX.Element {
  return (
    <section className={`rounded-lg border border-white/10 bg-white/[0.045] ${className}`}>
      {children}
    </section>
  );
}
