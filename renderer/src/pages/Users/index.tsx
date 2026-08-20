import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldBan, ShieldCheck, UserPlus, Tags, Building2, MailOpen, XCircle, RefreshCw } from 'lucide-react';
import { DataTable, type Column } from '../../components/DataTable';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { UserStatusBadge } from '../../components/UserStatusBadge';
import { UserRolePills } from './components/UserRolePills';
import { InviteUserDrawer } from './components/InviteUserDrawer';
import { UpdateRolesDrawer } from './components/UpdateRolesDrawer';
import { AssignOrgDrawer } from '../Organizations/components/AssignOrgDrawer';
import { Button } from '../../components/ui/button';
import { ClerkUsers } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import { EInvitationStatus, type ClerkInvitation, type ClerkUser } from '../../types';
import type { ExtraAction } from '../../components/RowActionsMenu';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

const INVITATION_STATUS_OPTIONS = [
  { value: EInvitationStatus.Pending,  label: 'Pending'  },
  { value: EInvitationStatus.Accepted, label: 'Accepted' },
  { value: EInvitationStatus.Revoked,  label: 'Revoked'  },
];

const INVITATION_STATUS_BADGE: Record<EInvitationStatus, string> = {
  [EInvitationStatus.Pending]:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
  [EInvitationStatus.Accepted]: 'bg-green-500/10 text-green-600 border-green-500/20',
  [EInvitationStatus.Revoked]:  'bg-red-500/10 text-red-500 border-red-500/20',
};

