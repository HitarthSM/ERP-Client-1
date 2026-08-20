import { Pencil } from "lucide-react";
import type { Customer, CustomerType, SaleType } from "../../../../types";
import { CustomerPicker } from "../../../../components/CustomerPicker";
import { fmt } from "../../posHelpers";

const CUSTOMER_TYPES: Array<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "new", label: "New" },
  { value: "shop", label: "Shop" },
  { value: "big_customer", label: "Company" },
];

export interface CustomerInfoSectionProps {
  saleRef: string;
  orderReference: string;
  onOrderReferenceChange: (v: string) => void;
  customerInfo: string;
  onCustomerInfoChange: (v: string) => void;
  customerId: string;
  onCustomerSelect: (c: Customer) => void;
  onClearCustomer: () => void;
  selectedCustomer: Customer | undefined;
  customerType: CustomerType;
  onCustomerTypeChange: (t: CustomerType) => void;
  saleType: SaleType;
  creditBalance: number;
}

export function CustomerInfoSection({
  saleRef,
  orderReference,
  onOrderReferenceChange,
  customerInfo,
  onCustomerInfoChange,
  customerId,
  onCustomerSelect,
  onClearCustomer,
  selectedCustomer,
  customerType,
  onCustomerTypeChange,
  saleType,
  creditBalance,
}: CustomerInfoSectionProps) {
  const balance = customerId ? creditBalance : 0;

  return (
    <section className="border-b border-border bg-card px-4 py-2.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-4 lg:grid-cols-8 items-end">
        <Field label="Sales #">
          <div className="flex h-8 items-center rounded border border-border bg-muted px-2.5 font-mono text-xs font-semibold text-foreground">
            {saleRef}
          </div>
        </Field>
        <Field label="Reference #">
          <input
            value={orderReference}
            onChange={(e) => onOrderReferenceChange(e.target.value)}
            placeholder="PO / Ref Number"
            className="h-8 w-full rounded border border-border bg-background px-2.5 text-xs outline-none focus:border-primary"
          />
        </Field>
        <Field label="Customer Name" className="col-span-2">
          <CustomerPicker
            customerId={customerId}
            onSelect={onCustomerSelect}
            onClear={onClearCustomer}
            value={customerInfo}
            onChange={onCustomerInfoChange}
            placeholder={saleType === "credit" ? "Search creditor…" : "Search customer or walk-in name…"}
            creditOnly={saleType === "credit"}
            customerType={customerType}
          />
        </Field>
        <Field label="Category">
          <select
            value={customerType}
            onChange={(e) => onCustomerTypeChange(e.target.value as CustomerType)}
            className="h-8 w-full rounded border border-border bg-background px-2.5 text-xs outline-none focus:border-primary"
          >
            {CUSTOMER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Balance">
          <div
            className={`flex h-8 items-center rounded border border-border px-2.5 text-xs font-bold tabular-nums ${
              balance > 0 ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" : "bg-muted text-foreground"
            }`}
          >
            {fmt(balance)}
          </div>
        </Field>
        <Field label="Phone">
          <div className="flex h-8 items-center rounded border border-border bg-muted px-2.5 text-xs text-muted-foreground">
            {selectedCustomer?.phone ?? "—"}
          </div>
        </Field>
        <Field label="Email">
          <div className="flex h-8 items-center truncate rounded border border-border bg-muted px-2.5 text-xs text-muted-foreground">
            {selectedCustomer?.email ?? "—"}
          </div>
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
