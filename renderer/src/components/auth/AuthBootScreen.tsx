import { Check, Loader2 } from 'lucide-react';
import { getAppName } from '../../lib/branding';

export type AuthBootPhase = 'starting' | 'session' | 'sync' | 'profile';

const STEPS: { id: AuthBootPhase; label: string }[] = [
  { id: 'session', label: 'Signed in' },
  { id: 'sync', label: 'Setting up your account' },
  { id: 'profile', label: 'Opening your workspace' },
];

const ORDER: AuthBootPhase[] = ['starting', 'session', 'sync', 'profile'];

function stepState(phase: AuthBootPhase, stepId: AuthBootPhase): 'done' | 'active' | 'pending' {
  const phaseIdx = ORDER.indexOf(phase);
  const stepIdx = ORDER.indexOf(stepId);
  if (phase === 'starting') return 'pending';
  if (stepIdx < phaseIdx) return 'done';
  if (stepIdx === phaseIdx) return 'active';
  return 'pending';
}

type Props = {
  phase?: AuthBootPhase | null;
  /** Shown under the brand while Clerk itself is still loading. */
  title?: string;
};

export default function AuthBootScreen({ phase = 'starting', title }: Props) {
  const appName = getAppName();
  const active = phase ?? 'starting';
  const headline =
    title ??
    (active === 'starting'
      ? `Starting ${appName}`
      : active === 'session'
        ? 'Signed in'
        : active === 'sync'
          ? 'Setting up your account'
          : 'Opening your workspace');

  return (
    <div className="auth-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="auth-boot-aurora" aria-hidden="true">
        <span className="login-blob login-blob-a" />
        <span className="login-blob login-blob-b" />
      </div>

      <div className="auth-boot-copy">
        <p className="auth-boot-brand">{appName}</p>
        <p className="auth-boot-headline">{headline}</p>
        <p className="auth-boot-sub">This can take a moment if the server is waking up.</p>

        <ol className="auth-boot-steps">
          {STEPS.map((step) => {
            const state = stepState(active, step.id);
            return (
              <li key={step.id} className={`auth-boot-step auth-boot-step--${state}`}>
                <span className="auth-boot-step-icon" aria-hidden="true">
                  {state === 'done' ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : state === 'active' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span className="auth-boot-dot" />
                  )}
                </span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
