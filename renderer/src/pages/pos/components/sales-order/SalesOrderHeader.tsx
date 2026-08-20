import { Archive, PauseCircle, Plus, X } from "lucide-react";
import type { Location, SaleType } from "../../../../types";
import { formatEntityLabel } from "../../../../lib/entityLabel";

const SALE_TYPES: Array<{ value: SaleType; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "credit", label: "Credit" },
  { value: "black", label: "Black" },
];

export interface SalesOrderHeaderProps {
  saleRef: string;
  saleType: SaleType;
  onSaleTypeChange: (t: SaleType) => void;
  canCreateBlackSale: boolean;
  locations: Location[];
  locationId: string;
  onLocationChange: (id: string) => void;
  onVoidBill: () => void;
  onHoldSale: () => void;
  holding: boolean;
  holdDisabled: boolean;
  onShowHeldSales: () => void;
}

export function SalesOrderHeader({
  saleRef,
  saleType,
  onSaleTypeChange,
  canCreateBlackSale,
  locations,
  locationId,
  onLocationChange,
  onVoidBill,
  onHoldSale,
  holding,
  holdDisabled,
  onShowHeldSales,
}: SalesOrderHeaderProps) {
  const store = locations.find((l) => l.id === locationId);

  return (
    <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">New Sales Order</h1>
          <p className="text-[10px] text-muted-foreground">
            {store?.name ?? "Select store"} · <span className="font-mono font-semibold text-foreground">{saleRef}</span>
          </p>
        </div>
        <div className="flex items-center rounded-lg bg-muted p-1 gap-0.5">
          {SALE_TYPES.filter((o) => o.value !== "black" || canCreateBlackSale).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onSaleTypeChange(o.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                saleType === o.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          value={locationId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {formatEntityLabel({ name: l.name, code: l.code, id: l.id })}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onShowHeldSales}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
        >
          <Archive size={13} /> Held Sales
        </button>
        <button
          type="button"
          onClick={onHoldSale}
          disabled={holdDisabled}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
        >
          <PauseCircle size={13} /> {holding ? "Holding…" : "Hold"}
        </button>
        <button
          type="button"
          onClick={onVoidBill}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <X size={13} /> Clear
        </button>
        <button
          type="button"
          onClick={onVoidBill}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus size={13} /> New Order
        </button>
      </div>
    </header>
  );
}
