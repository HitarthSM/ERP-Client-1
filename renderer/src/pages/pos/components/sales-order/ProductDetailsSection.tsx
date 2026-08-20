import type { RefObject } from "react";
import { AlertCircle, Minus, Plus, Scan, ShoppingCart, Trash2 } from "lucide-react";
import type { Product, SaleType } from "../../../../types";
import type { CheckoutResult } from "../../checkout";
import { fmt, lineTotal, type BillLine, type ExtraCharge, type PriceTier } from "../../posHelpers";
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
  onTierSelect: (lineId: number, tier: PriceTier) => void;
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
  onTierSelect,
  onRemoveLine,
  onRemoveCharge,
  storeCode,
  checkoutResult,
  showCheckoutFailureBanner,
}: ProductDetailsSectionProps) {
  const tierCols: Array<{ key: PriceTier; label: string }> = [
    { key: "p1", label: "P1" },
    { key: "p2", label: "P2" },
    { key: "p3", label: "P3" },
    { key: "p4", label: "P4" },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products</span>
          {lines.length > 0 && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {lines.length}
            </span>
          )}
        </div>
        <div className="relative w-72">
          <Scan size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchVal}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEnter()}
            placeholder="Barcode scan or product search…"
            className="w-full rounded border border-border bg-background py-1.5 pl-7 pr-3 text-xs outline-none focus:border-primary"
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

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
            <ShoppingCart size={32} strokeWidth={1} />
            <p className="text-sm">Search or scan a product to add a line</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/80">
              <tr>
                {[
                  "#",
                  "Product Name",
                  "Store",
                  "Unit",
                  "Qty Avail",
                  "Qty",
                  ...(saleType === "black" ? ["Official", "Charged"] : tierCols.map((t) => t.label)),
                  "Total",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => {
                const stock = getStockInfo(line.productId);
                const overStock = lineOverStock(line);
                return (
                  <tr
                    key={line.id}
                    className={`border-b border-border/50 hover:bg-primary/[0.03] ${overStock ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1.5 max-w-[180px]">
                      <p className="font-medium text-foreground truncate">{line.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{line.storeCode ?? storeCode ?? "—"}</td>
                    <td className="px-2 py-1.5 capitalize text-muted-foreground">{line.unitLabel}</td>
                    <td className="px-2 py-1.5">
                      {stock.found ? (
                        <StockBadge info={stock} saleType={saleType} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, Math.max(1, line.qty - 1))}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-7 text-center font-bold tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, line.qty + 1)}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>
                    {saleType === "black" ? (
                      <>
                        <td className="px-2 py-2 tabular-nums text-muted-foreground">{fmt(line.officialRate)}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={line.rate}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                            }}
                            className="w-20 rounded border border-border bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-primary"
                          />
                        </td>
                      </>
                    ) : (
                      tierCols.map(({ key }) => {
                        const price = line[key] ?? 0;
                        const active = line.activeTier === key;
                        return (
                          <td key={key} className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => onTierSelect(line.id, key)}
                              className={`rounded px-2 py-1 text-xs tabular-nums transition ${
                                active
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "border border-border hover:bg-muted"
                              }`}
                            >
                              {fmt(price)}
                            </button>
                          </td>
                        );
                      })
                    )}
                    <td className="px-2 py-1.5 font-bold tabular-nums text-foreground">{fmt(lineTotal(line))}</td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {extraCharges.map((ec) => (
                <tr key={ec.id} className="bg-muted/30">
                  <td colSpan={saleType === "black" ? 9 : 11} className="px-2 py-1.5 text-xs italic text-muted-foreground">
                    {ec.label}
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-xs">{fmt(ec.amount)}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => onRemoveCharge(ec.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </section>
  );
}
