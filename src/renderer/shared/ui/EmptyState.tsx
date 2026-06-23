type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
      <h2 className="text-lg font-medium text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}
