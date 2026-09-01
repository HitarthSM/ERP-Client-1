import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthBootScreen from './auth/AuthBootScreen';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, syncing, bootPhase } = useAuth();

  // Wait until Clerk session → backend /me validation finishes. Cached user from
  // localStorage must not render the app before the token is confirmed — otherwise
  // parallel API calls can 401 and force an immediate logout back to /login.
  // Background re-sync only runs on session id change (sign-in/out), not periodic
  // token refresh, so blocking on syncing here won't blank the app every ~60s.
  if (syncing) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const isSuperAdmin = user.roles?.includes('super_admin');
  if (!user.organization && !isSuperAdmin) {
    return <Navigate to="/onboarding/create-org" replace />;
  }

  return children;
}
