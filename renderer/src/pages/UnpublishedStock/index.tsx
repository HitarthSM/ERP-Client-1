import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  HelpCircle,
  Loader2,
  MousePointerClick,
  PackagePlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { GuideModal, type GuideStep } from '../../components/GuideModal';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Locations,
  Products,
  useUnpublishedStockList,
  useUnpublishedStock,
  useUnpublishedStockMovements,
  useAddUnpublishedStock,
  usePublishUnpublishedStock,
  get,
} from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { UnpublishedStock, UnpublishedStockMovement, PlatformUser } from '../../types';

const GUIDE_KEY = 'guide-unpublished-stock-v2';

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <PackagePlus size={16} />,
    title: 'Add staging stock',
    description: 'Fill in the product, location, and quantity. The stock is staged for review — not yet live.',
  },
  {
    icon: <ChevronRight size={16} />,
    title: 'Select a record from the list',
    description: 'All unpublished records for your organisation appear on the right. Click any row to select it.',
  },
  {
    icon: <Send size={16} />,
    title: 'Publish to live inventory',
    description: 'Once selected, confirm the quantity and publish to make the stock available in main inventory.',
  },
];

const MOVEMENT_COLORS: Record<string, string> = {
  add: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  remove: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  publish: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  adjust: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function MovementBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/-/g, '_');
  const color = MOVEMENT_COLORS[key] ?? MOVEMENT_COLORS[type.toLowerCase()] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {type}
    </span>
  );
}

