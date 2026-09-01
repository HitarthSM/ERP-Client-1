import { LayoutDashboard, Printer, Truck } from "lucide-react";
import type { SaleType } from "../../../../types";
import type { PosPayMethod } from "../../checkout";
import { fmt } from "../../posHelpers";

export interface OrderSummarySidebarProps {
  subtotal: number;
  totalTax: number;
  extraTotal: number;
  discountAmount: number;
  previousBalance: number;
  grandTotal: number;
  payMethod: PosPayMethod;
  onPayMethodChange: (m: PosPayMethod) => void;
  cashTendered: string;
  onCashTenderedChange: (v: string) => void;
  grandTotalWithBalance: number;
  saleType: SaleType;
  creditNeedsApproval: boolean;
  creditOverLimitException?: boolean;
  creditMissingCustomer: boolean;
  creditMissingLimit: boolean;
  hasStockIssues: boolean;
  generateDisabled: boolean;
  checkingOut: boolean;
  onCompleteSale: () => void;
  onPrintBill: () => void;
  onDeliveryNote: () => void;
  onShareToDriver: () => void;
  hasReceipt: boolean;
  hasDriver: boolean;
}

const PAY_METHOD_LABELS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash Receipt" },
  { value: "bank", label: "Bill / Invoice" },
  { value: "mpesa", label: "M-Pesa / Bank" },
  { value: "other", label: "Other" },
];

export function OrderSummarySidebar({
  subtotal,
  totalTax,
  extraTotal,
  discountAmount,
  previousBalance,
  grandTotal,
  payMethod,
  onPayMethodChange,
  cashTendered,
  onCashTenderedChange,
  grandTotalWithBalance,
  saleType,
  creditNeedsApproval,
  creditOverLimitException,
  creditMissingCustomer,
  creditMissingLimit,
  hasStockIssues,
  generateDisabled,
  checkingOut,
  onCompleteSale,
  onPrintBill,
  onDeliveryNote,
  onShareToDriver,
  hasReceipt,
  hasDriver,
}: OrderSummarySidebarProps) {
  const taxRateLabel = subtotal > 0 && totalTax > 0 ? ` (VAT ${((totalTax / subtotal) * 100).toFixed(0)}%)` : "";
  const amountPaid = cashTendered !== "" && !isNaN(Number(cashTendered)) ? Number(cashTendered) : 0;
  const balanceDue = grandTotalWithBalance - amountPaid;

  return (
    <aside className="flex w-80 min-h-0 flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-muted/40 p-4">
      {/* Order Summary Card */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LayoutDashboard size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Order Summary</h2>
        </div>

        <div className="px-4 py-3 space-y-2.5">
          <SummaryRow label="Subtotal" value={fmt(subtotal)} />

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Total Discount</span>
            <div className="flex h-8 w-28 items-center rounded-lg border border-border bg-background px-3 text-right text-sm tabular-nums text-muted-foreground">
              {discountAmount > 0 ? (
                <span className="text-emerald-600 font-medium w-full text-right">{fmt(discountAmount)}</span>
              ) : (
                <span className="w-full text-right">0.00</span>
              )}
            </div>
          </div>

          {extraTotal !== 0 && (
            <SummaryRow label="Extra Charges" value={`${extraTotal < 0 ? "-" : "+"}${fmt(Math.abs(extraTotal))}`} />
          )}

          <SummaryRow label={`Tax${taxRateLabel}`} value={fmt(totalTax)} />

          {previousBalance > 0 && (
            <SummaryRow label="Prev. Balance" value={fmt(previousBalance)} valueClass="text-red-500" />
          )}

          <div className="border-t border-border pt-2.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total Amount</span>
            <span className="text-lg font-bold tabular-nums text-primary">{fmt(grandTotalWithBalance)}</span>
          </div>
        </div>

        {/* Status notices */}
        <div className="px-4 pb-3 space-y-1.5">
          {saleType === "credit" && creditNeedsApproval && (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5">Needs approval — over credit limit</p>
          )}
          {saleType === "credit" && creditOverLimitException && (
            <p className="text-xs font-medium text-sky-800 bg-sky-50 dark:bg-sky-950/30 rounded-lg px-3 py-1.5">Over limit — skip-approval exception is on</p>
          )}
          {saleType === "credit" && creditMissingCustomer && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5">⚠ Select a customer</p>
          )}
          {saleType === "credit" && creditMissingLimit && (
            <p className="text-xs font-medium text-destructive bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-1.5">⚠ No credit limit set</p>
          )}
          {hasStockIssues && (
            <p className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-1.5">⚠ Fix stock issues</p>
          )}
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LayoutDashboard size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Payment Details</h2>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Payment Method */}
          <div className="space-y-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => onPayMethodChange(e.target.value as PosPayMethod)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {PAY_METHOD_LABELS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount Received</label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => onCashTenderedChange(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-right text-sm tabular-nums outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="border-t border-border pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="tabular-nums font-medium">{fmt(amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Balance Due</span>
              <span className={`tabular-nums font-bold text-base ${balanceDue > 0 ? "text-red-500" : "text-emerald-600"}`}>
                {fmt(Math.max(0, balanceDue))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={generateDisabled}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-35 ${
            creditNeedsApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
          }`}
        >
          {checkingOut
            ? "Processing…"
            : creditNeedsApproval
              ? "Send for Approval"
              : hasDriver
                ? "Share to Driver"
                : "Complete Transaction"}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPrintBill}
            disabled={!hasReceipt}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
          >
            <Printer size={12} /> Print Bill
          </button>
          <button
            type="button"
            onClick={onDeliveryNote}
            disabled={!hasReceipt}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
          >
            <Truck size={12} /> Delivery Note
          </button>
        </div>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "",
}: {
  label: React.ReactNode;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
