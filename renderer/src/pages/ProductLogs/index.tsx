import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { FormSection, Field } from '../../components/FormDrawer';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Products, Locations, get } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst';
import { cn } from '../../lib/utils';
import type { ProductLog, PaginatedResponse, Product, Location } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionBadgeClass(action: string): string {
  if (['product_created', 'product_enabled', 'stock_added', 'stock_transferred_in', 'stock_published'].includes(action))
    return 'text-green-400 bg-green-950/40 border-green-800/40';
  if (['product_disabled', 'stock_removed', 'stock_damaged', 'stock_written_off'].includes(action))
    return 'text-red-400 bg-red-950/40 border-red-800/40';
  if (['product_updated', 'stock_adjusted', 'stock_reserved', 'stock_reservation_released'].includes(action))
    return 'text-blue-400 bg-blue-950/40 border-blue-800/40';
  if (action === 'stock_transferred_out')
    return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
  return 'text-muted-foreground bg-muted/40 border-border';
}

function fmtTimeAgo(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtFull(d: string | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductLogsPage() {
  const [filterAction, setFilterAction] = useState('');
  const [filterProductId, setFilterProductId] = useState('');

  const { data: products } = Products.useList();
  const { data: locations = [] } = Locations.useList();

  useAutoSelectFirst(products, (p: Product) => setFilterProductId(p.id));

  const productLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products ?? []) map.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    return map;
  }, [products]);

  const locationLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations as Location[]) map.set(loc.id, loc.name);
    return map;
  }, [locations]);

  const allProductQueries = useQueries({
    queries: (products ?? []).map((p) => ({
      queryKey: ['product-logs', 'by-product', p.id] as const,
      queryFn: async () => {
        const paged = await get<PaginatedResponse<ProductLog>>(`/api/v1/product-logs/by-product/${p.id}`, { perPage: 100 });
        return paged.items ?? [];
      },
      staleTime: 60_000,
    })),
  });

  const allLogsLoading = allProductQueries.some((q) => q.isLoading);

  const rawLogs = useMemo(
    () => allProductQueries.flatMap((q) => q.data ?? []),
    [allProductQueries],
  );

  const allLogs = useMemo(() => {
    let logs = rawLogs;
    if (filterAction) logs = logs.filter((l) => l.action === filterAction);
    if (filterProductId) logs = logs.filter((l) => l.productId === filterProductId);
    return [...logs].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [rawLogs, filterAction, filterProductId]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    for (const l of rawLogs) if (l.action) actions.add(l.action);
    return Array.from(actions).sort();
  }, [rawLogs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Product logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit trail of all product changes and inventory movements.
        </p>
      </div>

      <FormSection title="Filters">
        <div className="flex flex-wrap gap-4">
          <Field label="Action">
            <Select value={filterAction || 'all'} onValueChange={(v) => setFilterAction(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{formatAction(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Product">
            <div className="w-64">
              <ResourceSelect
                resource={Products}
                getLabel={(p) => formatEntityLabel({ name: p.name, sku: p.sku, id: p.id })}
                value={filterProductId}
                onValueChange={setFilterProductId}
                placeholder="All products"
                allowNone
                noneLabel="All products"
              />
            </div>
          </Field>
        </div>
      </FormSection>

      {allLogsLoading ? (
        <p className="text-sm text-muted-foreground px-1">Loading product logs…</p>
      ) : allLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No logs found matching criteria.</p>
      ) : (
        <LogTable rows={allLogs} productLabel={productLabel} locationLabel={locationLabel} />
      )}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function LogTable({
  rows,
  productLabel,
  locationLabel,
}: {
  rows: ProductLog[];
  productLabel: Map<string, string>;
  locationLabel: Map<string, string>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Changes</th>
            <th className="px-4 py-3">Details</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 max-w-[200px]">
                <span className="truncate block text-foreground/80">
                  {productLabel.get(log.productId) ?? formatEntityLabel({ id: log.productId })}
                </span>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={cn(
                    'inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    actionBadgeClass(log.action),
                  )}
                >
                  {formatAction(log.action)}
                </span>
              </td>

              <td className="px-4 py-3">
                {(log.changedFields ?? []).length > 0 ? (
                  <div className="space-y-0.5">
                    {(log.changedFields ?? []).map((cf, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-foreground/70">{cf.field}:</span>{' '}
                        <span className="text-red-400/80 line-through">{String(cf.oldValue ?? '—')}</span>
                        {' → '}
                        <span className="text-green-400/80">{String(cf.newValue ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>

              <td className="px-4 py-3">
                {log.metadata && Object.keys(log.metadata).length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {Object.entries(log.metadata)
                      .filter(([, v]) => v != null)
                      .map(([k, v]) => (
                        <span key={k} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/60">{k}:</span> {String(v)}
                        </span>
                      ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-xs text-muted-foreground">
                {log.locationId ? (locationLabel.get(log.locationId) ?? log.locationId) : '—'}
              </td>

              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span
                  className="text-xs text-muted-foreground cursor-default"
                  title={fmtFull(log.createdAt)}
                >
                  {fmtTimeAgo(log.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