interface AddForm {
  productId: string;
  locationId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

interface PublishForm {
  quantity: string;
  notes: string;
}

interface LastAdded {
  productId: string;
  locationId: string;
  quantity: number;
}

const EMPTY_ADD: AddForm = { productId: '', locationId: '', quantity: '', unitCost: '', notes: '' };
const EMPTY_PUBLISH: PublishForm = { quantity: '', notes: '' };

export default function UnpublishedStockPage() {
  const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem(GUIDE_KEY));

  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);

  const [filterLocationId, setFilterLocationId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');

  const [activeId, setActiveId] = useState<string | undefined>();
  const [publishForm, setPublishForm] = useState<PublishForm>(EMPTY_PUBLISH);
  const [showHistory, setShowHistory] = useState(false);

  const { data: stagingList, isLoading: listLoading } = useUnpublishedStockList({
    locationId: filterLocationId || undefined,
    productId: filterProductId || undefined,
  });
  const { data: record, isLoading: recordLoading } = useUnpublishedStock(activeId);
  const { data: movements, isLoading: movLoading } = useUnpublishedStockMovements(activeId);
  const addMutation = useAddUnpublishedStock();
  const publishMutation = usePublishUnpublishedStock();

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.name);
    return m;
  }, [products]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const sortedMovements = useMemo(() => {
    const rows = [...(movements ?? [])];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [movements]);

  const uniqueUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of sortedMovements) if (m.performedById) ids.add(m.performedById);
    return [...ids];
  }, [sortedMovements]);

  const userQueries = useQueries({
    queries: uniqueUserIds.map((id) => ({
      queryKey: ['users', id] as const,
      queryFn: () => get<PlatformUser>(`/api/v1/users/${id}`),
      staleTime: 300_000,
      retry: false,
    })),
  });

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    uniqueUserIds.forEach((id, idx) => {
      const data = userQueries[idx]?.data;
      if (data) {
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || id;
        m.set(id, name);
      }
    });
    return m;
  }, [uniqueUserIds, userQueries]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.productId || !addForm.locationId || !addForm.quantity) {
      toast.error('Product, location, and quantity are required');
      return;
    }
    const qty = Number(addForm.quantity);
    addMutation.mutate(
      {
        productId:  addForm.productId,
        locationId: addForm.locationId,
        quantity:   qty,
        unitCost:   addForm.unitCost ? Number(addForm.unitCost) : undefined,
        notes:      addForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setLastAdded({ productId: addForm.productId, locationId: addForm.locationId, quantity: qty });
          setPublishForm({ quantity: String(qty), notes: '' });
          setAddForm(EMPTY_ADD);
          toast.success('Staging stock added — select it from the list on the right to publish');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to add staging stock'),
      },
    );
  };

  const handleSelectRecord = (item: UnpublishedStock) => {
    setActiveId(item.id);
    setPublishForm({ quantity: String(item.quantityOnHand), notes: '' });
    setShowHistory(false);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) { toast.error('Select a record first'); return; }
    const qty = Number(publishForm.quantity || record.quantityOnHand);
    if (!qty || Number.isNaN(qty)) { toast.error('Quantity is required'); return; }
    publishMutation.mutate(
      { unpublishedStockId: record.id, quantity: qty, notes: publishForm.notes || undefined },
      {
        onSuccess: () => {
          toast.success('Published to live inventory');
          setPublishForm(EMPTY_PUBLISH);
          setLastAdded(null);
          setActiveId(undefined);
          setShowHistory(false);
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to publish'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <GuideModal
        open={guideOpen}
        onClose={() => { localStorage.setItem(GUIDE_KEY, '1'); setGuideOpen(false); }}
        title="Welcome to Unpublished Stock"
        description="Stage new stock for review before making it live. Follow the three steps below."
        steps={GUIDE_STEPS}
        tip="All staged records for your organisation are listed on the right. Click any row to select it and publish."
      />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Unpublished Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage stock for review before publishing it to live inventory.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="gap-1.5">
          <HelpCircle size={15} />
          Guide
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">

        {/* ─── Left: Add Staging Stock ─── */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <PackagePlus size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Step 1 — Add Staging Stock</p>
                <p className="text-xs text-muted-foreground">Stage new stock without making it live</p>
              </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 p-5">
              <Field label="Product" required>
                <ResourceSelect
                  resource={Products}
                  getLabel={(p) => p.name}
                  value={addForm.productId}
                  onValueChange={(v) => setAddForm({ ...addForm, productId: v })}
                />
              </Field>
              <Field label="Location" required>
                <ResourceSelect
                  resource={Locations}
                  getLabel={(l) => l.name}
                  value={addForm.locationId}
                  onValueChange={(v) => setAddForm({ ...addForm, locationId: v })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" required>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  />
                </Field>
                <Field label="Unit cost">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={addForm.unitCost}
                    onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <Input
                  placeholder="e.g. Received from supplier"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </Field>
              <Button type="submit" disabled={addMutation.isPending} className="w-full gap-1.5">
                {addMutation.isPending
                  ? <><Loader2 size={14} className="animate-spin" />Adding…</>
                  : <><PackagePlus size={14} />Add to staging</>}
              </Button>
            </form>
          </div>

          {/* Success hint after add */}
          {lastAdded && (
            <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/8 p-4">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground">
                  Staged {lastAdded.quantity} ×{' '}
                  {productMap.get(lastAdded.productId) ?? formatEntityLabel({ id: lastAdded.productId })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  at {locationMap.get(lastAdded.locationId) ?? formatEntityLabel({ id: lastAdded.locationId })}
                </p>
                <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                  → Select it from the list on the right to publish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLastAdded(null)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* ─── Right: Browse + Publish ─── */}
        <div className="flex flex-col gap-4">

          {/* Step 2 — Staging Records List */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-blue-500/10 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <ChevronRight size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Step 2 — Select a Record</p>
                  <p className="text-xs text-muted-foreground">Click any row to select it for publishing</p>
                </div>
              </div>
              {stagingList && stagingList.length > 0 && (
                <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  {stagingList.length} record{stagingList.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-3 border-b border-border px-5 py-3">
              <div className="flex-1">
                <ResourceSelect
                  resource={Products}
                  getLabel={(p) => p.name}
                  value={filterProductId}
                  onValueChange={setFilterProductId}
                  placeholder="Filter by product…"
                />
              </div>
              <div className="flex-1">
                <ResourceSelect
                  resource={Locations}
                  getLabel={(l) => l.name}
                  value={filterLocationId}
                  onValueChange={setFilterLocationId}
                  placeholder="Filter by location…"
                />
              </div>
              {(filterProductId || filterLocationId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterProductId(''); setFilterLocationId(''); }}
                  className="shrink-0 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Click-to-publish hint — shown when records exist and none is selected */}
            {!listLoading && stagingList && stagingList.length > 0 && !activeId && (
              <div className="flex items-center gap-2 border-b border-border bg-blue-500/5 px-5 py-2">
                <MousePointerClick size={13} className="shrink-0 text-blue-500" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Click a row below to select it and open publishing options
                </p>
              </div>
            )}

            {/* List body */}
            <div className="max-h-72 overflow-y-auto">
              {listLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : !stagingList || stagingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No staging records found</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Add stock on the left to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stagingList.map((item: UnpublishedStock) => {
                    const isSelected = item.id === activeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRecord(item)}
                        className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/8 ring-1 ring-inset ring-primary/30' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {productMap.get(item.productId) ?? formatEntityLabel({ id: item.productId })}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {locationMap.get(item.locationId) ?? formatEntityLabel({ id: item.locationId })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-foreground">{item.quantityOnHand}</p>
                          <p className="text-xs text-muted-foreground">on hand</p>
                        </div>
                        <button
                          type="button"
                          title="Copy record ID"
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigator.clipboard.writeText(item.id);
                            toast.success('Record ID copied');
                          }}
                          className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Copy size={12} />
                        </button>
                        {isSelected && <CheckCircle2 size={14} className="shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Step 3 — Publish (shown when a record is selected) */}
          {activeId && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-green-500/10 to-transparent px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 text-green-600 dark:text-green-400">
                  <Send size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Step 3 — Publish to Inventory</p>
                  <p className="text-xs text-muted-foreground">Review and publish the staged stock</p>
                </div>
                <button
                  type="button"
                  title="Close"
                  onClick={() => { setActiveId(undefined); setPublishForm(EMPTY_PUBLISH); setShowHistory(false); }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={15} />
                </button>
              </div>

              {recordLoading ? (
                <div className="space-y-2 p-5">
                  {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : record ? (
                <div className="space-y-5 p-5">
                  {/* Record info tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 px-3 py-3">
                      <p className="text-xs text-muted-foreground">Product</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {productMap.get(record.productId) ?? formatEntityLabel({ id: record.productId })}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-3">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {locationMap.get(record.locationId) ?? formatEntityLabel({ id: record.locationId })}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-3">
                      <p className="text-xs text-muted-foreground">On hand</p>
                      <p className="mt-0.5 text-xl font-bold text-foreground">{record.quantityOnHand}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-3">
                      <p className="text-xs text-muted-foreground">Avg cost</p>
                      <p className="mt-0.5 text-xl font-bold text-foreground">{record.averageCost ?? '—'}</p>
                    </div>
                  </div>

                  {/* Publish form */}
                  <form onSubmit={handlePublish} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantity to publish" required>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={publishForm.quantity || String(record.quantityOnHand ?? '')}
                          onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
                        />
                      </Field>
                      <Field label="Notes">
                        <Input
                          placeholder="Optional note…"
                          value={publishForm.notes}
                          onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Button type="submit" disabled={publishMutation.isPending} className="w-full gap-1.5">
                      {publishMutation.isPending
                        ? <><Loader2 size={14} className="animate-spin" />Publishing…</>
                        : <><Sparkles size={14} />Publish to live inventory</>}
                    </Button>
                  </form>

                  {/* Movement history — collapsible */}
                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-muted-foreground" />
                        Movement History
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {sortedMovements.length}
                        </span>
                      </span>
                      {showHistory
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>

                    {showHistory && (
                      <div className="mt-3">
                        {movLoading ? (
                          <div className="space-y-2">
                            {[1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
                          </div>
                        ) : sortedMovements.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">No movements yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  {['Date', 'Type', 'Qty', 'Before → After', 'By'].map((h) => (
                                    <th key={h} className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground last:pr-0">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {sortedMovements.map((m: UnpublishedStockMovement) => (
                                  <tr key={m.id} className="transition-colors hover:bg-muted/40">
                                    <td className="py-2 pr-4 text-xs whitespace-nowrap text-muted-foreground">
                                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <MovementBadge type={m.movementType} />
                                    </td>
                                    <td className="py-2 pr-4 font-mono text-sm font-medium tabular-nums text-foreground">
                                      {m.quantity}
                                    </td>
                                    <td className="py-2 pr-4 text-xs whitespace-nowrap">
                                      <span className="text-muted-foreground">{m.quantityBefore}</span>
                                      <span className="mx-1.5 text-muted-foreground/50">→</span>
                                      <span className="font-medium text-foreground">{m.quantityAfter}</span>
                                    </td>
                                    <td className="py-2 text-xs whitespace-nowrap text-muted-foreground">
                                      {m.performedById ? (userMap.get(m.performedById) ?? '…') : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
