import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthBootScreen from './auth/AuthBootScreen';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, syncing, bootPhase } = useAuth();

  // Clerk session can exist before /me finishes on first load — wait instead of bouncing to /login.
  // Once a user is already loaded, a background re-sync (e.g. Clerk's periodic
  // token refresh) must not blank out the already-authenticated app.
  if (syncing && !user) {
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
