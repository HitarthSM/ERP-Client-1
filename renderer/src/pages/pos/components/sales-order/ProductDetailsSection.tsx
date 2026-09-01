import type { RefObject } from "react";
import { AlertCircle, LayoutList, Minus, Plus, Scan, Trash2 } from "lucide-react";
import type { Product, SaleType } from "../../../../types";
import type { CheckoutResult } from "../../checkout";
import { fmt, lineTotal, type BillLine, type ExtraCharge } from "../../posHelpers";
import type { StockInfo } from "../../posStock";
import { StockBadge } from "../StockBadge";
import { StepList } from "../StepList";

export interface ProductDetailsSectionProps {
  saleType: SaleType;
  searchRef: RefObject<HTMLInputElement | null>;
  searchVal: string;
  onSearchChange: (v: string) => void;
  onEnter: () => void;
  suggestions: Product[];
  onAddProduct: (p: Product) => void;
  getStockInfo: (productId: string) => StockInfo;
  lineOverStock: (line: BillLine) => boolean;
  hasStockIssues: boolean;
  lines: BillLine[];
  extraCharges: ExtraCharge[];
  onQtyChange: (lineId: number, qty: number) => void;
  onRateChange: (lineId: number, rate: number) => void;
  onRemoveLine: (id: number) => void;
  onRemoveCharge: (id: number) => void;
  storeCode?: string;
  checkoutResult: CheckoutResult | null;
  showCheckoutFailureBanner: boolean;
}

export function ProductDetailsSection({
  saleType,
  searchRef,
  searchVal,
  onSearchChange,
  onEnter,
  suggestions,
  onAddProduct,
  getStockInfo,
  lineOverStock,
  hasStockIssues,
  lines,
  extraCharges,
  onQtyChange,
  onRateChange,
  onRemoveLine,
  onRemoveCharge,
  storeCode,
  checkoutResult,
  showCheckoutFailureBanner,
}: ProductDetailsSectionProps) {
  const PLACEHOLDER_ROWS = 4;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-2 pt-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Section header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutList size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
            {lines.length > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {lines.length}
              </span>
            )}
          </div>
          <div className="relative w-64">
            <Scan size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={searchVal}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onEnter()}
              placeholder="Scan barcode or search product…"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
            {suggestions.length > 0 && searchVal.trim() && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                {suggestions.map((p) => {
                  const stock = getStockInfo(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onAddProduct(p)}
                      className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                    >
                      <span className="font-medium">{p.name}</span>
                      <StockBadge info={stock} saleType={saleType} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/60">
              <tr>
                {["#", "Product Name", "Category", "Qty", "Unit", "Weight", "Price", "Discount", "Line Total", ""].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lines.map((line, idx) => {
                const overStock = lineOverStock(line);
                const discount = line.officialRate > 0 && line.rate < line.officialRate
                  ? ((line.officialRate - line.rate) / line.officialRate * 100).toFixed(0) + "%"
                  : "0.00";
                return (
                  <tr
                    key={line.id}
                    className={`hover:bg-primary/[0.02] ${overStock ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-foreground truncate">{line.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      {line.storeCode ?? storeCode ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, Math.max(0.001, line.qty - 1))}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                        >
                          <Minus size={11} />
                        </button>
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
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, line.qty + 1)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                        >
                          <Plus size={11} />
                        </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground leading-none">
                          Type qty or use ±
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground w-16">
                        <span className="truncate">{line.unitLabel}</span>
                        <span className="ml-auto text-muted-foreground">▾</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">0.00</td>
                    <td className="px-3 py-2.5">
                      {saleType === "black" ? (
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                          }}
                          className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm tabular-nums outline-none focus:border-primary"
                        />
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {fmt(line.rate)}
                          </span>
                          {line.activeTier && (
                            <span className="text-[10px] text-muted-foreground leading-none uppercase">
                              {line.activeTier}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">{discount}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold tabular-nums text-foreground">
                      {fmt(lineTotal(line))}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {extraCharges.map((ec) => (
                <tr key={ec.id} className="bg-muted/20">
                  <td colSpan={8} className="px-3 py-2 text-sm italic text-muted-foreground">
                    {ec.label}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold">{fmt(ec.amount)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onRemoveCharge(ec.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Placeholder empty rows */}
              {Array.from({ length: Math.max(0, PLACEHOLDER_ROWS - lines.length) }).map((_, i) => (
                <tr key={`placeholder-${i}`} className="text-muted-foreground/30">
                  <td className="px-3 py-2.5 text-sm">{lines.length + i + 1}</td>
                  <td className="px-3 py-2.5 text-sm">Item description</td>
                  <td className="px-3 py-2.5 text-sm">Category</td>
                  <td className="px-3 py-2.5 text-sm">1</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/50 px-2 py-1 text-xs w-16">
                      <span>Pc</span>
                      <span className="ml-auto">▾</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm">0.00</td>
                  <td className="px-3 py-2.5 text-sm">0.00</td>
                  <td className="px-3 py-2.5 text-sm">0.00</td>
                  <td className="px-3 py-2.5 text-sm">0.00</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>

          {lines.length === 0 && (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/50">
              Scan a product or type to search above
            </div>
          )}
        </div>

        {hasStockIssues && lines.length > 0 && (
          <div className="flex flex-shrink-0 items-start gap-2 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2">
            <AlertCircle size={14} className="mt-0.5 text-red-600 dark:text-red-400" />
            <p className="text-xs font-medium text-red-800 dark:text-red-300">Some lines exceed available stock.</p>
          </div>
        )}

        {showCheckoutFailureBanner && checkoutResult && (
          <div className="flex-shrink-0 border-t border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2">
            <StepList steps={checkoutResult.steps} />
          </div>
        )}
      </div>
    </section>
  );
}
