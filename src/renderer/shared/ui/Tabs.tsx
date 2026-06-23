export type TabItem<TTab extends string> = {
  id: TTab;
  label: string;
};

type TabsProps<TTab extends string> = {
  items: TabItem<TTab>[];
  activeTab: TTab;
  onChange: (tab: TTab) => void;
};

export function Tabs<TTab extends string>({
  items,
  activeTab,
  onChange
}: TabsProps<TTab>): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
      {items.map((item) => (
        <button
          className={[
            'rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-300/40',
            item.id === activeTab
              ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
          ].join(' ')}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
