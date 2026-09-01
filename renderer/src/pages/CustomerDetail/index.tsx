import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Customers } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { fmt } from '../pos/posHelpers';
import type { Bill, CreditStatus, CustomerCreditTransaction } from '../../types';
import { buildCreditorStatement } from '../Creditors/statement';

function pagedItems<T>(data: unknown): T[] {
  if (!data || typeof data !== 'object') return [];
  const row = data as Record<string, unknown>;
  const list = row.items ?? row['items'];
  return Array.isArray(list) ? (list as T[]) : [];
}

function pagedTotalPages(data: unknown): number {
  if (!data || typeof data !== 'object') return 1;
  const n = Number((data as Record<string, unknown>).totalPages ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function creditStatusColor(s?: CreditStatus) {
  if (s === 'over') return 'text-red-600 bg-red-50 border-red-200';
  if (s === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (s === 'available') return 'text-green-700 bg-green-50 border-green-200';
  return 'text-muted-foreground bg-muted border-border';
}

function creditStatusLabel(s?: CreditStatus) {
  if (s === 'over') return 'Over limit';
  if (s === 'warning') return 'Nearing limit';
  if (s === 'available') return 'Credit available';
  return 'No credit limit';
}

function CreditDot({ status }: { status?: CreditStatus }) {
  const colors: Record<string, string> = {
    over: 'bg-red-500',
    warning: 'bg-amber-500',
    available: 'bg-green-500',
    none: 'bg-muted-foreground/40',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status ?? 'none']}`}
      title={creditStatusLabel(status)}
    />
  );
}

export interface CustomerDetailContentProps {
  customerId: string;
  onCreditUpdated?: () => void;
}

export function CustomerDetailContent({ customerId, onCreditUpdated }: CustomerDetailContentProps) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdminOrManager = ['org_admin', 'org_manager', 'super_admin', 'store_manager'].some((r) => roles.includes(r));

  const { data: customer, isLoading, refetch: refetchCustomer } = Customers.useGet(customerId);
  const recordTx = Customers.useRecordCreditTransaction(customerId);

  const [activeTab, setActiveTab] = useState<'bills' | 'statement' | 'transactions'>('bills');
  const [billsPage, setBillsPage] = useState(1);
  const [txPage, setTxPage] = useState(1);

  const { data: billsData, isLoading: billsLoading } = Customers.useGetBills(customerId, billsPage);
  const { data: txData, isLoading: txLoading } = Customers.useGetCreditTransactions(customerId, txPage);
  const { data: statementBills, isLoading: statementBillsLoading } = Customers.useGetBills(
    customerId,
    1,
    100,
    activeTab === 'statement',
  );
  const { data: statementTx, isLoading: statementTxLoading } = Customers.useGetCreditTransactions(
    customerId,
    1,
    100,
    activeTab === 'statement',
  );
  const statementRows = useMemo(
    () => buildCreditorStatement(pagedItems<Bill>(statementBills), pagedItems<CustomerCreditTransaction>(statementTx)),
    [statementBills, statementTx],
  );

  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('Cash paid outside system');
  const [adjNote, setAdjNote] = useState('');

  async function handlePayment() {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount > 0');
      return;
    }
    if (!payMethod) {
      toast.error('Select a payment method');
      return;
    }
    await recordTx.mutateAsync({
      type: 'payment',
      amount: amt,
      paymentMethod: payMethod,
      note: payNote || undefined,
    });
    toast.success('Payment recorded');
    setPayAmount('');
    setPayNote('');
    setShowPayment(false);
    refetchCustomer();
    onCreditUpdated?.();
  }

  async function handleAdjustment() {
    const amt = parseFloat(adjAmount);
    if (isNaN(amt)) {
      toast.error('Enter a valid amount');
      return;
    }
    const note = adjReason === 'Other' ? adjNote : adjReason + (adjNote ? ` — ${adjNote}` : '');
    if (adjReason === 'Other' && !adjNote.trim()) {
      toast.error('Enter a note for Other reason');
      return;
    }
    await recordTx.mutateAsync({ type: 'adjustment', amount: amt, note });
    toast.success('Credit adjusted');
    setAdjAmount('');
    setAdjNote('');
    setShowAdjust(false);
    refetchCustomer();
    onCreditUpdated?.();
  }

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading customer…</div>;
  if (!customer) return <div className="p-6 text-muted-foreground text-sm">Customer not found.</div>;

  const creditBalance = customer.creditBalance ?? 0;
  const creditLimit = customer.creditLimit ?? 0;
  const available = creditLimit > 0 ? Math.max(0, creditLimit - creditBalance) : 0;
  const bills = pagedItems<Bill>(billsData);
  const txs = pagedItems<CustomerCreditTransaction>(txData);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-0">
      <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {(customer.name ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{customer.name || 'Unnamed'}</p>
              {customer.customerType && (
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {String(customer.customerType).replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <CreditDot status={customer.creditStatus} />
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
            {customer.shopName && <p>{customer.shopName}</p>}
            {customer.phone && <p>📞 {customer.phone}</p>}
            {customer.email && <p>✉ {customer.email}</p>}
            {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
            {customer.address && <p>{customer.address}</p>}
            {customer.pinCode && <p>PIN: {customer.pinCode}</p>}
            {customer.discountPercent != null && customer.discountPercent > 0 && (
              <p>Discount: {customer.discountPercent}%</p>
            )}
          </div>
        </div>

        {creditLimit > 0 && (
          <div className={`rounded-xl border p-4 space-y-2 ${creditStatusColor(customer.creditStatus)}`}>
            <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard size={13} /> Credit Account
            </p>
            <div className="space-y-1 text-xs">
              {[['Limit', fmt(creditLimit)], ['Balance (owed)', fmt(creditBalance)], ['Available', fmt(available)]].map(
                ([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="opacity-70">{k}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </div>
                ),
              )}
              {customer.skipOverLimitApproval && (
                <p className="text-[10px] pt-1 font-medium opacity-70">Skip over-limit approval: on</p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              setShowPayment((v) => !v);
              setShowAdjust(false);
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showPayment ? '− Hide payment form' : '+ Record Payment'}
          </button>
          {showPayment && (
            <div className="space-y-2 pt-1">
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount received"
                min={0}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
              />
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Note (optional, e.g. cheque no.)"
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
              />
              <button
                type="button"
                onClick={handlePayment}
                disabled={recordTx.isPending}
                className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50"
              >
                {recordTx.isPending ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          )}
        </div>

        {isAdminOrManager && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setShowAdjust((v) => !v);
                setShowPayment(false);
              }}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              {showAdjust ? '− Hide adjustment form' : '± Adjust Credit'}
            </button>
            {showAdjust && (
              <div className="space-y-2 pt-1">
                <input
                  type="number"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="Amount (negative to reduce)"
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
                />
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
                >
                  <option>Cash paid outside system</option>
                  <option>Correction</option>
                  <option>Goodwill credit</option>
                  <option>Write-off</option>
                  <option>Other</option>
                </select>
                {adjReason === 'Other' && (
                  <input
                    type="text"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder="Required note"
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary bg-background"
                  />
                )}
                <button
                  type="button"
                  onClick={handleAdjustment}
                  disabled={recordTx.isPending}
                  className="w-full py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {recordTx.isPending ? 'Saving…' : 'Save Adjustment'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex gap-1 border-b border-border mb-4">
          {(['bills', 'statement', 'transactions'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'bills' ? 'Bills' : tab === 'statement' ? 'Statement' : 'Credit Transactions'}
            </button>
          ))}
        </div>

        {activeTab === 'bills' && (
          <div className="space-y-3">
            {billsLoading ? (
              <p className="text-xs text-muted-foreground">Loading bills…</p>
            ) : bills.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bills found.</p>
            ) : (
              <>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {['Date', 'Bill #', 'Type', 'Total', 'Status'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id} className="border-t border-border hover:bg-muted/30 transition">
                          <td className="px-3 py-2 text-muted-foreground">
                            {bill.billedAt
                              ? new Date(bill.billedAt).toLocaleDateString()
                              : new Date(bill.createdAt ?? '').toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            <Link to={`/bills/${bill.id}`} className="font-medium text-primary hover:underline">
                              {bill.billNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
                              {bill.saleType ?? 'normal'}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums font-medium">{fmt(bill.totalAmount)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                bill.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : bill.status === 'DRAFT'
                                    ? 'bg-amber-100 text-amber-700'
                                    : bill.status === 'CANCELLED'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={billsPage} totalPages={pagedTotalPages(billsData)} onChange={setBillsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'statement' && (
          <div className="space-y-3">
            {statementBillsLoading || statementTxLoading ? (
              <p className="text-xs text-muted-foreground">Loading statement…</p>
            ) : statementRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No credit sales or payments yet.</p>
            ) : (
              <>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {['Date', 'Type', 'Receipt #', 'Method', 'Amount'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statementRows.map((row, i) => (
                        <tr key={`${row.kind}-${row.date}-${i}`} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                row.kind === 'payment' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {row.kind === 'payment' ? 'Payment' : 'Credit sale'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {row.kind === 'receipt' ? (
                              <Link to={`/bills/${row.billId}`} className="font-medium text-primary hover:underline">
                                {row.receiptNumber}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground capitalize">
                            {row.kind === 'payment'
                              ? row.method === 'bank_transfer'
                                ? 'Bank'
                                : row.method.replace(/_/g, ' ')
                              : '—'}
                          </td>
                          <td
                            className={`px-3 py-2 tabular-nums font-semibold ${
                              row.kind === 'payment' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {row.kind === 'payment' ? '-' : '+'}
                            {fmt(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">First 100 bills and payments only.</p>
              </>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {txLoading ? (
              <p className="text-xs text-muted-foreground">Loading transactions…</p>
            ) : txs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No credit transactions found.</p>
            ) : (
              <>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {['Date', 'Type', 'Method', 'Amount', 'Balance After', 'Note'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((tx) => (
                        <tr key={tx.id} className="border-t border-border hover:bg-muted/30 transition">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                tx.type === 'payment'
                                  ? 'bg-green-100 text-green-700'
                                  : tx.type === 'adjustment'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {tx.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground capitalize">
                            {tx.paymentMethod?.replace('_', ' ') ?? '—'}
                          </td>
                          <td
                            className={`px-3 py-2 tabular-nums font-semibold ${
                              tx.type === 'payment' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.type === 'payment' ? '-' : '+'}
                            {fmt(tx.amount)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmt(tx.balanceAfter)}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate" title={tx.note ?? ''}>
                            {tx.note ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={txPage} totalPages={pagedTotalPages(txData)} onChange={setTxPage} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-40">
        <ChevronLeft size={14} />
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="disabled:opacity-40">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Link to="/customers" className="text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-semibold text-base">Customer Detail</h1>
      </div>
      {id && <CustomerDetailContent customerId={id} />}
    </div>
  );
}
