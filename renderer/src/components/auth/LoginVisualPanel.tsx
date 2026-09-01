import { getAppName } from '../../lib/branding';

export default function LoginVisualPanel() {
  const appName = getAppName();
  return (
    <aside className="login-visual hidden lg:flex" aria-label={`${appName} branding`}>
      <div className="login-aurora" aria-hidden="true">
        <span className="login-blob login-blob-a" />
        <span className="login-blob login-blob-b" />
      </div>
      <div className="login-copy">
        <p className="login-brand">{appName}</p>
        <p className="login-tagline">Operations, unified.</p>
      </div>
    </aside>
  );
}
