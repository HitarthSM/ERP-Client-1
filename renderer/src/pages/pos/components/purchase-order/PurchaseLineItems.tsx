import type { RefObject } from "react";
import { LayoutList, Minus, Plus, Scan, Trash2 } from "lucide-react";
import type { Product } from "../../../../types";
import { fmt, type BillLine, type ExtraCharge } from "../../posHelpers";
import type { CheckoutResult } from "../../checkout";
import { StepList } from "../StepList";

export interface PurchaseLineItemsProps {
  searchRef: RefObject<HTMLInputElement | null>;
  searchVal: string;
  onSearchChange: (v: string) => void;
  onEnter: () => void;
  suggestions: Product[];
  onAddProduct: (p: Product) => void;
  lines: BillLine[];
  extraCharges: ExtraCharge[];
  onQtyChange: (lineId: number, qty: number) => void;
  onRateChange: (lineId: number, rate: number) => void;
  onRemoveLine: (id: number) => void;
  onRemoveCharge: (id: number) => void;
  checkoutResult: CheckoutResult | null;
  showCheckoutFailureBanner: boolean;
}

const PLACEHOLDER_ROWS = 3;

export function PurchaseLineItems({
  searchRef,
  searchVal,
  onSearchChange,
  onEnter,
  suggestions,
  onAddProduct,
  lines,
  extraCharges,
  onQtyChange,
  onRateChange,
  onRemoveLine,
  onRemoveCharge,
  checkoutResult,
  showCheckoutFailureBanner,
}: PurchaseLineItemsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutList size={15} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Line Items</h2>
          {lines.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {lines.length}
            </span>
          )}
        </div>
        {/* Search / Add Row */}
        <div className="relative w-60">
          <Scan size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchVal}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEnter()}
            placeholder="Scan or search product…"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
          {suggestions.length > 0 && searchVal.trim() && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAddProduct(p)}
                  className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-xs last:border-0 hover:bg-muted"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {["#", "Product Name", "Company / Brand", "Qty", "Style", "Unit", "Weight", "Purchase Price", "Discount", "Total", ""].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lines.map((line, idx) => (
              <tr key={line.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <p className="font-medium text-foreground truncate">{line.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
                </td>
                <td className="px-3 py-2.5 text-sm text-muted-foreground">
                  {line.manufacturer ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onQtyChange(line.id, Math.max(1, line.qty - 1))}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => onQtyChange(line.id, line.qty + 1)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    {line.packSize != null && (
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {line.qty * line.packSize} units
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm text-muted-foreground">e.g. S</td>
                <td className="px-3 py-2.5 text-sm text-muted-foreground">{line.unitLabel}</td>
                <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">0.00</td>
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.rate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                    }}
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm tabular-nums outline-none focus:border-primary"
                  />
                </td>
                <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">0%</td>
                <td className="px-3 py-2.5 text-sm font-semibold tabular-nums text-foreground">
                  {fmt(line.qty * (line.packSize ?? 1) * line.rate)}
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
            ))}

            {extraCharges.map((ec) => (
              <tr key={ec.id} className="bg-muted/20">
                <td colSpan={9} className="px-3 py-2 text-sm italic text-muted-foreground">{ec.label}</td>
                <td className="px-3 py-2 text-sm font-semibold">{fmt(ec.amount)}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => onRemoveCharge(ec.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Placeholder rows */}
            {Array.from({ length: Math.max(0, PLACEHOLDER_ROWS - lines.length) }).map((_, i) => (
              <tr key={`ph-${i}`} className="text-muted-foreground/30">
                <td className="px-3 py-2.5 text-sm">{lines.length + i + 1}</td>
                <td className="px-3 py-2.5 text-sm">Enter product name</td>
                <td className="px-3 py-2.5 text-sm">Brand</td>
                <td className="px-3 py-2.5 text-sm">0</td>
                <td className="px-3 py-2.5 text-sm">e.g. S</td>
                <td className="px-3 py-2.5 text-sm">kg/pc</td>
                <td className="px-3 py-2.5 text-sm">0.00</td>
                <td className="px-3 py-2.5 text-sm">0.00</td>
                <td className="px-3 py-2.5 text-sm">0%</td>
                <td className="px-3 py-2.5 text-sm">0.00</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCheckoutFailureBanner && checkoutResult && (
        <div className="border-t border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2">
          <StepList steps={checkoutResult.steps} />
        </div>
      )}
    </div>
  );
}
