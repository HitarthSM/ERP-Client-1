import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { clerk } from '../lib/clerk';
import { clearCachedMe, writeCachedMe } from '../lib/auth-cache';
import { getErrorMessage } from '../lib/api-error';
import { configureApi } from '../api';
import { HttpError } from '../lib/http';
import { AuthService, MeResponse } from '../services/auth.service';
import AuthBootScreen, { AuthBootPhase } from '../components/auth/AuthBootScreen';

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  /** True while syncing Clerk session → backend /me (prevents login bounce). */
  syncing: boolean;
  /** Fine-grained phase for the first-time boot UI. Null when idle. */
  bootPhase: AuthBootPhase | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://core-apis-m03n.onrender.com';

type ClerkResources = Parameters<Parameters<typeof clerk.addListener>[0]>[0];

configureApi(API_BASE, () => (clerk.session ? clerk.session.getToken() : Promise.resolve(null)));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clerk can report a session before getToken() returns a JWT (common on cold dev load). */
async function waitForClerkToken(maxAttempts = 8, delayMs = 75): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await clerk.session?.getToken();
    if (token) return;
    await sleep(delayMs);
  }
}

/**
 * Validate the Clerk session against the backend before rendering protected UI.
 */
async function loadMe(onPhase: (phase: AuthBootPhase) => void): Promise<MeResponse> {
  onPhase('sync');
  await AuthService.sync();
  onPhase('profile');
  return AuthService.getMe();
}

function isRetryableBootstrapError(error: unknown): boolean {
  return !(error instanceof HttpError && error.status === 401);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bootPhase, setBootPhase] = useState<AuthBootPhase | null>('starting');
  const refreshInFlight = useRef<Promise<void> | null>(null);
  /** Bumped on logout so in-flight /me results cannot update UI afterward. */
  const authEpoch = useRef(0);
  const signingOut = useRef(false);
  /** Clerk's addListener fires on every resource change (e.g. background token
   *  refresh every ~60s), not just sign-in/sign-out. Track the last session id
   *  so we only re-sync with the backend when the session actually changes. */
  const lastSessionId = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const refresh = async () => {
    if (signingOut.current) return;
    if (refreshInFlight.current) return refreshInFlight.current;

    const epoch = authEpoch.current;

    const run = (async () => {
      if (signingOut.current || epoch !== authEpoch.current) return;
      if (!clerk.session) {
        setUser(null);
        setBootPhase(null);
        return;
      }

      setBootPhase('session');
      syncingRef.current = true;
      setSyncing(true);
      try {
        await waitForClerkToken();
        let me: MeResponse | null = null;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            me = await loadMe((phase) => {
              if (signingOut.current || epoch !== authEpoch.current) return;
              setBootPhase(phase);
            });
            break;
          } catch (error) {
            lastError = error;
            if (!isRetryableBootstrapError(error) || attempt === 2) {
              throw error;
            }
            if (epoch !== authEpoch.current || signingOut.current) return;
            toast.error(
              attempt === 0
                ? 'Server is still waking up — retrying your sign-in…'
                : 'Still starting things up — trying once more…',
            );
            await sleep(400 * (attempt + 1));
          }
        }
        if (signingOut.current || epoch !== authEpoch.current || !clerk.session) return;
        if (!me) throw lastError instanceof Error ? lastError : new Error('Failed to load your account');
        setUser(me);
        writeCachedMe(me);
      } catch (error) {
        if (signingOut.current || epoch !== authEpoch.current) return;
        clearCachedMe();
        toast.error(getErrorMessage(error, 'Failed to load your account'));
        // Callback form skips Clerk's default hard navigate to "/".
        await clerk.signOut(() => undefined);
        setUser(null);
      } finally {
        if (epoch === authEpoch.current) {
          syncingRef.current = false;
          setSyncing(false);
          setBootPhase(null);
        }
      }
    })();

    const tracked = run.finally(() => {
      if (refreshInFlight.current === tracked) {
        refreshInFlight.current = null;
      }
    });
    refreshInFlight.current = tracked;
    return tracked;
  };

  useEffect(() => {
    let mounted = true;
    let hasLoadedOnce = false;
    let unsubscribe: (() => void) | undefined;

    clerk
      .load()
      .then(() => {
        if (!mounted) return;
        unsubscribe = clerk.addListener(async ({ session }: ClerkResources) => {
          if (!mounted) return;
          try {
            if (signingOut.current) {
              lastSessionId.current = null;
              setUser(null);
              return;
            }
            if (session) {
              if (session.id === lastSessionId.current) return;
              lastSessionId.current = session.id;
              await refresh();
            } else {
              lastSessionId.current = null;
              setUser(null);
              setBootPhase(null);
            }
          } finally {
            if (!hasLoadedOnce) {
              hasLoadedOnce = true;
              setLoading(false);
              if (!session) setBootPhase(null);
            }
          }
        });
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('Clerk failed to load', error);
        toast.error(getErrorMessage(error, 'Auth failed to start'));
        setLoading(false);
        setBootPhase(null);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  // Keep a stable ref so the event listener always calls the latest logout closure.
  const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const logout = async () => {
    // Invalidate any in-flight refresh before signOut so Login won't flash "Signing you in…".
    signingOut.current = true;
    authEpoch.current += 1;
    syncingRef.current = false;
    setSyncing(false);
    setBootPhase(null);
    setUser(null);
    clearCachedMe();

    try {
      // Clerk defaults to window.navigate("/") after sign-out (full page reload).
      // Pass a callback so we keep SPA routing — Topbar navigates to /login.
      await clerk.signOut(() => undefined);
    } finally {
      signingOut.current = false;
      setUser(null);
      syncingRef.current = false;
      setSyncing(false);
      setBootPhase(null);
    }
  };

  // Update ref every render so the event listener always has the latest closure.
  logoutRef.current = logout;

  // Listen for 401 events dispatched by http.ts and force-logout immediately.
  // 403 is a permission miss — stay signed in.
  // While syncing, refresh() owns error handling (avoids racing logout on boot).
  useEffect(() => {
    const handler = () => {
      if (!signingOut.current && !syncingRef.current) void logoutRef.current?.();
    };
    document.addEventListener('auth:unauthorized', handler);
    return () => document.removeEventListener('auth:unauthorized', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, bootPhase, logout, refresh }}>
      {!loading ? children : <AuthBootScreen phase="starting" />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
