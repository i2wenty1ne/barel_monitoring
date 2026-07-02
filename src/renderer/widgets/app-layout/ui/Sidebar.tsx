import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { labelKey: 'layout.nav.monitoring', path: '/monitoring' },
  { labelKey: 'layout.nav.assets', path: '/assets' },
  { labelKey: 'layout.nav.dataSources', path: '/data-sources' },
  { labelKey: 'layout.nav.points', path: '/points' },
  { labelKey: 'layout.nav.actuators', path: '/actuators' },
  { labelKey: 'layout.nav.processes', path: '/processes' },
  { labelKey: 'layout.nav.processJobs', path: '/process-jobs' },
  { labelKey: 'layout.nav.graphs', path: '/graphs' },
  { labelKey: 'layout.nav.history', path: '/history' },
  { labelKey: 'layout.nav.diagnostics', path: '/diagnostics' },
  { labelKey: 'layout.nav.events', path: '/events' },
  { labelKey: 'layout.nav.settings', path: '/settings' },
  { labelKey: 'layout.nav.about', path: '/about' }
] as const;

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <aside className="border-b border-white/10 bg-slate-950/85 px-4 py-5 lg:border-b-0 lg:border-r">
      <div className="mb-4 lg:mb-8">
        <div className="text-lg font-semibold tracking-normal text-white">{t('layout.title')}</div>
        <div className="mt-1 text-xs text-slate-400">{t('layout.subtitle')}</div>
      </div>

      <nav className="flex flex-wrap gap-1 lg:block lg:space-y-1" aria-label={t('layout.navLabel')}>
        {navItems.map((item) => (
          <NavLink
            key={item.labelKey}
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
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
