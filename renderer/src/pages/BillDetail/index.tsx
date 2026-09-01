import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, ShoppingCart } from 'lucide-react';
import { ErrorState } from '../../components/errors/ErrorState';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Bills, Customers, Locations, Products } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { billToPosReceipt, downloadSaleDoc, printSaleDoc } from '../pos/billReceipt';
import type { BillStatus, PaymentMethod } from '../../types';

function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

const PAY_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'CREDIT'];

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgBrand = {
    orgName: user?.organization?.name,
    logoUrl: user?.organization?.logoUrl,
    orgMeta: user?.organization?.slug,
  };

  const { data: bill, isLoading, error, refetch } = Bills.useGet(id);
  const { data: locations = [] } = Locations.useList();
  const { data: products = [] } = Products.useList();
  const { data: linkedCustomer } = Customers.useGet(bill?.customerId ?? undefined);
  const transition = Bills.useTransitionStatus();
  const updateHeader = Bills.useUpdateHeader();
  const addItem = Bills.useAddItem();
  const removeItem = Bills.useRemoveItem();

  const [notes, setNotes] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [productSearch, setProductSearch] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: productResults } = Products.useSearch({
    page: 1,
    limit: 8,
    search: productSearch.trim() || undefined,
  });

  const locationName = useMemo(() => {
    if (!bill?.locationId) return '—';
    const loc = locations.find((l) => l.id === bill.locationId);
    return formatEntityLabel({
      name: loc ? (loc.type ? `${loc.name} (${loc.type})` : loc.name) : undefined,
      id: bill.locationId,
    });
  }, [bill?.locationId, locations]);

  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return m;
  }, [products]);

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (error || !bill) {
    return <ErrorState type="load" onRetry={() => void refetch()} />;
  }

  const status = bill.status as BillStatus;
  const isInitiated = status === 'INITIATED';
  const isDraft = status === 'DRAFT';
  const notesValue = notes ?? bill.notes ?? '';
  const items = bill.items ?? [];
  const busy = transition.isPending || updateHeader.isPending || addItem.isPending || removeItem.isPending;

  const party = (() => {
    if (bill.walkInName) return bill.walkInName;
    if (linkedCustomer?.name?.trim() || linkedCustomer?.phone?.trim()) {
      return formatEntityLabel({
        name: linkedCustomer.name,
        phone: linkedCustomer.phone,
        id: bill.customerId,
      });
    }
    if (bill.customerId) return `Customer ${truncateId(bill.customerId)}`;
    return '—';
  })();

  const runTransition = (next: BillStatus, paymentMethod?: PaymentMethod) => {
    if (!id) return;
    transition.mutate(
      { id, status: next, paymentMethod },
      { onSuccess: () => void refetch() },
    );
  };

  const saveNotes = () => {
    if (!id || !isInitiated) return;
    updateHeader.mutate(
      { id, body: { notes: notesValue || null } },
      { onSuccess: () => void refetch() },
    );
  };

  const handleAddItem = () => {
    if (!id || !isInitiated || !selectedProductId) return;
    const quantity = Number(qty);
    const price = Number(unitPrice);
    if (!quantity || quantity <= 0 || Number.isNaN(price) || price < 0) return;
    addItem.mutate(
      {
        id,
        body: {
          productId: selectedProductId,
          quantity,
          unitPrice: price,
          taxRate: Number(taxRate) || 0,
        },
      },
      {
        onSuccess: () => {
          setSelectedProductId('');
          setProductSearch('');
          setQty('1');
          setUnitPrice('');
          setTaxRate('0');
          void refetch();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/bills')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Bills
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bill {bill.billNumber || truncateId(bill.id)}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {status} · {party} · {locationName}
          </p>
          <p className="text-muted-foreground text-xs mt-1">ID: {bill.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button
              type="button"
              size="sm"
              onClick={() => navigate(`/pos/sales?resumeBillId=${bill.id}`)}
            >
              <ShoppingCart size={14} className="mr-1" /> Continue on New Sale
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const receipt = billToPosReceipt(bill, {
                ...orgBrand,
                locationName,
                partyLabel: party,
                productLabel: (productId) => productName.get(productId) ?? productId,
              });
              printSaleDoc(receipt);
            }}
          >
            <Printer size={14} className="mr-1" /> Print
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const receipt = billToPosReceipt(bill, {
                ...orgBrand,
                locationName,
                partyLabel: party,
                productLabel: (productId) => productName.get(productId) ?? productId,
              });
              void downloadSaleDoc(receipt);
            }}
          >
            <Download size={14} className="mr-1" /> Download
          </Button>
          {isInitiated && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => runTransition('DRAFT')}
              >
                Mark draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => runTransition('CANCELLED')}
              >
                Cancel bill
              </Button>
            </>
          )}
          {isDraft && (
            <>
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => runTransition('COMPLETED', payMethod)}
              >
                Complete & deduct stock
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => runTransition('CANCELLED')}
              >
                Cancel bill
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="text-lg font-semibold">{money(bill.subtotal)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Tax</p>
          <p className="text-lg font-semibold">{money(bill.taxAmount)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{money(bill.totalAmount)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Payment</p>
          <p className="text-lg font-semibold">{bill.paymentMethod || '—'}</p>
        </div>
      </div>

      {isInitiated && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="font-medium">Notes</h2>
          <Input
            value={notesValue}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={saveNotes}>
            Save notes
          </Button>
        </div>
      )}

      {!isInitiated && bill.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium mb-1">Notes</h2>
          <p className="text-sm text-muted-foreground">{bill.notes}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="font-medium">Line items</h2>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No line items yet. Add products below while status is INITIATED.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Price</th>
                  <th className="py-2 pr-2">Tax %</th>
                  <th className="py-2 pr-2">Line total</th>
                  {isInitiated && <th className="py-2"> </th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      {formatEntityLabel({
                        name: productName.get(item.productId),
                        id: item.productId,
                      })}
                    </td>
                    <td className="py-2 pr-2">{item.quantity}</td>
                    <td className="py-2 pr-2">{money(item.unitPrice)}</td>
                    <td className="py-2 pr-2">{item.taxRate}</td>
                    <td className="py-2 pr-2">{money(item.lineTotal)}</td>
                    {isInitiated && (
                      <td className="py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            id &&
                            removeItem.mutate(
                              { id, itemId: item.id },
                              { onSuccess: () => void refetch() },
                            )
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isInitiated && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Add item</p>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products…"
            />
            {(productResults?.items ?? []).length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {(productResults?.items ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      selectedProductId === p.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setProductSearch(
                        formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }),
                      );
                      if (p.retailPrice != null) setUnitPrice(String(p.retailPrice));
                    }}
                  >
                    {p.name || 'Unnamed'}{' '}
                    <span className="text-xs text-muted-foreground font-mono">
                      {p.sku || truncateId(p.id)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Qty"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Unit price"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="Tax %"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy || !selectedProductId}
              onClick={handleAddItem}
            >
              Add line
            </Button>
          </div>
        )}
      </div>

      {bill.billedAt && (
        <p className="text-xs text-muted-foreground">Billed at: {bill.billedAt}</p>
      )}
    </div>
  );
}
