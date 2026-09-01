import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, signUpWithPassword, startGoogleOAuth } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthBootScreen from '../../components/auth/AuthBootScreen';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { getAppName } from '../../lib/branding';
import { toast } from 'sonner';

export default function SignUp() {
  const { user, syncing, bootPhase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (syncing && clerk.session) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await signUpWithPassword(clerk.client!.signUp, {
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });
      toast.success('Enter the verification code we emailed you');
      navigate('/verify-email');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign up failed'));
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
            <p className="text-muted-foreground">Create your account</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpEmail">Email</Label>
              <Input
                id="signUpEmail"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpPassword">Password</Label>
              <Input
                id="signUpPassword"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div id="clerk-captcha" />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Creating account...' : 'Sign Up'}
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
              Already have an account?{' '}
              <Link to="/login" className="text-primary underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
