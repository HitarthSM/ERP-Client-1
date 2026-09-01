import { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, PackageCheck, Send } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { cn } from '../../lib/utils';
import { Locations, Products, StockTransferRequests } from '../../api';
import type { StockTransferRequest } from '../../types';

type Tab = 'my-requests' | 'open-requests';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  CLAIMED: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  OPEN: <AlertCircle size={11} />,
  ACCEPTED: <Clock size={11} />,
  CLAIMED: <PackageCheck size={11} />,
  COMPLETED: <CheckCircle2 size={11} />,
  CANCELLED: <XCircle size={11} />,
};

function RequestStatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase();
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[key] ?? 'bg-muted text-muted-foreground')}>
      {STATUS_ICONS[key]}
      {key.charAt(0) + key.slice(1).toLowerCase()}
    </span>
  );
}

export default function StockRequestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('my-requests');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseProductId, setRaiseProductId] = useState('');
  const [raiseQty, setRaiseQty] = useState('');

  const { data: locations } = Locations.useList();
  const { data: products } = Products.useList();

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations ?? []) map.set(loc.id, loc.name);
    return map;
  }, [locations]);

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const prod of products ?? []) map.set(prod.id, prod.name ?? prod.id);
    return map;
  }, [products]);

  const {
    data: myRequests,
    isLoading: myLoading,
    isError: myError,
    refetch: refetchMine,
  } = StockTransferRequests.useListMine(selectedLocationId || undefined);

  const {
    data: openRequests,
    isLoading: openLoading,
    isError: openError,
    refetch: refetchOpen,
  } = StockTransferRequests.useListOpen(selectedLocationId || undefined);

  const raiseMutation = StockTransferRequests.useRaise();
  const acceptMutation = StockTransferRequests.useAccept();
  const claimMutation = StockTransferRequests.useClaim();
  const cancelMutation = StockTransferRequests.useCancel();

  const handleCloseRaise = () => {
    setRaiseOpen(false);
    setTimeout(() => {
      setRaiseProductId('');
      setRaiseQty('');
    }, 300);
  };

  const handleRaiseSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedLocationId || !raiseProductId || !raiseQty) return;
    const qty = Number(raiseQty);
    if (qty <= 0) return;
    raiseMutation.mutate(
      { requestingLocationId: selectedLocationId, productId: raiseProductId, quantityRequested: qty },
      { onSuccess: handleCloseRaise },
    );
  };

  const myColumns: Column<StockTransferRequest>[] = [
    { key: 'product', label: 'Product', render: (row) => productMap.get(row.productId) ?? row.productId },
    { key: 'qty', label: 'Qty', render: (row) => String(row.quantityRequested) },
    { key: 'status', label: 'Status', render: (row) => <RequestStatusBadge status={row.status} /> },
    {
      key: 'acceptedBy',
      label: 'Accepted By',
      render: (row) => row.acceptedByLocationId ? locationMap.get(row.acceptedByLocationId) ?? row.acceptedByLocationId : '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => {
        const status = row.status.toUpperCase();
        return (
          <div className="flex gap-2 justify-end">
            {status === 'ACCEPTED' && (
              <Button
                size="sm"
                variant="outline"
                disabled={claimMutation.isPending}
                onClick={() => claimMutation.mutate(row.id)}
              >
                <PackageCheck size={13} className="mr-1" />
                Mark Received
              </Button>
            )}
            {status === 'OPEN' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(row.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const openColumns: Column<StockTransferRequest>[] = [
    { key: 'from', label: 'Requesting Store', render: (row) => locationMap.get(row.requestingLocationId) ?? row.requestingLocationId },
    { key: 'product', label: 'Product', render: (row) => productMap.get(row.productId) ?? row.productId },
    { key: 'qty', label: 'Qty Needed', render: (row) => String(row.quantityRequested) },
    {
      key: 'stock',
      label: 'Your Stock',
      render: (row) =>
        row.availableStock !== undefined ? (
          <span className={cn('font-medium', row.canFulfill ? 'text-green-600' : 'text-destructive')}>
            {row.availableStock}
          </span>
        ) : '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex justify-end">
          {row.canFulfill ? (
            <Button
              size="sm"
              disabled={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate({ id: row.id, acceptingLocationId: selectedLocationId })}
            >
              Accept
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Insufficient stock</span>
          )}
        </div>
      ),
    },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'my-requests', label: 'My Requests' },
    { id: 'open-requests', label: 'Open Requests' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stock Requests</h1>
          <p className="text-sm text-muted-foreground">Request stock from other stores in your organization</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select your store..." />
            </SelectTrigger>
            <SelectContent>
              {(locations ?? []).map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  activeTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedLocationId && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Select a store above to view requests.
        </div>
      )}

      {selectedLocationId && (
        <div key={activeTab} className="flex flex-1 flex-col animate-in fade-in duration-200">
          {activeTab === 'my-requests' && (
            <DataTable
              title="My Requests"
              description="Stock requests raised by your selected store."
              columns={myColumns}
              rows={myRequests ?? []}
              total={myRequests?.length ?? 0}
              page={1}
              loading={myLoading}
              error={myError ? 'Failed to load requests' : null}
              onPageChange={() => undefined}
              onRefetch={refetchMine}
              toolbar={
                <Button size="sm" onClick={() => setRaiseOpen(true)}>
                  <Send size={14} className="mr-1.5" /> Raise Request
                </Button>
              }
            />
          )}

          {activeTab === 'open-requests' && (
            <DataTable
              title="Open Requests"
              description="Open stock requests from other stores. Accept if your store can fulfil."
              columns={openColumns}
              rows={openRequests ?? []}
              total={openRequests?.length ?? 0}
              page={1}
              loading={openLoading}
              error={openError ? 'Failed to load open requests' : null}
              onPageChange={() => undefined}
              onRefetch={refetchOpen}
            />
          )}
        </div>
      )}

      <FormDrawer
        open={raiseOpen}
        onClose={handleCloseRaise}
        title="Raise Stock Request"
        width={440}
        footer={
          <>
            <Button
              type="submit"
              form="raise-form"
              disabled={raiseMutation.isPending}
            >
              {raiseMutation.isPending ? 'Raising...' : 'Raise Request'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseRaise}>Cancel</Button>
          </>
        }
      >
        <form id="raise-form" onSubmit={handleRaiseSubmit} className="space-y-4">
          <Field label="Requesting Store" required>
            <p className="text-sm font-medium text-foreground px-3 py-2 rounded-md bg-muted">
              {locationMap.get(selectedLocationId) ?? selectedLocationId}
            </p>
          </Field>

          <Field label="Product" required>
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name ?? 'Unknown'}
              value={raiseProductId}
              onValueChange={setRaiseProductId}
              placeholder="Search products..."
            />
          </Field>

          <Field label="Quantity Needed" required>
            <Input
              type="number"
              min="1"
              step="1"
              value={raiseQty}
              onChange={(ev) => setRaiseQty(ev.target.value)}
              placeholder="0"
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
