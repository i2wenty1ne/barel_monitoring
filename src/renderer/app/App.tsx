import { AppLayout } from '../widgets/app-layout/ui/AppLayout';
import { MonitoringPage } from '../pages/monitoring/ui/MonitoringPage';

export function App(): React.JSX.Element {
  return (
    <AppLayout>
      <MonitoringPage />
    </AppLayout>
  );
}
