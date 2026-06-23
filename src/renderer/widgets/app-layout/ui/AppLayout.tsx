import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopStatusBar } from './TopStatusBar';

export function AppLayout(): React.JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-950/70 text-slate-100 lg:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <TopStatusBar />
        <main className="min-h-0 flex-1 overflow-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
