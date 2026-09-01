import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ResourceSelect } from '../../components/ResourceSelect';
import { RecentIdPicker } from '../../components/RecentIdPicker';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormSelect } from '../../components/FormSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  ItemReturns,
  Suppliers,
  Locations,
  Products,
  Inventory,
  useStockOperation,
} from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { RECENT_NS, useRecentIds } from '../../lib/recentIds';
import type { ItemReturn } from '../../types';

const RETURN_TYPE_OPTIONS = ['sales', 'purchase'] as const;

interface FormState {
  returnType: string;
  locationId: string;
  supplierId: string;
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  returnType: 'purchase',
  locationId: '',
  supplierId: '',
  orderId: '',
  totalAmount: '',
  status: '',
};

interface RestockForm {
  inventoryId: string;
  locationId: string;
  productId: string;
  quantity: string;
  unitCost: string;
}

const EMPTY_RESTOCK: RestockForm = { inventoryId: '', locationId: '', productId: '', quantity: '', unitCost: '' };

export default function ItemReturnsPage() {
  const recentOrders = useRecentIds(RECENT_NS.orders);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ItemReturn | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItemReturn | null>(null);
  const [viewRow, setViewRow] = useState<ItemReturn | null>(null);
  const [restockTarget, setRestockTarget] = useState<ItemReturn | null>(null);
  const [restockForm, setRestockForm] = useState<RestockForm>(EMPTY_RESTOCK);

  const updateMutation = ItemReturns.useUpdate();
  const removeMutation = ItemReturns.useDelete();
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const { page, setPage } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (storeFilter) next.locationId = storeFilter;
    if (statusFilter !== 'ALL') next.status = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [storeFilter, statusFilter]);

  const { data, isLoading, error, refetch } = ItemReturns.useSearch({ page, filters });

  const { data: suppliers } = Suppliers.useList();
  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const locationLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    return m;
  }, [locations]);
  const supplierName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of suppliers ?? []) m.set(s.id, formatEntityLabel({ name: s.name, id: s.id }));
    return m;
  }, [suppliers]);
  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    return m;
  }, [products]);
  const orderLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of recentOrders.entries) {
      const label = e.label?.trim();
      if (label) m.set(e.id, label);
    }
    return m;
  }, [recentOrders.entries]);

  // A sales return puts stock back on the shelf (add); a purchase return sends stock back
  // to the supplier (remove). core-apis has no line-items endpoint for returns (ReturnItemEntity
  // exists in the schema but nothing exposes it via the API), so quantity/product/location can't
  // be auto-derived here — this just pre-selects the right operation and tags the movement back
  // to the return via referenceId/referenceType.
  const stockOp = useStockOperation();

  const openRestock = (row: ItemReturn) => {
    setRestockTarget(row);
    setRestockForm(EMPTY_RESTOCK);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.inventoryId || !restockForm.locationId || !restockForm.productId || !restockForm.quantity) {
      toast.error('Inventory, location, product, and quantity are required');
      return;
    }
    if (!restockTarget) return;
    const op = restockTarget.returnType === 'purchase' ? 'remove' : 'add';
    stockOp.mutate(
      {
        op,
        body: {
          inventoryId: restockForm.inventoryId,
          locationId: restockForm.locationId,
          productId: restockForm.productId,
          quantity: Number(restockForm.quantity),
          unitCost: restockForm.unitCost ? Number(restockForm.unitCost) : undefined,
          referenceId: restockTarget.id,
          referenceType: 'item_return',
          notes: `${restockTarget.returnType} return ${truncateId(restockTarget.id)}`,
        },
      },
      {
        onSuccess: () => {
          toast.success('Stock movement recorded for this return');
          setRestockTarget(null);
          setRestockForm(EMPTY_RESTOCK);
        },
        onError: (error: Error) => toast.error(error.message || 'Restock failed'),
      },
    );
  };

  const closeDrawer = () => setDrawerOpen(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: ItemReturn) => {
    setEditing(row);
    setForm({
      returnType: row.returnType ?? 'purchase',
      locationId: row.locationId ?? '',
      supplierId: row.supplierId ?? '',
      orderId: row.orderId ?? '',
      totalAmount: row.totalAmount != null ? String(row.totalAmount) : '',
      status: row.status ?? '',
    });
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) {
      toast.error('Create blocked — CreateItemReturnRequest has no @AutoMap in Core API (#0e)');
      return;
    }
    if (!form.locationId) {
      toast.error('Location is required');
      return;
    }
    const body: Partial<ItemReturn> = {
      returnType: form.returnType as ItemReturn['returnType'],
      locationId: form.locationId || undefined,
      supplierId: form.supplierId || undefined,
      orderId: form.returnType === 'sales' ? form.orderId || undefined : undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      status: form.status || undefined,
    };
    updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
  };

  const columns: Column<ItemReturn>[] = [
    { key: 'id', label: 'ID', render: (row) => truncateId(row.id) },
    { key: 'returnType', label: 'Type' },
    {
      key: 'locationId',
      label: 'Location',
      render: (row) =>
        row.locationId ? locationLookup.get(row.locationId) ?? formatEntityLabel({ id: row.locationId }) : '—',
    },
    {
      key: 'supplierId',
      label: 'Supplier',
      render: (row) =>
        row.supplierId
          ? supplierName.get(row.supplierId) ?? formatEntityLabel({ id: row.supplierId })
          : '—',
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => `$${Number(row.totalAmount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
    {
      key: 'restock',
      label: 'Stock',
      render: (row) => (
        <Button type="button" variant="outline" size="sm" onClick={() => openRestock(row)}>
          Restock
        </Button>
      ),
    },
  ];

  const isSaving = updateMutation.isPending;

  const viewData = viewRow
    ? ({
        ...viewRow,
        locationId: viewRow.locationId
          ? locationLookup.get(viewRow.locationId) ?? formatEntityLabel({ id: viewRow.locationId })
          : '—',
        supplierId: viewRow.supplierId
          ? supplierName.get(viewRow.supplierId) ?? formatEntityLabel({ id: viewRow.supplierId })
          : '—',
        orderId: viewRow.orderId
          ? orderLabel.get(viewRow.orderId) ?? formatEntityLabel({ id: viewRow.orderId })
          : '—',
      } as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Create blocked — verified: <code className="text-[10px]">CreateItemReturnRequest</code> has no{' '}
        <code className="text-[10px]">@AutoMap</code>, so the command arrives empty (#0e). List/update/restock
        still available for existing rows.
      </div>
      <p className="text-xs text-muted-foreground">
        API gap: returns have no free-text search — filter by location and status only.
      </p>
      <DataTable
        title="Returns"
        description="Browse returns. Create needs a Core API @AutoMap fix."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
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
            <span className="ml-2 text-xs text-muted-foreground">Location:</span>
            <FormSelect
              className="h-8 w-[200px] py-1.5"
              value={storeFilter}
              onChange={(v) => {
                setStoreFilter(v);
                setPage(1);
              }}
              placeholder="All locations"
              options={[
                { value: '', label: 'All locations' },
                ...(locations ?? []).map((l) => ({
                  value: l.id,
                  label: l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }),
                })),
              ]}
            />
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Process Return"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Item Return"
        data={viewData}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Item Return' : 'Add Item Return'}
        footer={
          <>
            <Button type="submit" form="item-return-form" disabled={!editing || isSaving}>
              {editing ? (isSaving ? 'Saving…' : 'Save') : 'Create (blocked — Core API #0e)'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="item-return-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Return Type">
            <Select value={form.returnType} onValueChange={(v) => setForm({ ...form, returnType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(l) => l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id })}
              value={form.locationId}
              onValueChange={(v) => setForm({ ...form, locationId: v })}
              placeholder="Select location…"
            />
          </Field>
          {form.returnType === 'purchase' && (
            <Field label="Supplier">
              <ResourceSelect
                resource={Suppliers}
                getLabel={(s) => formatEntityLabel({ name: s.name, id: s.id })}
                value={form.supplierId}
                onValueChange={(v) => setForm({ ...form, supplierId: v })}
                placeholder="Select supplier…"
                allowNone
              />
            </Field>
          )}
          {form.returnType === 'sales' && (
            <Field label="Order">
              <RecentIdPicker
                namespace={RECENT_NS.orders}
                value={form.orderId}
                onSelect={(id) => setForm({ ...form, orderId: id })}
                emptyHint="No recent sales orders. Open Sales Orders first — no order directory API."
              />
              <p className="mt-2 text-xs text-muted-foreground">or enter an ID</p>
              <Input
                className="mt-1"
                placeholder="Paste order ID (optional)"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </Field>
          )}
          <Field label="Total Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        title={`Restock — ${restockTarget?.returnType === 'purchase' ? 'remove from' : 'add to'} inventory`}
        footer={
          <>
            <Button type="submit" form="return-restock-form" disabled={stockOp.isPending}>
              {stockOp.isPending ? 'Recording…' : 'Record movement'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRestockTarget(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="return-restock-form" onSubmit={handleRestockSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {restockTarget?.returnType === 'purchase'
              ? 'Purchase return: removes stock (sent back to supplier).'
              : 'Sales return: adds stock (back on the shelf).'}{' '}
            Returns have no line items in the API today, so pick the product/location manually.
          </p>
          <Field label="Location" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(l) =>
                l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id })
              }
              value={restockForm.locationId}
              onValueChange={(locationId) => setRestockForm({ ...restockForm, locationId })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              resource={Products}
              getLabel={(p) => formatEntityLabel({ name: p.name, sku: p.sku, id: p.id })}
              value={restockForm.productId}
              onValueChange={(productId) => setRestockForm({ ...restockForm, productId })}
            />
          </Field>
          <Field label="Inventory record" required>
            <ResourceSelect
              resource={Inventory}
              getLabel={(i) =>
                `${productName.get(i.productId) ?? formatEntityLabel({ id: i.productId })} @ ${
                  locationLookup.get(i.locationId) ?? formatEntityLabel({ id: i.locationId })
                }`
              }
              value={restockForm.inventoryId}
              onValueChange={(inventoryId) => setRestockForm({ ...restockForm, inventoryId })}
            />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="any"
              value={restockForm.quantity}
              onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
              required
            />
          </Field>
          <Field label="Unit cost">
            <Input
              type="number"
              min="0"
              step="any"
              value={restockForm.unitCost}
              onChange={(e) => setRestockForm({ ...restockForm, unitCost: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Item Return"
        description="Delete this return record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
