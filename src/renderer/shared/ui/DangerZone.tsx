type DangerZoneProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DangerZone({ title, description, children }: DangerZoneProps): React.JSX.Element {
  return (
    <section className="rounded-lg border border-rose-300/20 bg-rose-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-rose-100">{title}</h3>
          <p className="mt-1 text-sm text-rose-100/70">{description}</p>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </section>
  );
}
