import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { activateSession, clerkErrorMessage, prepareEmailVerification, verifyEmailCode } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signUp = clerk.client?.signUp;
      if (!signUp?.id) {
        toast.error('Sign-up session expired — start again');
        navigate('/signup', { replace: true });
        return;
      }
      setEmail(signUp.emailAddress ?? '');
      setReady(true);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    setLoading(true);
    try {
      const result = await verifyEmailCode(signUp, code);
      if (result.status === 'complete') {
        await activateSession(result.createdSessionId, refresh);
        navigate('/', { replace: true });
        return;
      }
      toast.error(`Verification requires an additional step (${result.status}) that isn't supported yet`);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    try {
      await prepareEmailVerification(signUp);
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  const handleBack = () => {
    clerk.client?.resetSignUp();
    navigate('/signup', { replace: true });
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Preparing verification…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm">We sent a verification code to {email || 'your email'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="text-primary underline underline-offset-2" onClick={handleResend}>
              Resend code
            </button>
            {' · '}
            <button type="button" className="text-primary underline underline-offset-2" onClick={handleBack}>
              Back
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
