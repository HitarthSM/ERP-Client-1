import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ClerkUsers } from '../../../api';
import type { ClerkUser } from '../../../types';
import { ROLE_NAMES } from '../../../types';

interface Props {
  user: ClerkUser | null;
  onClose: () => void;
}

export const PRESET_ROLES: readonly string[] = ROLE_NAMES;

export function UpdateRolesDrawer({ user, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom]     = useState('');
  const updateMutation = ClerkUsers.useUpdateRoles();

  useEffect(() => {
    setSelected(user?.roles ?? []);
    setCustom('');
  }, [user]);

  const toggle = (role: string) =>
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  const addCustom = () => {
    const r = custom.trim().toLowerCase();
    if (!r || selected.includes(r)) { setCustom(''); return; }
    setSelected((prev) => [...prev, r]);
    setCustom('');
  };

  const handleSave = () => {
    if (!user) return;
    updateMutation.mutate(
      { clerkUserId: user.clerkUserId, body: { roles: selected } },
      { onSuccess: onClose },
    );
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  return (
    <FormDrawer
      open={!!user}
      onClose={onClose}
      title="Clerk labels"
      subtitle={`${displayName} — these tags live on the Clerk user and do not grant ERP page or API access. Use User Roles for that.`}
      footer={
        <>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save Roles'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Preset roles">
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_ROLES.map((r) => {
              const active = selected.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Add custom role">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. auditor"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustom}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </Field>

        <Field label="Current selection">
          {selected.length === 0 ? (
            <p className="text-xs text-muted-foreground">No roles assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selected.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => setSelected((p) => p.filter((x) => x !== r))}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                    aria-label={`Remove ${r}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>
    </FormDrawer>
  );
}
