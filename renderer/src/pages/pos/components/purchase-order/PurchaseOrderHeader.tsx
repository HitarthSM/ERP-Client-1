import { MoreVertical } from "lucide-react";

export interface PurchaseOrderHeaderProps {
  onCancel: () => void;
  onSubmit: () => void;
  generateDisabled: boolean;
  checkingOut: boolean;
}

export function PurchaseOrderHeader({
  onCancel,
  onSubmit,
  generateDisabled,
  checkingOut,
}: PurchaseOrderHeaderProps) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
      <h1 className="text-base font-semibold text-foreground">New Purchase Transaction</h1>
      <div className="flex items-center gap-3">
        <span className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Draft
        </span>
        <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <MoreVertical size={16} />
        </button>
      </div>
    </header>
  );
}
