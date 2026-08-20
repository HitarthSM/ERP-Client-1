import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function getPermission(): PermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

function StatusBadge({ status }: { status: PermissionState }) {
  if (status === 'granted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-500">
        <CheckCircle2 size={16} /> Allowed
      </span>
    );
  }
  if (status === 'denied') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <XCircle size={16} /> Blocked
      </span>
    );
  }
  if (status === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <AlertCircle size={16} /> Not supported
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-500">
      <AlertCircle size={16} /> Not yet allowed
    </span>
  );
}

export default function NotificationSettingsPage() {
  const [permission, setPermission] = useState<PermissionState>(getPermission);
  const [requesting, setRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermission(getPermission());
  }, []);

  const requestPermission = async (): Promise<void> => {
    if (!('Notification' in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
    } finally {
      setRequesting(false);
    }
  };

  const sendTestNotification = (): void => {
    if (permission !== 'granted') return;
    new Notification('ERP — Test notification', {
      body: 'Desktop notifications are working correctly.',
      icon: '/icon.png',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control how the ERP system delivers real-time alerts to your desktop.
        </p>
      </div>

      <FormSection title="Desktop notification permission">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current status</p>
            <div className="mt-1">
              <StatusBadge status={permission} />
            </div>
          </div>
          {permission === 'granted' ? (
            <Bell size={32} className="text-green-500 opacity-80" />
          ) : permission === 'denied' ? (
            <BellOff size={32} className="text-destructive opacity-80" />
          ) : (
            <BellRing size={32} className="text-yellow-500 opacity-80" />
          )}
        </div>

        <div className="mt-4 space-y-3">
          {permission === 'default' && (
            <>
              <p className="text-sm text-muted-foreground">
                Grant permission so the ERP system can show OS-level pop-ups when orders, stock
                alerts, or system events arrive — even when the window is in the background.
              </p>
              <Button
                type="button"
                onClick={() => void requestPermission()}
                disabled={requesting}
              >
                {requesting ? 'Requesting…' : 'Allow desktop notifications'}
              </Button>
            </>
          )}

          {permission === 'granted' && (
            <>
              <p className="text-sm text-muted-foreground">
                Desktop notifications are active. You will receive OS-level pop-ups for incoming
                ERP events in real time.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={sendTestNotification}
                disabled={testSent}
              >
                {testSent ? 'Sent — check your desktop' : 'Send test notification'}
              </Button>
            </>
          )}

          {permission === 'denied' && (
            <>
              <p className="text-sm text-muted-foreground">
                Permission was blocked. To re-enable, click the lock icon in your browser address
                bar → <strong>Notifications</strong> → <strong>Allow</strong>, then refresh the
                page.
              </p>
              <p className="text-xs text-muted-foreground">
                On Windows you can also go to{' '}
                <strong>System Settings → System → Notifications</strong> and ensure the browser /
                Electron app is allowed.
              </p>
            </>
          )}

          {permission === 'unsupported' && (
            <p className="text-sm text-muted-foreground">
              The Notifications API is not available in this environment.
            </p>
          )}
        </div>
      </FormSection>

      <FormSection title="What triggers a notification">
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>New orders placed or status changes</li>
          <li>Low stock or stock movement alerts</li>
          <li>System-generated events sent to your account</li>
          <li>Organisation-wide broadcasts</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          Notifications are delivered in real time via Centrifugo WebSocket. You also see them in
          the bell icon and the Notifications page.
        </p>
      </FormSection>
    </div>
  );
}
