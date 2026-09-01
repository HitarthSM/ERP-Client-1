import { clerk } from './clerk';

export type SignInResource = NonNullable<typeof clerk.client>['signIn'];
export type SignUpResource = NonNullable<typeof clerk.client>['signUp'];
export type NavigateFn = (path: string, opts?: { replace?: boolean }) => void;

export function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export async function activateSession(
  sessionId: string | null | undefined,
  refresh: () => Promise<void>,
): Promise<void> {
  if (!sessionId) {
    throw new Error('Sign-in completed but no session was created');
  }
  await clerk.setActive({ session: sessionId });
  await refresh();
}

export async function prepareEmailSecondFactor(signIn: SignInResource): Promise<void> {
  const factors = signIn.supportedSecondFactors ?? [];
  const emailFactor = factors.find((f) => f.strategy === 'email_code') as
    | { strategy: 'email_code'; emailAddressId: string }
    | undefined;
  if (!emailFactor?.emailAddressId) {
    throw new Error('No email verification method available for this sign-in');
  }
  await signIn.prepareSecondFactor({
    strategy: 'email_code',
    emailAddressId: emailFactor.emailAddressId,
  });
}

export async function verifySecondFactor(
  signIn: SignInResource,
  code: string,
): Promise<{ status: string | null; createdSessionId: string | null }> {
  return signIn.attemptSecondFactor({ strategy: 'email_code', code: code.trim() });
}

/**
 * This is the fix: both the password sign-in path and the Google OAuth callback
 * call this same function, so `needs_second_factor` is handled identically either way.
 */
export async function resolveSignInStatus(
  signIn: SignInResource,
  { navigate, refresh }: { navigate: NavigateFn; refresh: () => Promise<void> },
): Promise<void> {
  if (signIn.status === 'complete') {
    await activateSession(signIn.createdSessionId, refresh);
    navigate('/', { replace: true });
    return;
  }
  if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
    await prepareEmailSecondFactor(signIn);
    // Avoid re-preparing the email second factor when the verify page mounts
    // immediately after this navigation (which would spam users with a new code).
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('erp.verify-second-factor.prepared', '1');
    }
    navigate('/verify-second-factor', { replace: true });
    return;
  }
  throw new Error(`Sign in requires an additional step (${signIn.status}) that isn't supported`);
}

export async function signUpWithPassword(
  signUp: SignUpResource,
  payload: { emailAddress: string; password: string; firstName: string; lastName: string; username: string },
): Promise<void> {
  await signUp.create(payload);
  await prepareEmailVerification(signUp);
}

export async function prepareEmailVerification(signUp: SignUpResource): Promise<void> {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
}

export async function verifyEmailCode(
  signUp: SignUpResource,
  code: string,
): Promise<{ status: string | null; createdSessionId: string | null }> {
  return signUp.attemptEmailAddressVerification({ code: code.trim() });
}

export async function startGoogleOAuth(signIn: SignInResource): Promise<void> {
  const origin = window.location.origin;
  await signIn.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: `${origin}/#/sso-callback`,
    redirectUrlComplete: `${origin}/#/`,
  });
}
