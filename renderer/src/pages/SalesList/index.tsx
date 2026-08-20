import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import { DataTable, type Column } from '../../components/DataTable';
import { Button } from '../../components/ui/button';
import { Bills, Customers, Locations } from '../../api';
import { BillViewDrawer } from '../Bills/BillViewDrawer';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { loadErrorMessage } from '../../lib/api-error';
import type { Bill, BillStatus, SaleType } from '../../types';

const STATUS_FILTERS: Array<BillStatus | 'ALL'> = ['ALL', 'COMPLETED', 'DRAFT', 'INITIATED', 'CANCELLED'];
const SALE_TYPE_FILTERS: Array<SaleType | 'ALL'> = ['ALL', 'normal', 'credit', 'black'];

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
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function exportCsv(rows: Bill[], customerName: Map<string, string>, locationName: Map<string, string>) {
  const headers = ['Bill #', 'Date', 'Customer', 'Walk-in', 'Reference', 'Location', 'Status', 'Sale Type', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Total'];
  const csvRows = rows.map((r) => [
    r.billNumber || truncateId(r.id),
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    r.customerId ? (customerName.get(r.customerId) ?? '') : '',
    r.walkInName ?? '',
    extractRef(r.notes),
    locationName.get(r.locationId) ?? '',
    r.status,
    r.saleType ?? 'normal',
    r.paymentMethod ?? '',
    Number(r.subtotal ?? 0).toFixed(2),
    Number(r.discountAmount ?? 0).toFixed(2),
    Number(r.taxAmount ?? 0).toFixed(2),
    Number(r.totalAmount ?? 0).toFixed(2),
  ]);
  const esc = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers, ...csvRows].map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalesListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL');
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleType | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewRow, setViewRow] = useState<Bill | null>(null);

  const { data: locations = [] } = Locations.useList();
  const { data: customersPage } = Customers.useSearch({});
  const customers = customersPage?.items ?? [];

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (locationFilter) f.locationId = locationFilter;
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, locationFilter]);

  const { data, isLoading, isError, error, refetch } = Bills.useSearch({ filters });
  const listError = isError ? loadErrorMessage(error, 'sales') : null;
  const allRows = listError ? [] : (data?.items ?? []);

  const rows = useMemo(() => {
    let r = allRows;
    if (saleTypeFilter !== 'ALL') {
      r = r.filter((b) => (b.saleType ?? 'normal') === saleTypeFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      r = r.filter((b) => b.createdAt && new Date(b.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      r = r.filter((b) => b.createdAt && new Date(b.createdAt) <= to);
    }
    return r;
  }, [allRows, saleTypeFilter, dateFrom, dateTo]);

  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    return m;
  }, [locations]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.id, formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }));
    return m;
  }, [customers]);

  const partyLabel = (row: Bill) => {
    if (row.customerId) return customerName.get(row.customerId) ?? truncateId(row.customerId);
    return row.walkInName || '—';
  };

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      DRAFT: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      INITIATED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-400',
    };
    return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${cls[s] ?? 'bg-muted'}`}>{s}</span>;
  };

  const saleTypeBadge = (t: string | undefined | null) => {
    if (!t || t === 'normal') return <span className="text-xs text-muted-foreground">Normal</span>;
    const cls = t === 'credit'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      : 'bg-slate-500/15 text-slate-700 dark:text-slate-300';
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>{t}</span>;
  };

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, tax = 0, total = 0;
    for (const r of rows) {
      subtotal += Number(r.subtotal ?? 0);
      discount += Number(r.discountAmount ?? 0);
      tax += Number(r.taxAmount ?? 0);
      total += Number(r.totalAmount ?? 0);
    }
    return { subtotal, discount, tax, total };
  }, [rows]);

  const columns: Column<Bill>[] = [
    { key: 'billNumber', label: 'Bill #', render: (r) => <span className="font-mono text-xs">{r.billNumber || truncateId(r.id)}</span> },
    { key: 'createdAt', label: 'Date', render: (r) => <span className="text-xs whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    { key: 'customer', label: 'Customer / Walk-in', render: (r) => (
      <div>
        <p className="text-sm font-medium">{partyLabel(r)}</p>
        {r.customerId && r.walkInName && <p className="text-[10px] text-muted-foreground">Walk-in: {r.walkInName}</p>}
      </div>
    )},
    { key: 'ref', label: 'Reference', render: (r) => <span className="font-mono text-xs text-muted-foreground">{extractRef(r.notes)}</span> },
    { key: 'location', label: 'Store', render: (r) => <span className="text-xs">{locationName.get(r.locationId) ?? '—'}</span> },
    { key: 'saleType', label: 'Type', render: (r) => saleTypeBadge(r.saleType) },
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'paymentMethod', label: 'Payment', render: (r) => <span className="text-xs capitalize">{r.paymentMethod?.replace(/_/g, ' ').toLowerCase() ?? '—'}</span> },
    { key: 'subtotal', label: 'Gross', render: (r) => <span className="tabular-nums">{money(r.subtotal)}</span> },
    { key: 'discountAmount', label: 'Discount', render: (r) => (
      <span className={`tabular-nums ${Number(r.discountAmount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        {Number(r.discountAmount) > 0 ? `-${money(r.discountAmount)}` : '—'}
      </span>
    )},
    { key: 'taxAmount', label: 'Tax', render: (r) => <span className="tabular-nums text-muted-foreground">{Number(r.taxAmount) > 0 ? money(r.taxAmount) : '—'}</span> },
    { key: 'totalAmount', label: 'Total', render: (r) => <span className="font-semibold tabular-nums">{money(r.totalAmount)}</span> },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total Sales" value={money(totals.total)} accent />
        <SummaryCard label="Gross Amount" value={money(totals.subtotal)} />
        <SummaryCard label="Total Discount" value={totals.discount > 0 ? `-${money(totals.discount)}` : '—'} />
        <SummaryCard label="Total Tax" value={totals.tax > 0 ? money(totals.tax) : '—'} />
      </div>

      <DataTable
        title="Sales List"
        description={`${rows.length} sales transactions`}
        columns={columns}
        rows={rows}
        total={rows.length}
        page={1}
        limit={Math.max(rows.length, 1)}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={() => {}}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Type:</span>
            {SALE_TYPE_FILTERS.map((t) => (
              <Button key={t} size="sm" variant={saleTypeFilter === t ? 'default' : 'outline'} onClick={() => setSaleTypeFilter(t)}>
                {t === 'ALL' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Store:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.type ? `${l.name} (${l.type})` : l.name}</option>
              ))}
            </select>
            <div className="h-5 w-px bg-border" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none" />
            {(dateFrom || dateTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
            )}
            <div className="h-5 w-px bg-border" />
            <Button size="sm" variant="outline" onClick={() => exportCsv(rows, customerName, locationName)} disabled={rows.length === 0}>
              <Download size={14} /> Export
            </Button>
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin
        addLabel="New Sale"
        onAdd={() => navigate('/pos/sales')}
        onView={(row) => setViewRow(row)}
        onEdit={(row) => navigate(`/bills/${row.id}`)}
      />

      <BillViewDrawer
        billId={viewRow?.id ?? null}
        locationName={viewRow ? (locationName.get(viewRow.locationId) ?? undefined) : undefined}
        partyLabel={viewRow ? partyLabel(viewRow) : undefined}
        onClose={() => setViewRow(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
