import { Sidebar } from './Sidebar';
import { TopStatusBar } from './TopStatusBar';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-slate-950/70 text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <TopStatusBar />
        <main className="min-h-0 flex-1 overflow-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
