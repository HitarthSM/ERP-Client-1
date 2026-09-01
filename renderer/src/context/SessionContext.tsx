import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { MeResponse } from '../services/auth.service';

// ── Derived session shape ──────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  roles: string[];
}

export interface SessionOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface SessionContextValue {
  /** Null while loading or logged out. */
  user: SessionUser | null;
  /** Null when the user has no organisation yet. */
  organization: SessionOrg | null;
  /** Raw /me response — use the derived fields above where possible. */
  raw: MeResponse | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isStoreManager: boolean;
  isStoreStaff: boolean;
  /** True for any role that can see admin-only pages. */
  isAdmin: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

function deriveUser(raw: MeResponse): SessionUser {
  return {
    id: raw.id,
    clerkUserId: raw.clerkUserId,
    email: raw.email,
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    fullName: [raw.firstName, raw.lastName].filter(Boolean).join(' ') || raw.email,
    avatarUrl: raw.avatarUrl,
    roles: raw.roles,
  };
}

function deriveOrg(raw: MeResponse): SessionOrg | null {
  if (!raw.organization) return null;
  return {
    id: raw.organization.id,
    name: raw.organization.name,
    slug: raw.organization.slug,
    logoUrl: raw.organization.logoUrl,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user: raw, loading, syncing, logout, refresh } = useAuth();

  const value = useMemo<SessionContextValue>(() => {
    const user = raw ? deriveUser(raw) : null;
    const organization = raw ? deriveOrg(raw) : null;
    const roles = raw?.roles ?? [];

    const isSuperAdmin = roles.includes('super_admin');
    const isOrgAdmin = isSuperAdmin || roles.includes('org_admin');
    const isStoreManager = isOrgAdmin || roles.includes('store_manager');
    const isStoreStaff = isStoreManager || roles.includes('store_staff');
    const isAdmin = isOrgAdmin;

    return {
      user,
      organization,
      raw,
      isLoading: loading || syncing,
      isSuperAdmin,
      isOrgAdmin,
      isStoreManager,
      isStoreStaff,
      isAdmin,
      logout,
      refresh,
    };
  }, [raw, loading, syncing, logout, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
