import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, resolveSignInStatus, startGoogleOAuth } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthBootScreen from '../../components/auth/AuthBootScreen';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { getAppName } from '../../lib/branding';
import { toast } from 'sonner';

export default function SignIn() {
  const { user, refresh, syncing, bootPhase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Backend /me still catching up after setActive — avoid flashing the login form.
  // Require an active Clerk session so a stale syncing flag after logout cannot flash this UI.
  if (syncing && clerk.session) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // After OAuth, Clerk may leave an incomplete sign-up on this client.
  if (clerk.client?.signUp?.status === 'missing_requirements') {
    return <Navigate to="/sso-continue" replace />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signIn = await clerk.client!.signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });
      await resolveSignInStatus(signIn, { navigate, refresh });
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await startGoogleOAuth(clerk.client!.signIn);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">{getAppName()}</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary underline underline-offset-2">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