function buildColumns(): Column<ClerkUser>[] {
  return [
    {
      key: 'avatar',
      label: '',
      width: '44px',
      render: (row) => (
        <img
          src={row.imageUrl}
          alt={row.firstName ?? row.email}
          className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                [row.firstName, row.lastName].filter(Boolean).join('+') || row.email,
              )}&background=random&size=64`;
          }}
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => {
        const name = [row.firstName, row.lastName].filter(Boolean).join(' ');
        return name ? (
          <span className="font-medium">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <UserStatusBadge active={!row.banned} banned={row.banned} />,
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (row) => <UserRolePills roles={row.roles} />,
    },
    {
      key: 'lastSignInAt',
      label: 'Last Sign In',
      render: (row) =>
        row.lastSignInAt ? (
          new Date(row.lastSignInAt).toLocaleDateString()
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
  ];
}

export default function UsersPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = user?.organization?.id;

  const { page, setPage, debouncedSearch, setSearch } = usePagination();

  const [statusFilter, setStatusFilter]           = useState<string | null>(null);
  const [inviteOpen, setInviteOpen]               = useState(false);
  const [showInvitations, setShowInvitations]     = useState(false);
  const [invStatusFilter, setInvStatusFilter]     = useState<EInvitationStatus | null>(null);
  const [revokeTarget, setRevokeTarget]           = useState<ClerkInvitation | null>(null);
  const [rolesTarget, setRolesTarget]             = useState<ClerkUser | null>(null);
  const [assignTarget, setAssignTarget]           = useState<ClerkUser | null>(null);
  const [banTarget, setBanTarget]                 = useState<ClerkUser | null>(null);
  const [unbanTarget, setUnbanTarget]             = useState<ClerkUser | null>(null);
  const [deleteTarget, setDeleteTarget]           = useState<ClerkUser | null>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  const listQuery   = ClerkUsers.useList({ page, organizationId: orgId, enabled: !isSearching });
  const searchQuery = ClerkUsers.useSearch({ query: debouncedSearch, page, enabled: isSearching });

  const activeQuery  = isSearching ? searchQuery : listQuery;
  const rawRows      = activeQuery.data?.data ?? [];
  const rawTotal     = activeQuery.data?.totalCount ?? 0;

  const filteredRows = useMemo(() => {
    if (!statusFilter) return rawRows;
    if (statusFilter === 'banned') return rawRows.filter((r) => r.banned);
    if (statusFilter === 'active') return rawRows.filter((r) => !r.banned);
    return rawRows;
  }, [rawRows, statusFilter]);

  const { data: invitations = [], isLoading: invLoading, refetch: refetchInv } =
    ClerkUsers.useListInvitations(invStatusFilter ?? undefined);

  const filteredInvitations = useMemo(() => {
    if (!invStatusFilter) return invitations;
    return invitations.filter((inv) => inv.status === invStatusFilter);
  }, [invitations, invStatusFilter]);

  const banMutation    = ClerkUsers.useBan();
  const unbanMutation  = ClerkUsers.useUnban();
  const deleteMutation = ClerkUsers.useDelete();
  const revokeMutation = ClerkUsers.useRevokeInvitation();

  const extraRowActions = useCallback(
    (row: ClerkUser): ExtraAction[] => [
      { label: 'Clerk labels (not app access)', icon: <Tags size={14} />, onSelect: () => setRolesTarget(row) },
      { label: 'Assign to Org', icon: <Building2 size={14} />, onSelect: () => setAssignTarget(row) },
      row.banned
        ? { label: 'Unban User', icon: <ShieldCheck size={14} />, onSelect: () => setUnbanTarget(row) }
        : {
            label: 'Ban User',
            icon: <ShieldBan size={14} />,
            onSelect: () => setBanTarget(row),
            destructive: true,
          },
    ],
    [],
  );

  const toolbar = (
    <>
      <FilterDropdown
        label="Status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={setStatusFilter}
        align="start"
      />
      <Button
        size="sm"
        variant={showInvitations ? 'default' : 'outline'}
        onClick={() => setShowInvitations((prev) => !prev)}
        className="gap-1.5"
      >
        <MailOpen size={14} />
        Pending Invites
        {invitations.filter((i) => i.status === EInvitationStatus.Pending).length > 0 && (
          <span className="ml-1 rounded-full bg-amber-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 leading-none">
            {invitations.filter((i) => i.status === EInvitationStatus.Pending).length}
          </span>
        )}
      </Button>
      <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
        <UserPlus size={14} /> Invite User
      </Button>
    </>
  );

  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="flex h-full flex-col gap-4">
      <DataTable<ClerkUser>
        title="Users"
        description={orgId ? `Clerk users in your organisation — ${rawTotal} total` : 'All Clerk users'}
        columns={columns}
        rows={filteredRows}
        total={statusFilter ? filteredRows.length : rawTotal}
        page={page}
        loading={activeQuery.isLoading}
        error={activeQuery.error ? String(activeQuery.error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void activeQuery.refetch()}
        searchPlaceholder="Search by name or email…"
        toolbar={toolbar}
        isAdmin={true}
        onView={(row) => navigate(`/users/clerk/${row.clerkUserId}`)}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={extraRowActions}
        footerNote={
          statusFilter
            ? `Showing filtered results — clear the Status filter to see all ${rawTotal} users`
            : undefined
        }
      />

      {showInvitations && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="font-semibold text-sm">Invitations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Users invited via Clerk — click Revoke to cancel a pending invite
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FilterDropdown
                label="Status"
                options={INVITATION_STATUS_OPTIONS}
                value={invStatusFilter}
                onChange={(v) => setInvStatusFilter(v as EInvitationStatus | null)}
                align="end"
              />
              <button
                onClick={() => void refetchInv()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {invLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading invitations…</div>
          ) : filteredInvitations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No invitations found{invStatusFilter ? ` with status "${invStatusFilter}"` : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Roles</th>
                    <th className="px-4 py-2 text-left">Sent On</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{inv.emailAddress}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${INVITATION_STATUS_BADGE[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {inv.roles && inv.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {inv.roles.map((r) => (
                              <span key={r} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary capitalize">
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {inv.status === EInvitationStatus.Pending && (
                          <button
                            onClick={() => setRevokeTarget(inv)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <XCircle size={13} /> Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <InviteUserDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <UpdateRolesDrawer user={rolesTarget} onClose={() => setRolesTarget(null)} />
      <AssignOrgDrawer user={assignTarget} onClose={() => setAssignTarget(null)} />

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke Invitation"
        description={`Revoke the pending invitation for "${revokeTarget?.emailAddress ?? ''}"? They will no longer be able to use this invite link.`}
        confirmLabel="Revoke"
        pendingLabel="Revoking…"
        confirmVariant="destructive"
        isPending={revokeMutation.isPending}
        onConfirm={() =>
          revokeTarget &&
          revokeMutation.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(open) => !open && setBanTarget(null)}
        title="Ban User"
        description={`Ban "${banTarget ? [banTarget.firstName, banTarget.lastName].filter(Boolean).join(' ') || banTarget.email : ''}"? They will immediately lose access to all sessions.`}
        confirmLabel="Ban User"
        pendingLabel="Banning…"
        confirmVariant="destructive"
        isPending={banMutation.isPending}
        onConfirm={() =>
          banTarget &&
          banMutation.mutate(banTarget.clerkUserId, { onSuccess: () => setBanTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!unbanTarget}
        onOpenChange={(open) => !open && setUnbanTarget(null)}
        title="Unban User"
        description={`Restore access for "${unbanTarget ? [unbanTarget.firstName, unbanTarget.lastName].filter(Boolean).join(' ') || unbanTarget.email : ''}"?`}
        confirmLabel="Unban User"
        pendingLabel="Unbanning…"
        confirmVariant="default"
        isPending={unbanMutation.isPending}
        onConfirm={() =>
          unbanTarget &&
          unbanMutation.mutate(unbanTarget.clerkUserId, { onSuccess: () => setUnbanTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User"
        description={`Permanently delete "${deleteTarget ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') || deleteTarget.email : ''}" from Clerk? This cannot be undone and removes all their sessions, data, and org memberships.`}
        confirmLabel="Delete Forever"
        pendingLabel="Deleting…"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.clerkUserId, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
