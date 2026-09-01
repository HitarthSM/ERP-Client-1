import { useState, useMemo } from 'react';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { UserRoles, Locations, useListUserRoles, useListRoles, useListUserDirectory, useUpdateUserRole } from '../../api';
import { loadErrorMessage } from '../../lib/api-error';
import type { UserRole } from '../../types';

interface FormState {
  userId: string;
  roleId: string;
  locationId: string;
}

const ORG_WIDE = '__org_wide__';
const EMPTY: FormState = { userId: '', roleId: '', locationId: ORG_WIDE };

export default function UserRolesPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);

  const { data: assignments = [], isLoading, error, refetch } = useListUserRoles();
  const { data: roles = [] } = useListRoles();
  const { data: users = [] } = useListUserDirectory();
  const { data: locations = [] } = Locations.useList();
  const createMutation = UserRoles.useCreate();
  const updateMutation = useUpdateUserRole();

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r.name ?? r.id])), [roles]);
  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id])),
    [users],
  );
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  };

  const openEdit = (row: UserRole): void => {
    setEditing(row);
    setForm({
      userId: row.userId ?? '',
      roleId: row.roleId ?? '',
      locationId: row.locationId || ORG_WIDE,
    });
    setDrawerOpen(true);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.userId || !form.roleId) return;
    const locationId = form.locationId === ORG_WIDE ? undefined : form.locationId;
    const onSuccess = () => {
      void refetch();
      closeDrawer();
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: { roleId: form.roleId, locationId: locationId ?? null } as Partial<UserRole> },
        { onSuccess },
      );
      return;
    }
    createMutation.mutate(
      { userId: form.userId, roleId: form.roleId, locationId } as Partial<UserRole>,
      { onSuccess },
    );
  };

  return (
    <div className="space-y-4">
      <DataTable<UserRole>
        title="User Role Assignments"
        description="Manage which roles are assigned to each user in your organisation."
        columns={[
          {
            key: 'userId',
            label: 'User',
            render: (r) => <span className="font-medium">{r.userId ? (userById.get(r.userId) ?? r.userId) : '—'}</span>,
          },
          {
            key: 'roleId',
            label: 'Role',
            render: (r) => {
              const name = r.roleId ? (roleById.get(r.roleId) ?? r.roleId) : '—';
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {name}
                </span>
              );
            },
          },
          {
            key: 'locationId',
            label: 'Store',
            render: (r) => (
              <span className="text-sm">
                {r.locationId ? (locationById.get(r.locationId) ?? r.locationId) : 'Org-wide'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            label: 'Assigned',
            render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
          },
        ]}
        rows={assignments}
        total={assignments.length}
        page={page}
        loading={isLoading}
        error={error ? loadErrorMessage(error, 'assignments') : null}
        onPageChange={setPage}
        hideSearch
        onRefetch={() => void refetch()}
        onAdd={openCreate}
        addLabel="New Assignment"
        isAdmin
        onEdit={openEdit}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit User Role Assignment' : 'New User Role Assignment'}
        footer={
          <>
            <Button
              type="submit"
              form="user-role-form"
              disabled={saving || !form.userId || !form.roleId}
            >
              {saving ? 'Saving…' : editing ? 'Save' : 'Assign'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="user-role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="User" required>
            <Select
              value={form.userId || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
              disabled={!!editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role" required>
            <Select value={form.roleId || undefined} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent>
                {roles.filter((r) => r.name !== 'super_admin').map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Scope to store" hint="Org-wide means every store in the organisation.">
            <Select
              value={form.locationId || ORG_WIDE}
              onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Org-wide (all stores)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORG_WIDE}>Org-wide (all stores)</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
