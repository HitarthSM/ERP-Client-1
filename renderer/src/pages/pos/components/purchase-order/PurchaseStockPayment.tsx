import { Package } from "lucide-react";
import type { PosPayMethod } from "../../checkout";
import { fmt } from "../../posHelpers";

const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export interface PurchaseStockPaymentProps {
  stockNotes: string;
  onStockNotesChange: (v: string) => void;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  payMethod: PosPayMethod;
  onPayMethodChange: (m: PosPayMethod) => void;
  cashTendered: string;
  onCashTenderedChange: (v: string) => void;
  generateDisabled: boolean;
  checkingOut: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PurchaseStockPayment({
  stockNotes,
  onStockNotesChange,
  subtotal,
  totalTax,
  grandTotal,
  payMethod,
  onPayMethodChange,
  cashTendered,
  onCashTenderedChange,
  generateDisabled,
  checkingOut,
  onSubmit,
  onCancel,
}: PurchaseStockPaymentProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stock Information */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Package size={15} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Stock Information</h2>
        </div>
        <div className="px-4 py-4">
          <textarea
            value={stockNotes}
            onChange={(e) => onStockNotesChange(e.target.value)}
            placeholder="Enter transaction notes…"
            rows={6}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Payment Summary</h2>
        </div>
        <div className="px-4 py-4 space-y-3">
          <Row label="Subtotal" value={fmt(subtotal)} />
          {totalTax > 0 && <Row label="Tax" value={fmt(totalTax)} />}
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total Amount</span>
            <span className="text-lg font-bold tabular-nums text-primary">{fmt(grandTotal)}</span>
          </div>

          {/* Payment method */}
          <div className="pt-1 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => onPayMethodChange(e.target.value as PosPayMethod)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {PAY_METHODS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount Paid</label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => onCashTenderedChange(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-right text-sm tabular-nums outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
