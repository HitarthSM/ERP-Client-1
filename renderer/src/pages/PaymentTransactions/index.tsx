import { useMemo, useState } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PaymentTransactions, Organizations } from '../../api';
import { useSession } from '../../context/SessionContext';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import { loadErrorMessage } from '../../lib/api-error';
import type { PaymentTransaction } from '../../types';

const STATUS_FILTERS = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const;

interface FormState {
  referenceId: string;
  referenceType: string;
  type: string;
  method: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  referenceId: '',
  referenceType: 'bill',
  type: 'payment',
  method: '',
  amount: '',
  status: 'PENDING',
};

export default function PaymentTransactionsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTransaction | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PaymentTransaction | null>(null);
  const [viewRow, setViewRow] = useState<PaymentTransaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');

  const updateMutation = PaymentTransactions.useUpdate();
  const removeMutation = PaymentTransactions.useDelete();
  const { page, setPage } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter !== 'ALL') next.status = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter]);

  const { data, isLoading, isError, error, refetch } = PaymentTransactions.useSearch({
    page,
    filters,
  });
  const listError = isError ? loadErrorMessage(error, 'payments') : null;

  const { organization, isSuperAdmin } = useSession();
  const { data: orgs } = Organizations.useList(isSuperAdmin);
  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    if (organization) {
      m.set(organization.id, formatEntityLabel({ name: organization.name, id: organization.id }));
    }
    for (const o of orgs ?? []) m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    return m;
  }, [orgs, organization]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: PaymentTransaction) => {
    setEditing(row);
    setForm({
      referenceId: row.referenceId ?? '',
      referenceType: row.referenceType ?? '',
      type: row.type ?? '',
      method: row.method ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      status: row.status ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate(
      {
        id: editing.id,
        body: {
          status: form.status || undefined,
        },
      },
      { onSuccess: closeDrawer },
    );
  };

  const columns: Column<PaymentTransaction>[] = [
    { key: 'referenceType', label: 'Linked To' },
    { key: 'type', label: 'Type' },
    { key: 'method', label: 'Method' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (row.amount != null ? `$${Number(row.amount).toFixed(2)}` : '—'),
    },
    { key: 'status', label: 'Status' },
  ];

  const viewData = viewRow
    ? ({
        ...viewRow,
        organizationId: (viewRow.organizationId || viewRow.orgId) ? (orgName.get(viewRow.organizationId ?? viewRow.orgId ?? '') ?? viewRow.organizationId ?? viewRow.orgId) : undefined,
      } as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Create blocked — verified: <code className="text-[10px]">CreatePaymentTransactionRequest</code> has no{' '}
        <code className="text-[10px]">@AutoMap</code>; domain orgId ≠ entity organizationId (#0d). List/search
        still work for existing rows.
      </div>
      <p className="text-xs text-muted-foreground">
        API gap: no free-text search; org filter omitted (Core <code className="text-[10px]">orgId</code> ≠
        entity <code className="text-[10px]">organizationId</code>). Status filter only.
      </p>
      <DataTable
        title="Payments"
        description="Browse payments. Create needs a Core API fix."
        columns={columns}
        rows={listError ? [] : (data?.items ?? [])}
        total={listError ? 0 : (data?.total ?? 0)}
        page={page}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Record Payment"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Payment"
        data={viewData}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Payment' : 'Add Payment'}
        footer={
          <>
            <Button type="submit" form="payment-transaction-form" disabled={!editing || updateMutation.isPending}>
              {editing ? (updateMutation.isPending ? 'Saving…' : 'Save') : 'Create (blocked — Core API #0d)'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="payment-transaction-form" onSubmit={handleSubmit} className="space-y-5">
          {!editing && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Create cannot succeed until Core API maps orgId → organizationId and adds @AutoMap on the request.
            </div>
          )}
          <Field label="Linked To (type)">
            <Input value={form.referenceType} disabled={!editing} onChange={(e) => setForm({ ...form, referenceType: e.target.value })} />
          </Field>
          <Field label="Linked To (ID)">
            <Input value={form.referenceId} disabled={!editing} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} />
          </Field>
          <Field label="Type">
            <Input value={form.type} disabled={!editing} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </Field>
          <Field label="Method">
            <Input value={form.method} disabled={!editing} onChange={(e) => setForm({ ...form, method: e.target.value })} />
          </Field>
          <Field label="Amount">
            <Input type="number" value={form.amount} disabled={!editing} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Status">
            <Input value={form.status} disabled={!editing} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Payment"
        description="Delete this payment record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
