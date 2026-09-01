import { useMemo, useState, type ReactNode } from 'react';
import {
  Package, AlertTriangle, DollarSign, HelpCircle,
  Plus, Minus, RotateCcw, Lock, Unlock, ShieldOff, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/DataTable';
import { FilterDropdown } from '../../components/FilterDropdown';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ResourceSelect } from '../../components/ResourceSelect';
import { GuideModal, type GuideStep } from '../../components/GuideModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Inventory, Products, Locations,
  useInventoryLowStock, useInventoryValuation, useStockOperation,
} from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { InventoryItem, StockMovementOp } from '../../types';

const GUIDE_KEY = 'guide-inventory-v1';

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Package size={16} />,
    title: 'See all your stock',
    description: 'Every product at every location is listed here with live on-hand quantities.',
  },
  {
    icon: <AlertTriangle size={16} />,
    title: 'Filter by location or status',
    description: 'Use the filters to quickly find low stock items or narrow by location.',
  },
  {
    icon: <RotateCcw size={16} />,
    title: 'Manage stock levels',
    description: 'Click View on any row to add, remove, adjust, reserve or write off stock.',
  },
];

type OpKey = StockMovementOp;
interface OpDef {
  op: OpKey; label: string; icon: ReactNode;
  usesAbsolute?: boolean; showCost?: boolean; iconColor: string;
}

const OPS: OpDef[] = [
  { op: 'add',                 label: 'Add',       icon: <Plus size={13} />,      showCost: true,                iconColor: 'text-green-600 dark:text-green-400'   },
  { op: 'remove',              label: 'Remove',    icon: <Minus size={13} />,                                    iconColor: 'text-red-600 dark:text-red-400'       },
  { op: 'adjust',              label: 'Adjust',    icon: <RotateCcw size={13} />, usesAbsolute: true, showCost: true, iconColor: 'text-blue-600 dark:text-blue-400' },
  { op: 'reserve',             label: 'Reserve',   icon: <Lock size={13} />,                                     iconColor: 'text-amber-600 dark:text-amber-400'   },
  { op: 'release-reservation', label: 'Release',   icon: <Unlock size={13} />,                                   iconColor: 'text-teal-600 dark:text-teal-400'     },
  { op: 'damage',              label: 'Damage',    icon: <ShieldOff size={13} />,                                iconColor: 'text-orange-600 dark:text-orange-400' },
  { op: 'write-off',           label: 'Write Off', icon: <XCircle size={13} />,                                  iconColor: 'text-rose-700 dark:text-rose-400'     },
];

