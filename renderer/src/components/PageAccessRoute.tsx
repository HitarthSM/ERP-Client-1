import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePageAccess } from '../context/PageAccessContext';
import { pageKeyForPath } from '../config/modules';

interface PageAccessRouteProps {
  pageKey: string;
  children: React.ReactNode;
}

export default function PageAccessRoute({ pageKey, children }: PageAccessRouteProps) {
  const { canAccess, isLoading } = usePageAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!canAccess(pageKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function PageAccessGate() {
  const location = useLocation();
  const { canAccess, isLoading, hasConfigs } = usePageAccess();
  const pageKey = pageKeyForPath(location.pathname);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (hasConfigs && pageKey && !canAccess(pageKey)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
