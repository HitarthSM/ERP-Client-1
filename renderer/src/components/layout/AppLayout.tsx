import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { UpdateBanner } from '../UpdateBanner';
import { PageAccessGate } from '../PageAccessRoute';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isPos = /^\/pos(\/.*)?$/.test(location.pathname);
  const fillHeight = isPos || location.pathname === '/sales/creditors';

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <UpdateBanner />
        <Topbar />
        <main
          className={
            fillHeight
              ? 'flex-1 min-h-0 overflow-hidden'
              : 'flex-1 min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]'
          }
        >
          <div className={fillHeight ? 'h-full min-h-0 w-full' : 'w-full px-3 py-3'}>
            <PageAccessGate />
          </div>
        </main>
      </div>
    </div>
  );
}
