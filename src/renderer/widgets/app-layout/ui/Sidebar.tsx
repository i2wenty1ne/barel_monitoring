import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Мониторинг', path: '/monitoring' },
  { label: 'Объекты', path: '/assets' },
  { label: 'Источники данных', path: '/data-sources' },
  { label: 'Точки данных', path: '/points' },
  { label: 'Механизмы', path: '/actuators' },
  { label: 'Процессы', path: '/processes' },
  { label: 'Запуски', path: '/process-jobs' },
  { label: 'Графы', path: '/graphs' },
  { label: 'История', path: '/history' },
  { label: 'Диагностика', path: '/diagnostics' },
  { label: 'Журнал', path: '/events' },
  { label: 'Настройки', path: '/settings' },
  { label: 'О приложении', path: '/about' }
] as const;

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="border-b border-white/10 bg-slate-950/85 px-4 py-5 lg:border-b-0 lg:border-r">
      <div className="mb-4 lg:mb-8">
        <div className="text-lg font-semibold tracking-normal text-white">Industrial Flow Monitor</div>
        <div className="mt-1 text-xs text-slate-400">Asset / Point / Process platform</div>
      </div>

      <nav className="flex flex-wrap gap-1 lg:block lg:space-y-1" aria-label="Главная навигация">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            className={({ isActive }) =>
              [
                'block rounded-md px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-300/40 lg:w-full',
                isActive
                  ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              ].join(' ')
            }
            to={item.path}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
