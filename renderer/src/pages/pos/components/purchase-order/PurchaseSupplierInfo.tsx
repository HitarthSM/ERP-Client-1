import { Building2, Mail, Phone, ShieldCheck } from "lucide-react";
import type { Supplier } from "../../../../types";
import { SupplierFormDrawer } from "../../../../components/SupplierFormDrawer";
import { FormSelect } from "../../../../components/FormSelect";
import { useState } from "react";

export interface PurchaseSupplierInfoProps {
  supplierMode: "old" | "new";
  suppliers: Supplier[];
  supplierId: string;
  onSupplierChange: (id: string) => void;
  selectedSupplier: Supplier | undefined;
  onNewSupplierCreated: (s: Supplier) => void;
}

export function PurchaseSupplierInfo({
  supplierMode,
  suppliers,
  supplierId,
  onSupplierChange,
  selectedSupplier,
  onNewSupplierCreated,
}: PurchaseSupplierInfoProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Building2 size={15} className="text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Supplier Information</h2>
      </div>

      <div className="px-4 py-4 space-y-4">
        {supplierMode === "old" ? (
          <>
            {/* Company Name — searchable dropdown */}
            <InfoField label="Company Name" icon={<Building2 size={14} />}>
              <FormSelect
                value={supplierId}
                onChange={onSupplierChange}
                placeholder="— Select Supplier —"
                className="h-9 py-1.5"
                options={[
                  { value: '', label: '— Select Supplier —' },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </InfoField>

            {/* Contact Details / Phone */}
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Contact Details" icon={<Phone size={14} />}>
                <DisplayValue value={selectedSupplier?.contactPerson ?? selectedSupplier?.phone} placeholder="Phone Number" />
              </InfoField>
              <InfoField label="Email" icon={<Mail size={14} />}>
                <DisplayValue value={selectedSupplier?.email} placeholder="supplier@example.com" />
              </InfoField>
            </div>

            <InfoField label="PIN / Tax ID" icon={<ShieldCheck size={14} />}>
              <DisplayValue value={selectedSupplier?.taxId} placeholder="Enter PIN" />
            </InfoField>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Register a new supplier to use them in this transaction.
            </p>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Building2 size={14} /> Register New Supplier
            </button>
          </div>
        )}
      </div>

      <SupplierFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={(s) => {
          setDrawerOpen(false);
          onNewSupplierCreated(s);
        }}
      />
    </div>
  );
}

function InfoField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">{icon}</span>
        <div className="pl-9">{children}</div>
      </div>
    </div>
  );
}

function DisplayValue({ value, placeholder }: { value?: string | null; placeholder: string }) {
  return (
    <div className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 text-sm text-foreground">
      {value || <span className="text-muted-foreground/50">{placeholder}</span>}
    </div>
  );
}
