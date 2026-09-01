import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Plus,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { Locations, Products, PurchaseOrders, Suppliers } from '../../api';
import { getErrorMessage } from '../../lib/api-error';
import { FormSelect } from '../../components/FormSelect';
import type { PurchaseItem, PurchaseOrderStatus } from '../../types';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft:               { label: 'Draft',               cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
  ordered:             { label: 'Ordered',             cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  partially_received:  { label: 'Partially Received',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  received:            { label: 'Received',            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  partially_allocated: { label: 'Partially Allocated', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  allocated:           { label: 'Allocated',           cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' },
  cancelled:           { label: 'Cancelled',           cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
};

function canStillReceive(status?: PurchaseOrderStatus): boolean {
  return status === 'draft' || status === 'ordered' || status === 'partially_received';
}

function canAllocate(status?: PurchaseOrderStatus): boolean {
  return (
    status === 'ordered' ||
    status === 'partially_received' ||
    status === 'received' ||
    status === 'partially_allocated'
  );
}

function isTerminal(status?: PurchaseOrderStatus): boolean {
  return status === 'allocated' || status === 'cancelled';
}

interface AllocationRow {
  locationId: string;
  quantity: number;
}

function hasUnallocated(items: PurchaseItem[]): boolean {
  return items.some(
    (item) => Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0)) > 0,
  );
}

export default function PurchaseOrderReceive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: po, isLoading, error } = PurchaseOrders.useGet(id);
  const { data: items = [], isLoading: itemsLoading } = PurchaseOrders.useGetItems(id);
  const { data: products = [] } = Products.useList();
  const { data: suppliers = [] } = Suppliers.useList();
  const { data: locations = [] } = Locations.useList();
  const receiveMutation = PurchaseOrders.useReceive();
  const allocateMutation = PurchaseOrders.useAllocate();

  // Section 1: receive quantities
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  // Section 2: allocation rows per purchaseItemId
  const [allocationRows, setAllocationRows] = useState<Record<string, AllocationRow[]>>({});
  const [allocateNotes, setAllocateNotes] = useState('');

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, { name: p.name ?? 'Unnamed', sku: p.sku }])),
    [products],
  );
  const supplier = useMemo(
    () => suppliers.find((s) => s.id === po?.supplierId),
    [suppliers, po?.supplierId],
  );

  const getReceiveQty = (itemId: string, remaining: number): number =>
    itemId in receiveQtys ? receiveQtys[itemId] : remaining;

  const anyToReceive = items.some((item) => {
    const remaining = Math.max(
      0,
      Number(item.quantityOrdered ?? 0) - Number(item.quantityReceived ?? 0),
    );
    return getReceiveQty(item.id, remaining) > 0;
  });

  const getRowsForItem = (itemId: string, unallocated: number): AllocationRow[] => {
    if (allocationRows[itemId]) return allocationRows[itemId];
    return [{ locationId: '', quantity: unallocated }];
  };

  const updateRow = (itemId: string, rowIdx: number, patch: Partial<AllocationRow>, unallocated: number): void => {
    const current = getRowsForItem(itemId, unallocated);
    const updated = current.map((row, idx) => (idx === rowIdx ? { ...row, ...patch } : row));
    setAllocationRows((prev) => ({ ...prev, [itemId]: updated }));
  };

  const addRow = (itemId: string, unallocated: number): void => {
    const current = getRowsForItem(itemId, unallocated);
    setAllocationRows((prev) => ({ ...prev, [itemId]: [...current, { locationId: '', quantity: 0 }] }));
  };

  const removeRow = (itemId: string, rowIdx: number, unallocated: number): void => {
    const current = getRowsForItem(itemId, unallocated);
    if (current.length <= 1) return;
    setAllocationRows((prev) => ({ ...prev, [itemId]: current.filter((_, idx) => idx !== rowIdx) }));
  };

  const totalAllocatingForItem = (itemId: string, unallocated: number): number =>
    getRowsForItem(itemId, unallocated).reduce((sum, row) => sum + (row.quantity || 0), 0);

  const allocationPayload = useMemo(() => {
    const allocatableItems = items.filter(
      (item) => Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0)) > 0,
    );
    return allocatableItems.flatMap((item) => {
      const unallocated = Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0));
      return getRowsForItem(item.id, unallocated)
        .filter((row) => row.locationId && row.quantity > 0)
        .map((row) => ({ purchaseItemId: item.id, locationId: row.locationId, quantity: row.quantity }));
    });
  }, [items, allocationRows]);

  const allocationValid = useMemo(() => {
    const allocatableItems = items.filter(
      (item) => Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0)) > 0,
    );
    if (allocatableItems.length === 0) return false;
    return allocatableItems.every((item) => {
      const unallocated = Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0));
      const rows = getRowsForItem(item.id, unallocated);
      const total = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
      const allHaveLocation = rows.every((row) => row.locationId !== '');
      return total > 0 && total <= unallocated && allHaveLocation;
    });
  }, [items, allocationRows]);

  const handleReceive = (): void => {
    if (!id) return;
    const receiveItems = items
      .map((item) => {
        const remaining = Math.max(
          0,
          Number(item.quantityOrdered ?? 0) - Number(item.quantityReceived ?? 0),
        );
        return { purchaseItemId: item.id, quantityReceived: getReceiveQty(item.id, remaining) };
      })
      .filter((item) => item.quantityReceived > 0);

    if (receiveItems.length === 0) return;

    receiveMutation.mutate(
      { id, body: { items: receiveItems, notes: receiveNotes.trim() || undefined } },
      { onSuccess: () => { setReceiveQtys({}); setReceiveNotes(''); } },
    );
  };

  const handleAllocate = (): void => {
    if (!id || allocationPayload.length === 0) return;
    allocateMutation.mutate(
      { id, body: { allocations: allocationPayload, notes: allocateNotes.trim() || undefined } },
      { onSuccess: () => navigate(`/purchase-orders/${id}`) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error || !po) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        {getErrorMessage(error, 'Unable to load purchase order.')}
      </div>
    );
  }

  if (isTerminal(po.status)) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate(`/purchase-orders/${id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Back to {po.poNumber ?? 'Purchase Order'}
        </button>
        <div className="rounded-xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <p className="text-base font-semibold text-foreground">No further action needed</p>
          <p className="text-sm text-muted-foreground">
            This purchase order is{' '}
            <span className="font-medium text-foreground">{STATUS_CONFIG[po.status!]?.label ?? po.status}</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/purchase-orders/${id}`)}
            className="mt-2 inline-flex px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = po.status ? STATUS_CONFIG[po.status] : null;
  const showReceiveSection = canStillReceive(po.status);
  const showAllocateSection = canAllocate(po.status) && !itemsLoading && hasUnallocated(items);

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => navigate(`/purchase-orders/${id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {po.poNumber ?? 'Purchase Order'}
      </button>

      {/* Header card — full width, two-column */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          {/* Left: title + PO number + status */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <ClipboardCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h1 className="text-lg font-bold text-foreground">Verify Receipt</h1>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-mono text-base font-semibold text-foreground">
                {po.poNumber ?? po.id.slice(0, 8)}
              </span>
              {statusCfg && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              )}
            </div>
            {supplier && (
              <p className="text-sm text-muted-foreground">
                Supplier: <span className="font-medium text-foreground">{supplier.name}</span>
              </p>
            )}
          </div>

          {/* Right: step progress pills */}
          <div className="flex items-center gap-2 shrink-0">
            <StepPill
              num={1}
              label="Record Receipt"
              active={showReceiveSection}
              done={!showReceiveSection && (showAllocateSection || po.status === 'received' || po.status === 'partially_allocated' || po.status === 'allocated')}
            />
            <div className="w-6 h-px bg-border" />
            <StepPill
              num={2}
              label="Allocate Stock"
              active={showAllocateSection && !showReceiveSection}
              done={po.status === 'allocated'}
            />
          </div>
        </div>

        {/* Status alerts */}
        {(po.status === 'partially_received' || po.status === 'partially_allocated') && (
          <div className="mt-4">
            {po.status === 'partially_received' && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>Partially received — inputs show remaining quantities. Adjust before confirming.</span>
              </div>
            )}
            {po.status === 'partially_allocated' && (
              <div className="flex items-start gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 px-3 py-2.5 text-xs text-violet-700 dark:text-violet-400">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>Some stock is already allocated. Assign the remaining received quantity below.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 1: RECORD RECEIPT — full width with side panel ── */}
      {showReceiveSection && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shrink-0">1</span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Record Receipt</h2>
              <p className="text-xs text-muted-foreground">Enter quantities physically received from the supplier</p>
            </div>
          </div>

          <div className="flex min-h-0">
            {/* Table — takes most of the width */}
            <div className="flex-1 overflow-x-auto">
              {itemsLoading ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading items…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ordered</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Received</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Remaining</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => {
                      const ordered = Number(item.quantityOrdered ?? 0);
                      const received = Number(item.quantityReceived ?? 0);
                      const remaining = Math.max(0, ordered - received);
                      const receiveQty = getReceiveQty(item.id, remaining);
                      const product = item.productId ? productMap.get(item.productId) : undefined;
                      const fullyReceived = ordered > 0 && received >= ordered;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${fullyReceived ? 'opacity-40 bg-muted/10' : 'hover:bg-muted/20'}`}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-foreground">
                              {product?.name ?? (item.productId?.slice(0, 8) ?? '—')}
                            </p>
                            {product?.sku && (
                              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{product.sku}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-foreground">{ordered}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                            {received}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums">
                            <span className={remaining > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {remaining > 0 ? (
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                value={receiveQty}
                                onChange={(e) =>
                                  setReceiveQtys((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                  }))
                                }
                                className="w-20 text-right text-sm border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background ml-auto block"
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-1 text-emerald-500">
                                <CheckCircle2 size={14} />
                                <span className="text-xs font-medium">Done</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right action panel */}
            <div className="w-72 shrink-0 border-l border-border bg-muted/10 flex flex-col p-5 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Receipt Summary</p>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const ordered = Number(item.quantityOrdered ?? 0);
                    const remaining = Math.max(0, ordered - Number(item.quantityReceived ?? 0));
                    const qty = getReceiveQty(item.id, remaining);
                    const product = item.productId ? productMap.get(item.productId) : undefined;
                    if (remaining === 0) return null;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[140px]">
                          {product?.name ?? item.productId?.slice(0, 8) ?? '—'}
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Partial delivery, 2 units damaged…"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background resize-none placeholder:text-muted-foreground/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleReceive}
                  disabled={!anyToReceive || receiveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ClipboardCheck size={15} />
                  {receiveMutation.isPending ? 'Processing…' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: ALLOCATE TO LOCATIONS — full width with side panel ── */}
      {showAllocateSection && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white shrink-0">
              {showReceiveSection ? '2' : '1'}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {showReceiveSection ? 'Step 2 — Allocate to Locations' : 'Allocate to Locations'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Assign received stock to warehouse locations — this adds it to inventory
              </p>
            </div>
          </div>

          <div className="flex min-h-0">
            {/* Main allocation content */}
            <div className="flex-1 divide-y divide-border overflow-x-auto">
              {itemsLoading ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading items…</div>
              ) : (
                items
                  .filter(
                    (item) => Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0)) > 0,
                  )
                  .map((item) => {
                    const received = Number(item.quantityReceived ?? 0);
                    const allocated = Number(item.quantityAllocated ?? 0);
                    const unallocated = Math.max(0, received - allocated);
                    const product = item.productId ? productMap.get(item.productId) : undefined;
                    const rows = getRowsForItem(item.id, unallocated);
                    const totalAssigning = totalAllocatingForItem(item.id, unallocated);
                    const overAllocating = totalAssigning > unallocated;

                    return (
                      <div key={item.id} className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-medium text-foreground">
                              {product?.name ?? (item.productId?.slice(0, 8) ?? '—')}
                            </p>
                            {product?.sku && (
                              <p className="text-[10px] font-mono text-muted-foreground">{product.sku}</p>
                            )}
                          </div>
                          <div className="text-xs text-right">
                            <span className="text-muted-foreground">Available: </span>
                            <span className="font-semibold text-foreground tabular-nums">{unallocated}</span>
                            {overAllocating && (
                              <span className="ml-2 text-red-500 font-medium">
                                (assigning {totalAssigning} — exceeds available)
                              </span>
                            )}
                            {!overAllocating && totalAssigning > 0 && (
                              <span className="ml-2 text-violet-600 dark:text-violet-400 font-medium">
                                ({totalAssigning} assigned)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {rows.map((row, rowIdx) => (
                            <div key={rowIdx} className="flex items-center gap-2 flex-wrap">
                              <FormSelect
                                value={row.locationId}
                                onChange={(locationId) => updateRow(item.id, rowIdx, { locationId }, unallocated)}
                                placeholder="Select location…"
                                className="flex-1 min-w-[160px] py-2"
                                options={locations.map((loc) => ({
                                  value: loc.id,
                                  label: loc.type
                                    ? `${loc.name} (${loc.type.charAt(0).toUpperCase() + loc.type.slice(1)})`
                                    : loc.name,
                                }))}
                              />
                              <input
                                type="number"
                                min={0}
                                max={unallocated}
                                value={row.quantity}
                                onChange={(e) =>
                                  updateRow(item.id, rowIdx, { quantity: Math.max(0, parseFloat(e.target.value) || 0) }, unallocated)
                                }
                                placeholder="Qty"
                                className="w-24 text-right text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 bg-background"
                              />
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRow(item.id, rowIdx, unallocated)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="Remove split"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addRow(item.id, unallocated)}
                          className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium transition-colors"
                        >
                          <Plus size={13} />
                          Split to another location
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Right action panel */}
            <div className="w-72 shrink-0 border-l border-border bg-muted/10 flex flex-col p-5 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Allocation Progress</p>
                <div className="space-y-2">
                  {items
                    .filter((item) => Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0)) > 0)
                    .map((item) => {
                      const unallocated = Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityAllocated ?? 0));
                      const assigning = totalAllocatingForItem(item.id, unallocated);
                      const over = assigning > unallocated;
                      const product = item.productId ? productMap.get(item.productId) : undefined;
                      return (
                        <div key={item.id} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-[140px]">
                              {product?.name ?? item.productId?.slice(0, 8) ?? '—'}
                            </span>
                            <span className={`font-semibold tabular-nums ${over ? 'text-red-500' : 'text-foreground'}`}>
                              {assigning} / {unallocated}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-violet-500'}`}
                              style={{ width: `${Math.min(100, unallocated > 0 ? (assigning / unallocated) * 100 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={allocateNotes}
                    onChange={(e) => setAllocateNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Item A split between main warehouse and store…"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 bg-background resize-none placeholder:text-muted-foreground/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAllocate}
                  disabled={!allocationValid || allocateMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Warehouse size={15} />
                  {allocateMutation.isPending ? 'Processing…' : 'Confirm Allocation'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/purchase-orders/${id}`)}
                  className="w-full px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If neither section is shown but status is not terminal */}
      {!showReceiveSection && !showAllocateSection && !itemsLoading && (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nothing to action right now.</p>
          <button
            type="button"
            onClick={() => navigate(`/purchase-orders/${id}`)}
            className="mt-1 inline-flex px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}

function StepPill({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
      done
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400'
        : active
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-muted text-muted-foreground'
    }`}>
      {done
        ? <CheckCircle2 size={11} />
        : <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>{num}</span>
      }
      {label}
    </div>
  );
}