function StockStatusBadge({ item }: { item: InventoryItem }) {
  const onHand  = Number(item.quantityOnHand);
  const reorder = Number(item.reorderLevel ?? 0);
  if (onHand === 0) {
    return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">Out of Stock</span>;
  }
  if (reorder > 0 && onHand <= reorder) {
    return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Low Stock</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">In Stock</span>;
}

function StatCard({ icon, label, value, colorClass, onClick, active }: {
  icon: ReactNode; label: string; value: string; colorClass: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        'rounded-xl border bg-card p-4 text-left transition-all w-full',
        onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-sm' : 'cursor-default',
        active  ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border',
      ].join(' ')}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-lg p-1.5 ${colorClass}`}>{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

interface CreateForm {
  productId: string; locationId: string;
  initialQty: string; averageCost: string;
  reorderLevel: string; maxStock: string; binLocation: string;
}

interface OpForm { op: OpKey; quantity: string; unitCost: string; notes: string }

type StatusFilter = 'all' | 'low' | 'zero';

export default function InventoryPage() {
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all');

  const [viewItem,   setViewItem]   = useState<InventoryItem | null>(null);
  const [editItem,   setEditItem]   = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [guideOpen,  setGuideOpen]  = useState(() => !localStorage.getItem(GUIDE_KEY));

  const [createForm, setCreateForm] = useState<CreateForm>({
    productId: '', locationId: '', initialQty: '', averageCost: '',
    reorderLevel: '', maxStock: '', binLocation: '',
  });
  const [editForm, setEditForm] = useState({ reorderLevel: '', maxStock: '', binLocation: '' });
  const [opForm,   setOpForm]   = useState<OpForm>({ op: 'add', quantity: '', unitCost: '', notes: '' });

  const searchFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (locationFilter) f.locationId = locationFilter;
    return Object.keys(f).length ? f : undefined;
  }, [locationFilter]);

  const { data: searchData, isLoading, refetch } = Inventory.useSearch({
    page, search: debouncedSearch, filters: searchFilters, enabled: statusFilter !== 'low',
  });
  const { data: lowStockItems, isLoading: lowLoading } = useInventoryLowStock();
  const { data: valuationItems }                       = useInventoryValuation();
  const { data: products }  = Products.useList();
  const { data: locations } = Locations.useList();

  const createMutation = Inventory.useCreate();
  const updateMutation = Inventory.useUpdate();
  const deleteMutation = Inventory.useDelete();
  const opMutation     = useStockOperation();

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.name ? `${p.name}${p.sku ? ` (${p.sku})` : ''}` : p.id.slice(0, 8));
    return m;
  }, [products]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name ?? l.id.slice(0, 8));
    return m;
  }, [locations]);

  const locationOptions = useMemo(
    () => (locations ?? []).map(l => ({ value: l.id, label: l.name ?? l.id })),
    [locations],
  );

  const tableData = useMemo(() => {
    if (statusFilter === 'low') {
      const items = (lowStockItems ?? []).filter(i => !locationFilter || i.locationId === locationFilter);
      return { items, total: items.length };
    }
    if (statusFilter === 'zero') {
      const items = (searchData?.items ?? []).filter(i => Number(i.quantityOnHand) === 0);
      return { items, total: items.length };
    }
    return { items: searchData?.items ?? [], total: searchData?.total ?? 0 };
  }, [statusFilter, lowStockItems, searchData, locationFilter]);

  const totalValue = useMemo(
    () => (valuationItems ?? []).reduce((s, i) => s + Number(i.quantityOnHand) * Number(i.averageCost ?? 0), 0),
    [valuationItems],
  );

  const activeOp = useMemo(() => OPS.find(o => o.op === opForm.op)!, [opForm.op]);

  const columns: Column<InventoryItem>[] = [
    { key: 'productId',  label: 'Product',   render: r => <span className="font-medium">{productMap.get(r.productId) ?? '—'}</span> },
    { key: 'locationId', label: 'Location',  render: r => <span className="text-muted-foreground">{locationMap.get(r.locationId) ?? '—'}</span> },
    { key: 'quantityOnHand',   label: 'On Hand',   render: r => <span className="font-mono">{Number(r.quantityOnHand).toLocaleString()}</span> },
    { key: 'quantityReserved', label: 'Reserved',  render: r => <span className="font-mono text-muted-foreground">{Number(r.quantityReserved).toLocaleString()}</span> },
    {
      key: 'available', label: 'Available',
      render: r => <span className="font-mono font-medium">{(Number(r.quantityOnHand) - Number(r.quantityReserved)).toLocaleString()}</span>,
    },
    { key: 'averageCost', label: 'Avg Cost', render: r => r.averageCost != null ? `$${Number(r.averageCost).toFixed(2)}` : '—' },
    { key: 'status',      label: 'Status',   render: r => <StockStatusBadge item={r} /> },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.productId || !createForm.locationId) { toast.error('Product and location are required'); return; }
    createMutation.mutate(
      { productId: createForm.productId, locationId: createForm.locationId,
        reorderLevel: createForm.reorderLevel ? Number(createForm.reorderLevel) : undefined,
        maxStock:     createForm.maxStock     ? Number(createForm.maxStock)     : undefined,
        averageCost:  createForm.averageCost  ? Number(createForm.averageCost)  : undefined,
        binLocation:  createForm.binLocation  || undefined,
      } as Partial<InventoryItem>,
      {
        onSuccess: async (created) => {
          const qty = Number(createForm.initialQty);
          if (qty > 0 && created.id) {
            await opMutation.mutateAsync({
              op: 'add',
              body: {
                inventoryId: created.id, locationId: created.locationId, productId: created.productId,
                quantity: qty,
                unitCost: createForm.averageCost ? Number(createForm.averageCost) : undefined,
              },
            });
          }
          setCreateOpen(false);
          setCreateForm({ productId: '', locationId: '', initialQty: '', averageCost: '', reorderLevel: '', maxStock: '', binLocation: '' });
          void refetch();
        },
      },
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    updateMutation.mutate(
      { id: editItem.id, body: {
        reorderLevel: editForm.reorderLevel ? Number(editForm.reorderLevel) : undefined,
        maxStock:     editForm.maxStock     ? Number(editForm.maxStock)     : undefined,
        binLocation:  editForm.binLocation  || undefined,
      } as Partial<InventoryItem> },
      { onSuccess: () => { setEditItem(null); void refetch(); } },
    );
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, { onSuccess: () => { setDeleteItem(null); void refetch(); } });
  };

  const handleOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewItem) return;
    const qty = Number(opForm.quantity);
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity greater than 0'); return; }
    opMutation.mutate(
      {
        op: opForm.op,
        body: {
          inventoryId: viewItem.id, locationId: viewItem.locationId, productId: viewItem.productId,
          [activeOp.usesAbsolute ? 'absoluteQuantity' : 'quantity']: qty,
          ...(activeOp.showCost && opForm.unitCost ? { unitCost: Number(opForm.unitCost) } : {}),
          ...(opForm.notes ? { notes: opForm.notes } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(`${activeOp.label} recorded`);
          setOpForm({ op: 'add', quantity: '', unitCost: '', notes: '' });
          void refetch();
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <GuideModal
        open={guideOpen}
        onClose={() => { localStorage.setItem(GUIDE_KEY, '1'); setGuideOpen(false); }}
        title="Welcome to My Inventory"
        description="Track your products across every warehouse and store location — all in one place."
        steps={GUIDE_STEPS}
        tip="Set a Reorder Level when creating items — Low Stock alerts kick in automatically."
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Inventory</h1>
          <p className="text-sm text-muted-foreground">Track and manage stock across all locations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Open guide" onClick={() => setGuideOpen(true)}>
            <HelpCircle size={18} />
          </Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Add Item</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Package size={18}/>}       label="Total Items"  value={(searchData?.total ?? 0).toLocaleString()}     colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard icon={<AlertTriangle size={18}/>} label="Low Stock"    value={(lowStockItems?.length ?? 0).toLocaleString()} colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          onClick={() => setStatusFilter(f => f === 'low' ? 'all' : 'low')} active={statusFilter === 'low'} />
        <StatCard icon={<DollarSign size={18}/>}    label="Total Value"  value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorClass="bg-green-500/10 text-green-600 dark:text-green-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown label="Location" options={locationOptions} value={locationFilter || null}
          onChange={v => { setLocationFilter(v ?? ''); setPage(1); }} searchable />
        <FilterDropdown label="Status"
          options={[{ value: 'all', label: 'All items' }, { value: 'low', label: 'Low stock' }, { value: 'zero', label: 'Out of stock' }]}
          value={statusFilter}
          onChange={v => { setStatusFilter((v ?? 'all') as StatusFilter); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="flex-1">
        <DataTable
          title="" columns={columns} rows={tableData.items} total={tableData.total}
          page={page} loading={isLoading || (statusFilter === 'low' && lowLoading)}
          onPageChange={setPage}
          onSearchChange={s => { setSearch(s); setPage(1); }}
          onRefetch={() => void refetch()}
          onView={r => { setViewItem(r); setOpForm({ op: 'add', quantity: '', unitCost: '', notes: '' }); }}
          onEdit={r => { setEditItem(r); setEditForm({ reorderLevel: r.reorderLevel != null ? String(r.reorderLevel) : '', maxStock: r.maxStock != null ? String(r.maxStock) : '', binLocation: r.binLocation ?? '' }); }}
          onDelete={r => setDeleteItem(r)}
          isAdmin searchPlaceholder="Search by product…"
        />
      </div>

      {/* View / stock-op drawer */}
      {viewItem && (
        <FormDrawer open onClose={() => setViewItem(null)} width={500}
          title={productMap.get(viewItem.productId) ?? 'Inventory Item'}
          subtitle={`at ${locationMap.get(viewItem.locationId) ?? '—'}`}
        >
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <DetailRow label="On Hand"     value={Number(viewItem.quantityOnHand).toLocaleString()} />
            <DetailRow label="Reserved"    value={Number(viewItem.quantityReserved).toLocaleString()} />
            <DetailRow label="Available"   value={(Number(viewItem.quantityOnHand) - Number(viewItem.quantityReserved)).toLocaleString()} />
            <DetailRow label="Avg Cost"    value={viewItem.averageCost != null ? `$${Number(viewItem.averageCost).toFixed(2)}` : '—'} />
            {viewItem.productPackSize != null && (
              <>
                <DetailRow label="Packs on Hand" value={`${viewItem.packsOnHand ?? 0} packs`} />
                <DetailRow label="Loose Units"   value={`${viewItem.looseUnits ?? 0} units`} />
              </>
            )}
            <DetailRow label="Reorder Lvl" value={viewItem.reorderLevel != null ? String(viewItem.reorderLevel) : '—'} />
            <DetailRow label="Max Stock"   value={viewItem.maxStock != null ? String(viewItem.maxStock) : '—'} />
            <DetailRow label="Bin"         value={viewItem.binLocation ?? '—'} />
            <div className="flex items-end"><StockStatusBadge item={viewItem} /></div>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record an operation</p>
          <form onSubmit={handleOp} className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {OPS.map(op => (
                <button key={op.op} type="button"
                  onClick={() => setOpForm(f => ({ ...f, op: op.op, quantity: '', unitCost: '', notes: '' }))}
                  className={['flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[11px] font-medium transition-all',
                    opForm.op === op.op
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30 hover:bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  <span className={opForm.op === op.op ? 'text-primary' : op.iconColor}>{op.icon}</span>
                  <span className="leading-tight text-center">{op.label}</span>
                </button>
              ))}
            </div>
            <Field label={activeOp.usesAbsolute ? 'New absolute quantity (sets to this)' : 'Quantity'} required>
              <Input type="number" min="0" step="any" placeholder="e.g. 10"
                value={opForm.quantity} onChange={e => setOpForm(f => ({ ...f, quantity: e.target.value }))} />
            </Field>
            {activeOp.showCost && (
              <Field label="Unit cost (optional)">
                <Input type="number" min="0" step="any" placeholder="e.g. 12.50"
                  value={opForm.unitCost} onChange={e => setOpForm(f => ({ ...f, unitCost: e.target.value }))} />
              </Field>
            )}
            <Field label="Notes (optional)">
              <Input placeholder="Reason for this change…"
                value={opForm.notes} onChange={e => setOpForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            <Button type="submit" className="w-full" disabled={opMutation.isPending}>
              {opMutation.isPending ? 'Recording…' : `Record ${activeOp.label}`}
            </Button>
          </form>
        </FormDrawer>
      )}

      {/* Create drawer */}
      <FormDrawer open={createOpen} onClose={() => setCreateOpen(false)}
        title="Add Inventory Item" subtitle="Create a new product–location stock record"
        footer={
          <>
            <Button type="submit" form="inv-create-form" disabled={createMutation.isPending || opMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Add Item'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </>
        }
      >
        <form id="inv-create-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Product" required>
            <ResourceSelect resource={Products} getLabel={p => p.name ? `${p.name}${p.sku ? ` — ${p.sku}` : ''}` : p.id}
              value={createForm.productId} onValueChange={v => setCreateForm(f => ({ ...f, productId: v }))} />
          </Field>
          <Field label="Location" required>
            <ResourceSelect resource={Locations} getLabel={l => l.name ?? l.id}
              value={createForm.locationId} onValueChange={v => setCreateForm(f => ({ ...f, locationId: v }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Quantity" hint="Adds stock right after creation">
              <Input type="number" min="0" step="any" placeholder="0"
                value={createForm.initialQty} onChange={e => setCreateForm(f => ({ ...f, initialQty: e.target.value }))} />
            </Field>
            <Field label="Average Cost ($)">
              <Input type="number" min="0" step="any" placeholder="0.00"
                value={createForm.averageCost} onChange={e => setCreateForm(f => ({ ...f, averageCost: e.target.value }))} />
            </Field>
            <Field label="Reorder Level" hint="Low Stock alert triggers below this">
              <Input type="number" min="0" placeholder="e.g. 10"
                value={createForm.reorderLevel} onChange={e => setCreateForm(f => ({ ...f, reorderLevel: e.target.value }))} />
            </Field>
            <Field label="Max Stock">
              <Input type="number" min="0" placeholder="e.g. 500"
                value={createForm.maxStock} onChange={e => setCreateForm(f => ({ ...f, maxStock: e.target.value }))} />
            </Field>
          </div>
          <Field label="Bin Location">
            <Input placeholder="e.g. A1-03"
              value={createForm.binLocation} onChange={e => setCreateForm(f => ({ ...f, binLocation: e.target.value }))} />
          </Field>
        </form>
      </FormDrawer>

      {/* Edit drawer */}
      {editItem && (
        <FormDrawer open onClose={() => setEditItem(null)}
          title="Edit Inventory Item"
          subtitle={`${productMap.get(editItem.productId) ?? '—'} · ${locationMap.get(editItem.locationId) ?? '—'}`}
          footer={
            <>
              <Button type="submit" form="inv-edit-form" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            </>
          }
        >
          <form id="inv-edit-form" onSubmit={handleUpdate} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              To change quantities, use stock operations from the View panel. Here you can update thresholds and bin location.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reorder Level">
                <Input type="number" min="0" value={editForm.reorderLevel}
                  onChange={e => setEditForm(f => ({ ...f, reorderLevel: e.target.value }))} />
              </Field>
              <Field label="Max Stock">
                <Input type="number" min="0" value={editForm.maxStock}
                  onChange={e => setEditForm(f => ({ ...f, maxStock: e.target.value }))} />
              </Field>
            </div>
            <Field label="Bin Location">
              <Input placeholder="e.g. A1-03" value={editForm.binLocation}
                onChange={e => setEditForm(f => ({ ...f, binLocation: e.target.value }))} />
            </Field>
          </form>
        </FormDrawer>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={open => { if (!open) setDeleteItem(null); }}
        title="Delete inventory item?"
        description={`This permanently removes ${productMap.get(deleteItem?.productId ?? '') ?? 'this item'} at ${locationMap.get(deleteItem?.locationId ?? '') ?? '—'}. Stock movements linked to it cannot be deleted.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
