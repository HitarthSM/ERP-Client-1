import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CustomerFormDrawer } from '../../components/CustomerFormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { Customers, Organizations } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import { loadErrorMessage } from '../../lib/api-error';
import type { CreditStatus } from '../../types';

function CreditStatusDot({ status }: { status?: CreditStatus }) {
  const cls: Record<string, string> = {
    over: 'bg-red-500',
    warning: 'bg-amber-500',
    available: 'bg-green-500',
    none: 'bg-muted-foreground/30',
  };
  const labels: Record<string, string> = {
    over: 'Over limit',
    warning: 'Nearing limit',
    available: 'Credit available',
    none: 'No credit limit',
  };
  const key = status ?? 'none';
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${cls[key]}`}
      title={labels[key]}
    />
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewRow, setViewRow] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const removeMutation = Customers.useDelete();
  const { data: orgs } = Organizations.useList();
  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs ?? []) m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    return m;
  }, [orgs]);
  // Customers SearchCustomersRequest omits $page/$perPage — single API default page only.
  const { setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = Customers.useSearch({
    search: debouncedSearch,
  });
  const listError = isError ? loadErrorMessage(error, 'customers') : null;
  const customerRows = listError ? [] : (data?.items ?? []);
  const customerCount = customerRows.length;

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: Customer) => {
    setEditing(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const columns: Column<Customer>[] = [
    {
      key: 'creditStatus' as any,
      label: '',
      render: (row) => <CreditStatusDot status={row.creditStatus} />,
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline text-left"
          onClick={(e) => { e.stopPropagation(); navigate(`/customers/${row.id}`); }}
        >
          {row.name || '—'}
        </button>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.phone || '—',
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => row.email || '—',
    },
    {
      key: 'gstin',
      label: 'GSTIN',
      render: (row) => row.gstin || '—',
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      render: (row) => (row.creditLimit != null ? row.creditLimit.toFixed(2) : '—'),
    },
    {
      key: 'customerType',
      label: 'Type',
      render: (row) => row.customerType || '—',
    },
  ];

  const viewData = viewRow
    ? ({
        ...viewRow,
        organizationId: viewRow.organizationId ? (orgName.get(viewRow.organizationId) ?? viewRow.organizationId) : undefined,
      } as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Customers"
        description="Search, create, and update customers for sales bills."
        columns={columns}
        rows={customerRows}
        total={customerCount}
        page={1}
        limit={Math.max(customerCount, 1)}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={() => {}}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search by name…"
        footerNote="Showing first page of results — refine filters/search; server pagination pending"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Register Customer"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Customer"
        data={viewData}
        onClose={() => setViewRow(null)}
      />

      <CustomerFormDrawer
        open={drawerOpen}
        editing={editing}
        onClose={closeDrawer}
        onSaved={closeDrawer}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description="Soft-delete this customer?"
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
