import { useState } from 'react';
import { Mail, Link } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ClerkUsers, useListRoles, Locations, Organizations } from '../../../api';
import { useSession } from '../../../context/SessionContext';
import type { InviteUserPayload } from '../../../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ORG_WIDE = '__org_wide__';
const EMPTY: InviteUserPayload = { email: '', roleId: '', organizationId: undefined, locationId: undefined, redirectUrl: '' };

export function InviteUserDrawer({ open, onClose }: Props) {
  const [form, setForm] = useState<InviteUserPayload>(EMPTY);
  const { isSuperAdmin } = useSession();
  const inviteMutation = ClerkUsers.useInvite();
  const { data: roles = [] } = useListRoles();
  const { data: orgs = [] } = Organizations.useList(isSuperAdmin);
  const { data: orgLocations = [] } = Locations.useList(!isSuperAdmin);
  const scopedLocations = Locations.useSearch({
    limit: 100,
    filters: form.organizationId ? { organizationId: form.organizationId } : {},
    enabled: isSuperAdmin && !!form.organizationId,
  });
  const locations = isSuperAdmin ? (scopedLocations.data?.items ?? []) : orgLocations;
  const invitableRoles = roles.filter((r) => r.name !== 'super_admin');

  const close = () => {
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(
      {
        email:          form.email.trim(),
        roleId:         form.roleId,
        organizationId: isSuperAdmin ? form.organizationId : undefined,
        locationId:     form.locationId || undefined,
        redirectUrl:    form.redirectUrl?.trim() || undefined,
      },
      { onSuccess: close },
    );
  };

  const canSubmit =
    !inviteMutation.isPending &&
    !!form.email.trim() &&
    !!form.roleId &&
    (!isSuperAdmin || !!form.organizationId);

  return (
    <FormDrawer
      open={open}
      onClose={close}
      title="Invite User"
      subtitle="Send a Clerk email invitation. Accepting it joins your organization with the role and store picked here."
      footer={
        <>
          <Button type="submit" form="invite-user-form" disabled={!canSubmit}>
            {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email address" required>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="user@company.com"
              className="pl-8"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
        </Field>

        {isSuperAdmin && (
          <Field label="Organization" required hint="SuperAdmin accounts are org-less — pick the company this hire joins.">
            <Select
              value={form.organizationId || undefined}
              onValueChange={(v) => setForm({ ...form, organizationId: v, locationId: undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Role" required hint="Determines what they can access once they accept.">
          <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {invitableRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Store (optional)" hint="Scope the role to one store/warehouse. Leave blank for org-wide access.">
          <Select
            value={form.locationId ?? ORG_WIDE}
            onValueChange={(v) => setForm({ ...form, locationId: v === ORG_WIDE ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Org-wide (no store)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ORG_WIDE}>Org-wide (no store)</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Redirect URL (optional)"
          hint="Where to send the user after they accept the invitation."
        >
          <div className="relative">
            <Link size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://app.example.com/welcome"
              className="pl-8"
              value={form.redirectUrl ?? ''}
              onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
            />
          </div>
        </Field>
      </form>
    </FormDrawer>
  );
}
