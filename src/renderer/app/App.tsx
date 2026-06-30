import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AboutPage } from '../pages/about/ui/AboutPage';
import { ActuatorsPage } from '../pages/actuators/ui/ActuatorsPage';
import { AssetDetailsPage } from '../pages/asset-details/ui/AssetDetailsPage';
import { AssetsPage } from '../pages/assets/ui/AssetsPage';
import { BarrelDetailsPage } from '../pages/barrel-details/ui/BarrelDetailsPage';
import { DataSourcesPage } from '../pages/data-sources/ui/DataSourcesPage';
import { DiagnosticsPage } from '../pages/diagnostics/ui/DiagnosticsPage';
import { EventLogPage } from '../pages/event-log/ui/EventLogPage';
import { GraphsPage } from '../pages/graphs/ui/GraphsPage';
import { HistoryPage } from '../pages/history/ui/HistoryPage';
import { MonitoringPage } from '../pages/monitoring/ui/MonitoringPage';
import { PlaceholderPage } from '../pages/placeholder/ui/PlaceholderPage';
import { PointsPage } from '../pages/points/ui/PointsPage';
import { ProcessEditorPage } from '../pages/process-editor/ui/ProcessEditorPage';
import { ProcessJobsPage } from '../pages/process-jobs/ui/ProcessJobsPage';
import { ProcessesPage } from '../pages/processes/ui/ProcessesPage';
import { SettingsPage } from '../pages/settings/ui/SettingsPage';
import { AppLayout } from '../widgets/app-layout/ui/AppLayout';

export function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate replace to="/monitoring" />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:assetId" element={<AssetDetailsPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/actuators" element={<ActuatorsPage />} />
          <Route path="/processes" element={<ProcessesPage />} />
          <Route path="/processes/:processId/editor" element={<ProcessEditorPage />} />
          <Route path="/process-jobs" element={<ProcessJobsPage />} />
          <Route path="/graphs" element={<GraphsPage />} />
          <Route path="/history" element={<HistoryPage />} />
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
