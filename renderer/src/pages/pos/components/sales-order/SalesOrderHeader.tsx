import { Archive, Check, Save } from "lucide-react";

export interface SalesOrderHeaderProps {
  onHoldSale: () => void;
  holding: boolean;
  holdDisabled: boolean;
  onShowHeldSales: () => void;
  onCompleteSale: () => void;
  generateDisabled: boolean;
  checkingOut: boolean;
}

export function SalesOrderHeader({
  onHoldSale,
  holding,
  holdDisabled,
  onShowHeldSales,
  onCompleteSale,
  generateDisabled,
  checkingOut,
}: SalesOrderHeaderProps) {
  return (
    <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-foreground leading-tight">Transaction Entry</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Create new invoice and record payment details.</p>
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
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={13} /> {holding ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={generateDisabled}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={13} /> {checkingOut ? "Processing…" : "Complete Transaction"}
        </button>
      </div>
    </header>
  );
}
