import { AlertCircle, Archive, Minus, PackagePlus, PauseCircle, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import type { SaleType } from "../../../types";
import type { CheckoutResult } from "../checkout";
import { fmt, lineTax, lineTotal, type BillLine, type ExtraCharge, type Mode } from "../posHelpers";
import { type StockInfo } from "../posStock";
import { StockBadge } from "./StockBadge";
import { StepList } from "./StepList";

export interface CartTableProps {
  mode: Mode;
  saleType: SaleType;
  getStockInfo: (productId: string) => StockInfo;
  lineOverStock: (line: BillLine) => boolean;
  hasStockIssues: boolean;
  lines: BillLine[];
  extraCharges: ExtraCharge[];
  onQtyChange: (lineId: number, qty: number) => void;
  onRateChange: (lineId: number, rate: number) => void;
  onRemoveLine: (id: number) => void;
  onRemoveCharge: (id: number) => void;
  onVoidBill: () => void;
  onHoldSale: () => void;
  holding: boolean;
  holdDisabled: boolean;
  onShowHeldSales: () => void;
  checkoutResult: CheckoutResult | null;
  showCheckoutFailureBanner: boolean;
  accentBadgeCls: string;
}

export function CartTable({
  mode,
  saleType,
  getStockInfo,
  lineOverStock,
  hasStockIssues,
  lines,
  extraCharges,
  onQtyChange,
  onRateChange,
  onRemoveLine,
  onRemoveCharge,
  onVoidBill,
  onHoldSale,
  holding,
  holdDisabled,
  onShowHeldSales,
  checkoutResult,
  showCheckoutFailureBanner,
  accentBadgeCls,
}: CartTableProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          {mode === "sales" ? (
            <ShoppingCart size={16} className="text-primary" />
          ) : (
            <PackagePlus size={16} className="text-orange-500" />
          )}
          <span className="font-semibold text-foreground">
            {mode === "sales" ? "Current Sale" : "Purchase Order Items"}
          </span>
          {lines.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${accentBadgeCls}`}>
              {lines.length} item{lines.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onVoidBill}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            <X size={13} /> Void
          </button>
          {mode === "sales" && (
            <>
              <button
                type="button"
                onClick={onHoldSale}
                disabled={holdDisabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PauseCircle size={13} /> {holding ? "Holding…" : "Hold"}
              </button>
              <button
                type="button"
                onClick={onShowHeldSales}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition"
              >
                <Archive size={13} /> Held Sales
              </button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-3">
            {mode === "sales" ? (
              <ShoppingCart size={40} strokeWidth={1.2} />
            ) : (
              <PackagePlus size={40} strokeWidth={1.2} />
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {mode === "sales"
                ? "Search or scan a product to start a sale"
                : "Search a product to add to the purchase order"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted border-b border-border z-10">
              <tr>
                {(saleType === "black"
                  ? ["#", "SKU", "Description", "Qty", "Official", "Charged", "Stock", "Tax", "Total", ""]
                  : ["#", "SKU", "Description", "Qty", "Rate", "Stock", "Tax", "Total", ""]
                ).map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => {
                const stock =
                  mode === "sales" || mode === "purchase"
                    ? getStockInfo(line.productId)
                    : null;
                const overStock = mode === "sales" && lineOverStock(line);
                return (
                <tr
                  key={line.id}
                  className={`hover:bg-muted/60 group ${overStock ? "bg-red-50/80 dark:bg-red-950/20" : ""}`}
                >
                  <td className="px-3 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                    {line.sku}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-foreground font-medium text-sm">{line.name}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onQtyChange(line.id, Math.max(mode === 'sales' ? 0.001 : 1, line.qty - 1))}
                        className="p-1 rounded hover:bg-muted text-muted-foreground transition"
                      >
                        <Minus size={11} />
                      </button>
                      {mode === 'sales' ? (
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={line.qty}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0) onQtyChange(line.id, v);
                          }}
                          className="w-14 text-center text-sm font-semibold text-foreground border border-border rounded px-1 py-0.5 outline-none focus:border-primary tabular-nums"
                        />
                      ) : (
                        <span className="w-6 text-center font-semibold text-foreground">
                          {line.qty}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onQtyChange(line.id, line.qty + 1)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground transition"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{line.unitLabel}</p>
                  </td>
                  {saleType === "black" ? (
                    <>
                      <td className="px-3 py-3 text-muted-foreground tabular-nums">
                        {fmt(line.officialRate)}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                          }}
                          className="w-24 text-sm px-2 py-1 border border-border rounded-lg outline-none focus:border-primary tabular-nums"
                        />
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.rate}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                        }}
                        className="w-24 text-sm px-2 py-1 border border-border rounded-lg outline-none focus:border-primary tabular-nums"
                      />
                    </td>
                  )}
                  {mode === "sales" && stock && (
                    <td className="px-3 py-3">
                      <StockBadge info={stock} saleType={saleType} />
                      {overStock && (
                        <p className="mt-1 text-[10px] font-medium text-red-600">
                          Need {line.qty}, only {stock.available} available
                        </p>
                      )}
                    </td>
                  )}
                  {mode === "purchase" && stock && (
                    <td className="px-3 py-3">
                      <StockBadge info={stock} saleType="normal" />
                    </td>
                  )}
                  <td className="px-3 py-3 text-muted-foreground text-xs">
                    {line.taxPct > 0 ? (
                      <span>
                        {line.taxPct}%{" "}
                        <span className="text-muted-foreground">({fmt(lineTax(line))})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-semibold text-foreground">
                    {fmt(lineTotal(line))}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground/50 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
              })}
              {extraCharges.map((ec) => (
                <tr key={ec.id} className="bg-muted/40">
                  <td />
                  <td />
                  <td className="px-3 py-2 text-xs text-muted-foreground italic">{ec.label}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td
                    className={`px-3 py-2 text-sm font-semibold ${ec.amount < 0 ? "text-red-600" : "text-foreground"}`}
                  >
                    {ec.amount < 0 ? "-" : "+"}
                    {fmt(Math.abs(ec.amount))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onRemoveCharge(ec.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground/50 hover:text-red-500 transition"
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mode === "sales" && hasStockIssues && lines.length > 0 && (
        <div className="border-t border-red-200 bg-red-50 px-5 py-2.5 flex-shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium text-red-800">
              Some lines exceed available stock — reduce quantities or remove items before completing.
            </p>
          </div>
        </div>
      )}

      {showCheckoutFailureBanner && checkoutResult && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 flex-shrink-0">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-800">
              Checkout did not complete — cart kept. Fix the failed steps:
            </p>
          </div>
          <StepList steps={checkoutResult.steps} />
        </div>
      )}
    </div>
  );
}
