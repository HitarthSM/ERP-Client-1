import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function AppUpdatesPage() {
  const [version, setVersion] = useState('…');
  const [githubToken, setGithubToken] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getAppVersion) {
      setLoading(false);
      setCheckMsg('Restart the desktop app and try again.');
      return;
    }
    void (async () => {
      try {
        const [v, s] = await Promise.all([api.getAppVersion(), api.getUpdateSettings()]);
        setVersion(v);
        setGithubToken(s.githubToken ?? '');
        setIntervalMinutes(s.updateCheckIntervalMinutes ?? 1440);
      } catch (e) {
        setCheckMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setCheckMsg(null);
    try {
      const res = await window.electronAPI.saveUpdateSettings({
        githubToken,
        updateCheckIntervalMinutes: Math.max(1, intervalMinutes),
      });
      if (!res.success) {
        toast.error(res.error ?? "Couldn't save settings");
        return;
      }
      if (res.settings) {
        setGithubToken(res.settings.githubToken);
        setIntervalMinutes(res.settings.updateCheckIntervalMinutes);
      }
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      const res = await window.electronAPI.checkForUpdate();
      if (res.success) {
        setCheckMsg("If an update is available, you'll see a banner.");
        toast.success('Looking for updates…');
      } else {
        setCheckMsg(res.error ?? 'Check failed');
        toast.error(res.error ?? 'Check failed');
      }
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Software updates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Check for new versions of this app and choose how often to look for them.
        </p>
      </div>

      <FormSection title="Current version">
        <p className="text-sm">
          You're on version <span className="font-mono font-medium">{version}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Automatic checks run when the installed app is running.
        </p>
      </FormSection>

      <FormSection title="Update settings">
        <label className="block text-sm mb-1">Check for updates every (minutes)</label>
        <Input
          type="number"
          min={1}
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-40"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Example: 1440 = once a day. Changes apply after you save.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleCheck()}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Check now'}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={advancedOpen}
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`}
            />
            Advanced options
          </button>
          {advancedOpen && (
            <div className="space-y-1 pl-1">
              <label className="block text-sm mb-1">Access key (optional)</label>
              <Input
                type="password"
                autoComplete="off"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Leave blank unless your IT team provided a key"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usually not needed. Only add a key if your IT team asked you to. Then save.
              </p>
            </div>
          )}
        </div>

        {checkMsg && (
          <p className="text-xs text-muted-foreground mt-3">{checkMsg}</p>
        )}
      </FormSection>
    </div>
  );
}
