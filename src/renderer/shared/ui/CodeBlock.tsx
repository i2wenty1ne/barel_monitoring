type CodeBlockProps = {
  value: string;
  maxHeightClassName?: string;
};

export function CodeBlock({
  value,
  maxHeightClassName = 'max-h-96'
}: CodeBlockProps): React.JSX.Element {
  return (
    <pre
      className={`${maxHeightClassName} overflow-auto rounded-lg border border-white/10 bg-slate-950/70 p-4 text-xs leading-relaxed text-slate-200`}
    >
      <code>{value}</code>
    </pre>
  );
}
