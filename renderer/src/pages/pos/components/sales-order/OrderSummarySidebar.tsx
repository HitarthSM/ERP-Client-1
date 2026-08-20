import { Pencil, Printer, Share2, Truck } from "lucide-react";
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
  cashTendered: string;
  onCashTenderedChange: (v: string) => void;
  grandTotalWithBalance: number;
  saleType: SaleType;
  creditNeedsApproval: boolean;
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

export function OrderSummarySidebar({
  subtotal,
  totalTax,
  extraTotal,
  discountAmount,
  previousBalance,
  grandTotal,
  payMethod,
  cashTendered,
  onCashTenderedChange,
  grandTotalWithBalance,
  saleType,
  creditNeedsApproval,
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
  const taxRateLabel = subtotal > 0 && totalTax > 0 ? ` (${((totalTax / subtotal) * 100).toFixed(0)}%)` : "";

  return (
    <aside className="flex w-72 min-h-0 flex-shrink-0 flex-col border-l border-border bg-card">
      {/* Summary rows */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Order Summary</p>
        <SummaryRow label="Subtotal" value={fmt(subtotal)} />
        <SummaryRow label={`Tax${taxRateLabel}`} value={fmt(totalTax)} />
        {extraTotal !== 0 && (
          <SummaryRow label="Extra Charges" value={`${extraTotal < 0 ? "-" : "+"}${fmt(Math.abs(extraTotal))}`} />
        )}
        {discountAmount > 0 && (
          <SummaryRow
            label={
              <span className="flex items-center gap-1">
                Discount <Pencil size={9} className="text-muted-foreground" />
              </span>
            }
            value={`-${fmt(discountAmount)}`}
            valueClass="text-emerald-600"
          />
        )}
        {previousBalance > 0 && (
          <SummaryRow label="Prev. Balance" value={fmt(previousBalance)} valueClass="text-red-500" />
        )}

        <div className="border-t border-border pt-3 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Grand Total</p>
          <p className="text-4xl font-black tabular-nums text-primary leading-none mt-1">{fmt(grandTotalWithBalance)}</p>
          {previousBalance > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Includes balance ({fmt(previousBalance)})</p>
          )}
        </div>

        {payMethod === "cash" && grandTotal > 0 && (
          <div className="pt-2 space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cash Tendered</label>
            <input
              type="number"
              value={cashTendered}
              onChange={(e) => onCashTenderedChange(e.target.value)}
              placeholder="Amount received"
              className="w-full h-9 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            {cashTendered !== "" && !isNaN(Number(cashTendered)) && (
              <p className={`text-xs font-semibold ${Number(cashTendered) < grandTotal ? "text-destructive" : "text-emerald-600"}`}>
                {Number(cashTendered) < grandTotal
                  ? `Short by ${fmt(grandTotal - Number(cashTendered))}`
                  : `Change: ${fmt(Number(cashTendered) - grandTotal)}`}
              </p>
            )}
          </div>
        )}

        {saleType === "credit" && creditMissingCustomer && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1">⚠ Select a customer</p>
        )}
        {saleType === "credit" && creditMissingLimit && (
          <p className="text-xs font-medium text-destructive bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">⚠ No credit limit set</p>
        )}
        {hasStockIssues && (
          <p className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">⚠ Fix stock issues</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-border p-3 space-y-2">
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={generateDisabled}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-35 ${
            creditNeedsApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
          }`}
        >
          <Share2 size={15} />
          {checkingOut
            ? "Processing…"
            : creditNeedsApproval
              ? "Send for Approval"
              : hasDriver
                ? "Share to Driver"
                : "Complete Sale"}
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onPrintBill}
            disabled={!hasReceipt}
            className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
          >
            <Printer size={12} /> Print Bill
          </button>
          <button
            type="button"
            onClick={onDeliveryNote}
            disabled={!hasReceipt}
            className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
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
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
