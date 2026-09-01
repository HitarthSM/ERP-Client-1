import { FileText } from "lucide-react";

export interface PurchaseDocumentDetailsProps {
  supplierMode: "old" | "new";
  onSupplierModeChange: (m: "old" | "new") => void;
  purchaseDate: string;
  onPurchaseDateChange: (v: string) => void;
  supplierRef: string;
  onSupplierRefChange: (v: string) => void;
  billedBy: string;
}

export function PurchaseDocumentDetails({
  supplierMode,
  onSupplierModeChange,
  purchaseDate,
  onPurchaseDateChange,
  supplierRef,
  onSupplierRefChange,
  billedBy,
}: PurchaseDocumentDetailsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText size={15} className="text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Document Details</h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Source */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Source</p>
          <div className="flex gap-3">
            {(["old", "new"] as const).map((mode) => (
              <label
                key={mode}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  supplierMode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="supplier-source"
                  value={mode}
                  checked={supplierMode === mode}
                  onChange={() => onSupplierModeChange(mode)}
                  className="accent-primary"
                />
                {mode === "old" ? "Old Supplier" : "New Supplier"}
              </label>
            ))}
          </div>
        </div>

        {/* Date + Reference */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => onPurchaseDateChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Reference No.">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">#</span>
              <input
                value={supplierRef}
                onChange={(e) => onSupplierRefChange(e.target.value)}
                placeholder="Enter Ref"
                className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </Field>
        </div>

        {/* Billed By */}
        <Field label="Billed By (Employee)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </span>
            <div className="flex h-9 items-center rounded-lg border border-border bg-muted pl-8 pr-3 text-sm text-foreground">
              {billedBy || "Employee Name"}
            </div>
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
