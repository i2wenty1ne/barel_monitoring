import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BarrelDetailsPage } from '../pages/barrel-details/ui/BarrelDetailsPage';
import { MonitoringPage } from '../pages/monitoring/ui/MonitoringPage';
import { PlaceholderPage } from '../pages/placeholder/ui/PlaceholderPage';
import { AppLayout } from '../widgets/app-layout/ui/AppLayout';

export function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate replace to="/monitoring" />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/barrels/:barrelId" element={<BarrelDetailsPage />} />
          <Route
            path="/settings"
            element={
              <PlaceholderPage
                title="Настройки"
                message="Настройки будут реализованы на этапе 3"
              />
            }
          />
          <Route
            path="/diagnostics"
            element={
              <PlaceholderPage title="Диагностика" message="Будет реализовано на этапе 4" />
            }
          />
          <Route
            path="/events"
            element={<PlaceholderPage title="Журнал" message="Будет реализовано на этапе 4" />}
          />
          <Route
            path="/about"
            element={
              <PlaceholderPage
                title="О приложении"
                message="Экран будет реализован на следующем этапе"
              />
            }
          />
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
