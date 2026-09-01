import { UserCircle } from "lucide-react";
import type { Customer, CustomerType, Location, SaleType } from "../../../../types";
import { CustomerPicker } from "../../../../components/CustomerPicker";
import { FormSelect } from "../../../../components/FormSelect";

const CUSTOMER_TYPES: Array<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "new", label: "New Customer" },
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
  onSaleTypeChange: (t: SaleType) => void;
  canCreateBlackSale: boolean;
  creditBalance: number;
  billedBy: string;
  transactionDate: string;
  onTransactionDateChange: (v: string) => void;
  locations: Location[];
  locationId: string;
  onLocationChange: (id: string) => void;
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
  customerType,
  onCustomerTypeChange,
  saleType,
  onSaleTypeChange,
  canCreateBlackSale,
  billedBy,
  transactionDate,
  onTransactionDateChange,
  locations,
  locationId,
  onLocationChange,
}: CustomerInfoSectionProps) {
  const saleTypeOptions: Array<{ value: SaleType; label: string }> = [
    { value: "normal", label: "Normal" },
    { value: "credit", label: "Credit" },
    ...(canCreateBlackSale ? [{ value: "black" as SaleType, label: "Black" }] : []),
  ];

  return (
    <section className="flex-shrink-0 px-6 pt-4 pb-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <UserCircle size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Customer &amp; Invoice Details</h2>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Row 1: Transaction Type | Customer Status | Customer Name */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_1fr_2fr]">
            <Field label="Transaction Type">
              <select
                value={saleType}
                onChange={(e) => onSaleTypeChange(e.target.value as SaleType)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {saleTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Customer Status" hint="Change customer type to adjust price">
              <select
                value={customerType}
                onChange={(e) => onCustomerTypeChange(e.target.value as CustomerType)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {CUSTOMER_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Customer Name">
              <CustomerPicker
                customerId={customerId}
                onSelect={onCustomerSelect}
                onClear={onClearCustomer}
                value={customerInfo}
                onChange={onCustomerInfoChange}
                placeholder={saleType === "credit" ? "Search creditor…" : "Enter customer name…"}
                creditOnly={saleType === "credit"}
                customerType={customerType}
              />
            </Field>
          </div>

          {/* Row 2: Date | Billed By | Store | Invoice Number | Reference */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Field label="Date">
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => onTransactionDateChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </Field>

            <Field label="Billed By">
              <div className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 text-sm text-foreground">
                {billedBy || "—"}
              </div>
            </Field>

            <Field label="Store">
              <FormSelect
                value={locationId}
                onChange={onLocationChange}
                placeholder="Select store…"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                className="h-9 py-1.5"
              />
            </Field>

            <Field label="Invoice Number">
              <div className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 font-mono text-sm font-semibold text-foreground">
                {saleRef}
              </div>
            </Field>

            <Field label="Reference">
              <input
                value={orderReference}
                onChange={(e) => onOrderReferenceChange(e.target.value)}
                placeholder="PO-1234"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {hint && (
          <span title={hint} className="flex h-3.5 w-3.5 cursor-default items-center justify-center rounded-full bg-muted-foreground/25 text-[9px] font-bold text-muted-foreground leading-none select-none">
            !
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
