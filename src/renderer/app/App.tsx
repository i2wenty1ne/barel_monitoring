import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AboutPage } from '../pages/about/ui/AboutPage';
import { BarrelDetailsPage } from '../pages/barrel-details/ui/BarrelDetailsPage';
import { DiagnosticsPage } from '../pages/diagnostics/ui/DiagnosticsPage';
import { EventLogPage } from '../pages/event-log/ui/EventLogPage';
import { MonitoringPage } from '../pages/monitoring/ui/MonitoringPage';
import { PlaceholderPage } from '../pages/placeholder/ui/PlaceholderPage';
import { SettingsPage } from '../pages/settings/ui/SettingsPage';
import { AppLayout } from '../widgets/app-layout/ui/AppLayout';

export function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate replace to="/monitoring" />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/barrels/:barrelId" element={<BarrelDetailsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/events" element={<EventLogPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="Страница не найдена"
                message="Проверьте адрес или вернитесь в раздел мониторинга"
              />
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
