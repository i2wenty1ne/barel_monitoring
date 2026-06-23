const navItems = [
  { label: 'Мониторинг', active: true },
  { label: 'Настройки', active: false },
  { label: 'Диагностика', active: false },
  { label: 'Журнал', active: false },
  { label: 'О приложении', active: false }
] as const;

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="border-r border-white/10 bg-slate-950/85 px-4 py-5">
      <div className="mb-8">
        <div className="text-lg font-semibold tracking-normal text-white">Barrel Monitor</div>
        <div className="mt-1 text-xs text-slate-400">Foundation stage</div>
      </div>

      <nav className="space-y-1" aria-label="Главная навигация">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={[
              'w-full rounded-md px-3 py-2 text-left text-sm transition',
              item.active
                ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30'
                : 'cursor-not-allowed text-slate-500'
            ].join(' ')}
            disabled={!item.active}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
