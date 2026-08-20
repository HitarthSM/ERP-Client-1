import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Bills, Customers, Locations } from '../../api';
import { CustomerPicker } from '../../components/CustomerPicker';
import { BillViewDrawer } from './BillViewDrawer';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { loadErrorMessage } from '../../lib/api-error';
import type { Bill, BillStatus, CreateBillInput, Customer } from '../../types';

const STATUS_FILTERS: Array<BillStatus | 'ALL'> = [
  'ALL',
  'INITIATED',
  'DRAFT',
  'COMPLETED',
  'CANCELLED',
];

interface FormState {
  locationId: string;
  customerId: string;
  customerLabel: string;
  walkInName: string;
  walkInPhone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  locationId: '',
  customerId: '',
  customerLabel: '',
  walkInName: '',
  walkInPhone: '',
  notes: '',
};

function customerLabel(row: Bill, customerName: Map<string, string>): string {
  if (row.customerId) {
    const name = customerName.get(row.customerId);
    if (name) return name;
    return `Customer ${truncateId(row.customerId)}`;
  }
  return '—';
}

function walkInLabel(row: Bill): string {
  return row.walkInName || '—';
}

function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function extractRef(notes: string | null | undefined): string {
  if (!notes) return '—';
  const m = notes.match(/(?:Ref|Pay ref): ([^·]+)/);
  return m ? m[1].trim() : '—';
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function exportBillsCsv(rows: Bill[], customerName: Map<string, string>, locationName: Map<string, string>) {
  const headers = [
    'Bill #',
    'Date',
    'Customer',
    'Walking Guest',
    'Reference No.',
    'Location',
    'Status',
    'Sale Type',
    'Payment',
    'Subtotal',
    'Discount',
    'Tax',
    'Total',
  ];

  const csvRows = rows.map((r) => [
    r.billNumber || truncateId(r.id),
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    r.customerId ? (customerName.get(r.customerId) ?? truncateId(r.customerId)) : '',
    r.walkInName ?? '',
    extractRef(r.notes),
    locationName.get(r.locationId) ?? truncateId(r.locationId),
    r.status,
    r.saleType ?? '',
    r.paymentMethod ?? '',
    Number(r.subtotal ?? 0).toFixed(2),
    Number(r.discountAmount ?? 0).toFixed(2),
    Number(r.taxAmount ?? 0).toFixed(2),
    Number(r.totalAmount ?? 0).toFixed(2),
  ]);

  const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers, ...csvRows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bills-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BillsPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const createMutation = Bills.useCreate();
  const removeMutation = Bills.useDelete();
  const { data: locations = [] } = Locations.useList();
  const { data: customersPage } = Customers.useSearch({});
  const customers = customersPage?.items ?? [];

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter !== 'ALL') next.status = statusFilter;
    if (locationFilter) next.locationId = locationFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter, locationFilter]);

  const { data, isLoading, isError, error, refetch } = Bills.useSearch({ filters });
  const listError = isError ? loadErrorMessage(error, 'bills') : null;

  const allBillRows = listError ? [] : (data?.items ?? []);

  const billRows = useMemo(() => {
    let rows = allBillRows;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= to);
    }
    return rows;
  }, [allBillRows, dateFrom, dateTo]);

  const billCount = billRows.length;

  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    }
    return m;
  }, [locations]);

  const customerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) {
      m.set(c.id, formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }));
    }
    return m;
  }, [customers]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      locationId: locations[0]?.id ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const canSubmit =
    !!form.locationId && (!!form.customerId || !!form.walkInName.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body: CreateBillInput = {
      locationId: form.locationId,
      customerId: form.customerId || undefined,
      walkInName: form.customerId ? undefined : form.walkInName.trim(),
      walkInPhone: form.customerId ? undefined : form.walkInPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      items: [],
    };

    createMutation.mutate(body as Partial<Bill>, {
      onSuccess: (created) => {
        closeDrawer();
        if (created?.id) navigate(`/bills/${created.id}`);
      },
    });
  };

  const handleCustomerSelect = (c: Customer) => {
    setForm({
      ...form,
      customerId: c.id,
      customerLabel: formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }),
      walkInName: '',
      walkInPhone: '',
    });
  };

  const saleTypeBadge = (type: string | undefined | null) => {
    if (!type || type === 'normal') return null;
    const cls =
      type === 'credit'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-slate-500/15 text-slate-700 dark:text-slate-300';
    return (
      <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
        {type}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      DRAFT: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      INITIATED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-400',
    };
    return (
      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${cls[status] ?? 'bg-muted text-muted-foreground'}`}>
        {status}
      </span>
    );
  };

  const columns: Column<Bill>[] = [
    {
      key: 'billNumber',
      label: 'Bill #',
      render: (row) => (
        <span className="font-mono text-xs">{row.billNumber || truncateId(row.id)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => customerLabel(row, customerNameMap),
    },
    {
      key: 'walkIn',
      label: 'Walk-in',
      render: (row) => (
        <span className="text-muted-foreground">{walkInLabel(row)}</span>
      ),
    },
    {
      key: 'referenceNo',
      label: 'Reference No.',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{extractRef(row.notes)}</span>
      ),
    },
    {
      key: 'locationId',
      label: 'Location',
      render: (row) =>
        formatEntityLabel({
          name: locationName.get(row.locationId),
          id: row.locationId,
        }),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1">
          {statusBadge(row.status)}
          {saleTypeBadge(row.saleType)}
        </div>
      ),
    },
    {
      key: 'subtotal',
      label: 'Gross Amt',
      render: (row) => (
        <span className="tabular-nums">{money(row.subtotal)}</span>
      ),
    },
    {
      key: 'discountAmount',
      label: 'Discount',
      render: (row) => (
        <span className={`tabular-nums ${Number(row.discountAmount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
          {Number(row.discountAmount) > 0 ? `-${money(row.discountAmount)}` : '—'}
        </span>
      ),
    },
    {
      key: 'taxAmount',
      label: 'Tax',
      render: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {Number(row.taxAmount) > 0 ? money(row.taxAmount) : '—'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => (
        <span className="font-semibold tabular-nums">{money(row.totalAmount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (row) => (
        <span className="text-xs capitalize">{row.paymentMethod?.replace(/_/g, ' ').toLowerCase() ?? '—'}</span>
      ),
    },
  ];

  const canDelete = (row: Bill) => row.status === 'INITIATED' || row.status === 'DRAFT';

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Sales Ledger"
        description="All sales bills — filter by status, location, and date range."
        columns={columns}
        rows={billRows}
        total={billCount}
        page={1}
        limit={Math.max(billCount, 1)}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={() => {}}
        hideSearch
        footerNote="Showing first page of results — refine filters; server pagination pending"
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Location:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type ? `${l.name} (${l.type})` : l.name}
                </option>
              ))}
            </select>
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
            {(dateFrom || dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear dates
              </Button>
            )}
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportBillsCsv(billRows, customerNameMap, locationName)}
              disabled={billRows.length === 0}
            >
              <Download size={14} /> Export CSV
            </Button>
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Generate Bill"
        onView={(row) => setViewRow(row)}
        onEdit={(row) => navigate(`/bills/${row.id}`)}
        canDelete={canDelete}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <BillViewDrawer
        billId={viewRow?.id ?? null}
        locationName={
          viewRow
            ? formatEntityLabel({
                name: locationName.get(viewRow.locationId),
                id: viewRow.locationId,
              })
            : undefined
        }
        partyLabel={viewRow ? customerLabel(viewRow, customerNameMap) : undefined}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Bill"
        footer={
          <>
            <Button
              type="submit"
              form="bill-form"
              disabled={createMutation.isPending || !canSubmit}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="bill-form" onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Creates an <code className="text-[10px]">INITIATED</code> bill. Link a customer or enter
            walk-in name. Add items and complete on the detail page or via POS.
          </p>
          <Field label="Location">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              required
            >
              <option value="">Select location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type ? `${l.name} (${l.type})` : l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer (search)">
            {form.customerId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span>{form.customerLabel || truncateId(form.customerId)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm({ ...form, customerId: '', customerLabel: '' })
                  }
                >
                  Clear
                </Button>
              </div>
            ) : (
              <CustomerPicker
                customerId={form.customerId}
                onSelect={handleCustomerSelect}
                onClear={() => setForm({ ...form, customerId: '', customerLabel: '' })}
                placeholder="Type name to search…"
                size="md"
              />
            )}
          </Field>
          {!form.customerId && (
            <>
              <Field label="Walk-in name">
                <Input
                  value={form.walkInName}
                  onChange={(e) => setForm({ ...form, walkInName: e.target.value })}
                  placeholder="Required if no customer linked"
                  required
                />
              </Field>
              <Field label="Walk-in phone">
                <Input
                  value={form.walkInPhone}
                  onChange={(e) => setForm({ ...form, walkInPhone: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </>
          )}
          <Field label="Notes">
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Bill"
        description="Soft-delete this bill? Only INITIATED or DRAFT bills can be deleted."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
