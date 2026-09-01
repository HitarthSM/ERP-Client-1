import { useMemo, useState } from 'react';
import { Plus, Printer, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditTransactions } from '../../api';
import { CustomerFormDrawer } from '../../components/CustomerFormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { usePagination } from '../../hooks/usePagination';
import { loadErrorMessage } from '../../lib/api-error';
import { fmt } from '../pos/posHelpers';
import type { CreditTransactionDocument } from '../../types';
import {
  docNumber,
  formatSignedAmount,
  signedAmountLabel,
  typeFilterToApi,
  type DocumentTypeFilter,
} from './documentRow';
import { printCreditorStatement } from './statementPdf';

const TYPE_LABEL: Record<CreditTransactionDocument['type'], string> = {
  credit_sale: 'Credit sale',
  payment: 'Payment',
  adjustment: 'Adjustment',
};

const TYPE_FILTERS: Array<{ value: DocumentTypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'credit_sale', label: 'Credit sales' },
  { value: 'payment', label: 'Payments' },
  { value: 'adjustment', label: 'Adjustments' },
];

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

function documentDate(row: CreditTransactionDocument) {
  return DATE_FORMAT.format(new Date(row.billedAt ?? row.createdAt));
}

export default function CreditorsPage() {
  const navigate = useNavigate();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>('all');
  const { data, isLoading, isError, error, refetch } = CreditTransactions.useSearch({
    page,
    search: debouncedSearch || undefined,
    type: typeFilterToApi(typeFilter),
  });
  const listError = isError ? loadErrorMessage(error, 'creditors') : null;
  const rows = useMemo(() => (listError ? [] : (data?.items ?? [])), [data?.items, listError]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const selected = rows.find((row) => row.id === selectedId);

  function openDocument(row: CreditTransactionDocument) {
    navigate(row.billId ? `/bills/${row.billId}` : `/customers/${row.customerId}`);
  }

  async function handlePrint() {
    if (!selected) {
      toast.error('Select a creditor first');
      return;
    }
    setPrinting(true);
    try {
      await printCreditorStatement({
        customerId: selected.customerId,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print statement');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <div className="space-y-3 border-b border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-sm font-semibold">Creditors</h1>
              <p className="text-xs text-muted-foreground">Credit sales, payments, and adjustments</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" type="button" variant="outline" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} /> Add
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={!selected || printing}
                onClick={() => void handlePrint()}
              >
                <Printer size={14} /> {printing ? 'Printing…' : 'Print selected'}
              </Button>
              <Button
                size="icon"
                type="button"
                variant="ghost"
                title="Refresh"
                onClick={() => void refetch()}
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1" aria-label="Document type filter">
              {TYPE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  type="button"
                  variant={typeFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => {
                    setTypeFilter(filter.value);
                    setPage(1);
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <Input
              className="ml-auto w-full sm:w-72"
              placeholder="Search customer, bill, or note…"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading && !listError ? (
            <p className="p-3 text-sm text-muted-foreground">Loading credit documents…</p>
          ) : listError ? (
            <p className="p-3 text-sm text-destructive">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No credit documents match.</p>
          ) : (
            <table className="min-w-[1180px] w-full text-xs">
              <thead className="sticky top-0 z-10 bg-card text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="w-14 px-2 py-2 text-center font-medium">Print</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Type</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Doc #</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Date</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Invoice / Bill</th>
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Walk-in</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Gross</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Discount</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Tax</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Amount</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Balance after</th>
                  <th className="px-2 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = row.id === selectedId;
                  const signedAmount = signedAmountLabel(row);
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-default border-b border-border/70 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                      tabIndex={0}
                      aria-selected={isSelected}
                      title="Click to select for printing; double-click to open"
                      onClick={() => setSelectedId(row.id)}
                      onDoubleClick={(event) => {
                        if ((event.target as HTMLElement).closest('button, a, input')) return;
                        openDocument(row);
                      }}
                      onFocus={(event) => {
                        if (event.target === event.currentTarget) setSelectedId(row.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(row.id);
                        } else if (event.key === 'Enter') {
                          event.preventDefault();
                          openDocument(row);
                        }
                      }}
                    >
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="radio"
                          name="credit-document-to-print"
                          className="h-4 w-4 accent-primary"
                          checked={isSelected}
                          aria-label={`Select ${row.customerName ?? 'credit document'} for printing`}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => setSelectedId(row.id)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">{TYPE_LABEL[row.type]}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDocument(row);
                          }}
                        >
                          {docNumber(row)}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">{documentDate(row)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{row.billNumber ?? '—'}</td>
                      <td className="max-w-48 truncate px-2 py-1.5 font-medium">{row.customerName ?? '—'}</td>
                      <td className="max-w-40 truncate px-2 py-1.5">{row.walkInName ?? '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                        {row.subtotal == null ? '—' : fmt(row.subtotal)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                        {row.discountAmount == null ? '—' : fmt(row.discountAmount)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                        {row.taxAmount == null ? '—' : fmt(row.taxAmount)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 text-right font-medium tabular-nums ${
                          signedAmount < 0 ? 'text-green-600' : ''
                        }`}
                      >
                        {formatSignedAmount(signedAmount)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                        {fmt(row.balanceAfter)}
                      </td>
                      <td className="max-w-64 truncate px-2 py-1.5">
                        {row.note || row.paymentMethod || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            Page {data?.page ?? page}
            {data?.totalPages ? ` of ${data.totalPages}` : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={isLoading || page >= (data?.totalPages ?? page)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <CustomerFormDrawer
        open={drawerOpen}
        requireCreditLimit
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}
