import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { activateSession, clerkErrorMessage, prepareEmailSecondFactor, verifySecondFactor } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function VerifySecondFactor() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const preparedCode = useRef(false);

  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signIn = clerk.client?.signIn;
      if (!signIn || (signIn.status !== 'needs_second_factor' && signIn.status !== 'needs_client_trust')) {
        toast.error('Verification session expired — sign in again');
        navigate('/login', { replace: true });
        return;
      }
      const KEY = 'erp.verify-second-factor.prepared';
      const hasStorage = typeof window !== 'undefined' && window.sessionStorage;
      const skipPrepareOnce = hasStorage ? window.sessionStorage.getItem(KEY) === '1' : false;
      if (hasStorage) window.sessionStorage.removeItem(KEY);

      // If we just arrived right after resolveSignInStatus, the code has
      // already been prepared. Only prepare again when the user refreshes
      // or deep-links into this page.
      if (!skipPrepareOnce && !preparedCode.current) {
        await prepareEmailSecondFactor(signIn).catch(() => undefined);
      }
      preparedCode.current = true;
      setReady(true);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const signIn = clerk.client?.signIn;
    if (!signIn) return;
    setLoading(true);
    try {
      const result = await verifySecondFactor(signIn, code);
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
    const signIn = clerk.client?.signIn;
    if (!signIn) return;
    try {
      await prepareEmailSecondFactor(signIn);
      preparedCode.current = true;
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
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
          <h1 className="text-2xl font-bold text-primary mb-2">Two-step verification</h1>
          <p className="text-muted-foreground text-sm">We sent a verification code to your email</p>
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
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => navigate('/login')}>
              Back to sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
