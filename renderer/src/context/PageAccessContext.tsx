import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';
import { PageAccess } from '../api';
import { useAuth } from './AuthContext';
import { canAccessPage } from '../lib/page-access';

interface PageAccessContextType {
  canAccess: (pageKey: string) => boolean;
  isLoading: boolean;
  hasConfigs: boolean;
}

const PageAccessContext = createContext<PageAccessContextType | null>(null);

export function PageAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data: configs = [], isLoading, isError } = PageAccess.useList({
    enabled: !!user,
  });

  // useQuery has no per-call onError in React Query v5 — surface it here instead,
  // since a silent failure means every page looks inaccessible with no explanation.
  useEffect(() => {
    if (isError) toast.error('Failed to load page permissions — some pages may be hidden');
  }, [isError]);

  const accessMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of configs) {
      map.set(c.pageKey, new Set(c.allowedRoles));
    }
    return map;
  }, [configs]);

  const canAccess = useMemo(
    () =>
      (pageKey: string): boolean => canAccessPage(user?.roles, pageKey, accessMap),
    [accessMap, user],
  );

  return (
    <PageAccessContext.Provider value={{ canAccess, isLoading, hasConfigs: configs.length > 0 }}>
      {children}
    </PageAccessContext.Provider>
  );
}

export function usePageAccess(): PageAccessContextType {
  const ctx = useContext(PageAccessContext);
  if (!ctx) throw new Error('usePageAccess must be used within PageAccessProvider');
  return ctx;
}
