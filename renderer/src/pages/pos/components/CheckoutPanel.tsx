import { useState } from "react";
import { ExternalLink, Mail, Printer, Receipt, PackagePlus, User } from "lucide-react";
import type { ClerkUser, CreditStatus, Customer, SaleType } from "../../../types";

function CreditDot({ status }: { status?: CreditStatus }) {
  const cls: Record<string, string> = {
    over: 'bg-red-500', warning: 'bg-amber-500', available: 'bg-green-500', none: 'bg-muted-foreground/30',
  };
  const labels: Record<string, string> = {
    over: 'Over limit', warning: 'Nearing limit', available: 'Credit available', none: 'No credit limit',
  };
  const k = status ?? 'none';
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls[k]}`} title={labels[k]} />;
}
import { formatEntityLabel } from "../../../lib/entityLabel";
import { CustomerFormDrawer } from "../../../components/CustomerFormDrawer";
import type { DeliveryInfo, PosPayMethod } from "../checkout";
import { fmt, type Mode } from "../posHelpers";

type FacilitatorUser = ClerkUser;

export interface CheckoutPanelProps {
  mode: Mode;
  saleType: SaleType;
  lineCount: number;
  subtotal: number;
  totalTax: number;
  extraTotal: number;
  grandTotal: number;
  blackMarkup: number;

  payMethod: PosPayMethod;
  cashTendered: string;
  onCashTenderedChange: (v: string) => void;
  paymentReference: string;
  onPaymentReferenceChange: (v: string) => void;
  paymentTiming: string;
  partialAmount: string;
  onPartialAmountChange: (v: string) => void;
  partialAmountMissing: boolean;

  showDelivery: boolean;
  onToggleDelivery: () => void;
  delivery: DeliveryInfo;
  onDeliveryChange: (d: DeliveryInfo) => void;

  customerInfo: string;
  onCustomerInfoChange: (v: string) => void;
  customerId: string;
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
  showCustomerSuggestions: boolean;
  onShowCustomerSuggestions: (show: boolean) => void;
  debouncedCustomerInfo: string;
  customerSearchItems: Customer[];
  showCreateCustomer: boolean;
  onOpenCreateCustomer: () => void;
  onCloseCreateCustomer: () => void;
  onCustomerCreated: (customer: Customer) => void;

  selectedCustomer: Customer | undefined;
  customerType?: string;
  creditLimit: number;
  creditBalance: number;
  creditRemaining: number;
  creditNeedsApproval: boolean;
  creditOverLimitException?: boolean;
  creditMissingLimit: boolean;

  facilitatorMode: "none" | "user" | "name";
  onFacilitatorModeChange: (m: "none" | "user" | "name") => void;
  facilitatorSearchVal: string;
  onFacilitatorSearchChange: (v: string) => void;
  facilitatorUserId: string;
  onFacilitatorUserSelect: (u: FacilitatorUser) => void;
  showFacilitatorSuggestions: boolean;
  onShowFacilitatorSuggestions: (show: boolean) => void;
  facilitatorSearchResults: FacilitatorUser[];
  facilitatorName: string;
  onFacilitatorNameChange: (v: string) => void;
  commissionPct: string;
  onCommissionPctChange: (v: string) => void;

  supplierRef: string;
  onSupplierRefChange: (v: string) => void;

  onGenerateBill: () => void;
  generateDisabled: boolean;
  checkingOut: boolean;
  onPrintReceipt: () => void;
  hasReceipt: boolean;
  accentBtnCls: string;
  hasStockIssues?: boolean;
  onOpenCustomerDrawer?: () => void;
  lastBillDate?: string;
  lastBillTotal?: number;
}

export function CheckoutPanel({
  mode,
  saleType,
  lineCount,
  subtotal,
  totalTax,
  extraTotal,
  grandTotal,
  blackMarkup,
  payMethod,
  cashTendered,
  onCashTenderedChange,
  paymentReference,
  onPaymentReferenceChange,
  paymentTiming,
  partialAmount,
  onPartialAmountChange,
  partialAmountMissing,
  showDelivery,
  onToggleDelivery,
  delivery,
  onDeliveryChange,
  customerInfo,
  onCustomerInfoChange,
  customerId,
  onCustomerSelect,
  onClearCustomer,
  showCustomerSuggestions,
  onShowCustomerSuggestions,
  debouncedCustomerInfo,
  customerSearchItems,
  showCreateCustomer,
  onOpenCreateCustomer,
  onCloseCreateCustomer,
  onCustomerCreated,
  selectedCustomer,
  customerType,
  creditLimit,
  creditBalance,
  creditRemaining,
  creditNeedsApproval,
  creditOverLimitException,
  creditMissingLimit,
  facilitatorMode,
  onFacilitatorModeChange,
  facilitatorSearchVal,
  onFacilitatorSearchChange,
  facilitatorUserId,
  onFacilitatorUserSelect,
  showFacilitatorSuggestions,
  onShowFacilitatorSuggestions,
  facilitatorSearchResults,
  facilitatorName,
  onFacilitatorNameChange,
  commissionPct,
  onCommissionPctChange,
  supplierRef,
  onSupplierRefChange,
  onGenerateBill,
  generateDisabled,
  checkingOut,
  onPrintReceipt,
  hasReceipt,
  accentBtnCls,
  hasStockIssues,
  onOpenCustomerDrawer,
  lastBillDate,
  lastBillTotal,
}: CheckoutPanelProps) {
  const [facilitatorSectionOpen, setFacilitatorSectionOpen] = useState(false);

  return (
    <div className="flex w-72 min-h-0 flex-shrink-0 flex-col overflow-hidden bg-card border-l border-border">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {mode === "sales" ? "Checkout" : "Order Summary"}
        </p>
        <span className="text-sm font-bold text-primary tabular-nums">{fmt(grandTotal)}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Items</span>
            <span className="font-medium text-foreground">{lineCount}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Tax</span>
            <span className="font-medium text-foreground">{fmt(totalTax)}</span>
          </div>
          {extraTotal !== 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Extra Charges</span>
              <span className={`font-medium ${extraTotal < 0 ? "text-red-600" : "text-foreground"}`}>
                {extraTotal < 0 ? "-" : "+"}
                {fmt(Math.abs(extraTotal))}
              </span>
            </div>
          )}
          {mode === "sales" && saleType === "black" && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300 text-xs pt-0.5">
              <span className="font-semibold uppercase tracking-wide">Black markup</span>
              <span className="font-semibold tabular-nums">{fmt(blackMarkup)}</span>
            </div>
          )}
        </div>

        {mode === "sales" && (
          <div className="space-y-2">
            {payMethod === "cash" && grandTotal > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  Cash Tendered
                </label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => onCashTenderedChange(e.target.value)}
                  placeholder="Enter amount received"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                />
                {cashTendered !== "" && !isNaN(Number(cashTendered)) && (
                  <div
                    className={`text-xs font-medium ${Number(cashTendered) < grandTotal ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {Number(cashTendered) < grandTotal
                      ? `Short by ${fmt(grandTotal - Number(cashTendered))}`
                      : `Change due: ${fmt(Number(cashTendered) - grandTotal)}`}
                  </div>
                )}
              </div>
            )}
            {payMethod !== "cash" && (
              <div>
                <label className="block mb-1 text-xs font-medium text-muted-foreground">
                  {payMethod === "till" ? "Till number / ref" : "Payment reference"}
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => onPaymentReferenceChange(e.target.value)}
                  placeholder={
                    payMethod === "mpesa"
                      ? "M-Pesa code"
                      : payMethod === "till"
                        ? "Till number"
                        : "Reference"
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            {paymentTiming === "half" && (
              <div>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => onPartialAmountChange(e.target.value)}
                  placeholder="Partial amount received"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary ${
                    partialAmountMissing ? "border-destructive" : "border-border"
                  }`}
                />
                {partialAmountMissing && (
                  <p className="mt-1 text-[10px] font-medium text-destructive">
                    Enter a partial amount greater than 0
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onToggleDelivery}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              {showDelivery ? "− Hide delivery info" : "+ Delivery info"}
            </button>
            {showDelivery && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["driverName", "Driver name"],
                    ["companionName", "With driver"],
                    ["vehicleNumber", "Vehicle no."],
                    ["license", "License"],
                    ["location", "Location"],
                    ["distance", "Distance"],
                    ["gps", "GPS"],
                    ["rating", "Rating"],
                    ["note", "Note"],
                  ] as Array<[keyof DeliveryInfo, string]>
                ).map(([key, label]) => (
                  <input
                    key={key}
                    type="text"
                    value={delivery[key] ?? ""}
                    onChange={(e) => onDeliveryChange({ ...delivery, [key]: e.target.value })}
                    placeholder={label}
                    className={`px-2 py-1.5 border border-border rounded-lg text-xs outline-none focus:border-primary ${
                      key === "note" ? "col-span-2" : ""
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            {mode === "sales" ? "Customer" : "Supplier Ref. / Notes"}
          </p>
          <div className="relative">
            <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={mode === "sales" ? customerInfo : supplierRef}
              onChange={(e) => {
                if (mode === "sales") {
                  onCustomerInfoChange(e.target.value);
                  onShowCustomerSuggestions(true);
                } else {
                  onSupplierRefChange(e.target.value);
                }
              }}
              onFocus={() => mode === "sales" && onShowCustomerSuggestions(true)}
              placeholder={
                mode === "sales"
                  ? saleType === "credit"
                    ? "Search creditor…"
                    : "Walk-in name or search customer…"
                  : "Supplier invoice / LPO no."
              }
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-primary"
            />
            {mode === "sales" &&
              showCustomerSuggestions &&
              !customerId &&
              debouncedCustomerInfo.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {customerSearchItems.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-0"
                      onClick={() => onCustomerSelect(c)}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <CreditDot status={c.creditStatus} />
                        {c.name || "Unnamed"}
                      </span>
                      {c.phone ? (
                        <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>
                      ) : null}
                      {c.creditBalance != null && c.creditLimit != null && c.creditLimit > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-2 tabular-nums">
                          Balance: {c.creditBalance.toFixed(2)} / {c.creditLimit.toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                  {customerSearchItems.length === 0 && (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={onOpenCreateCustomer}
                    >
                      No customer found for &quot;{customerInfo.trim()}&quot; —{" "}
                      <span className="font-medium text-primary">+ Create customer</span>
                    </button>
                  )}
                </div>
              )}
          </div>
          {mode === "sales" && (
            <CustomerFormDrawer
              open={showCreateCustomer}
              initialName={customerInfo.trim()}
              onClose={onCloseCreateCustomer}
              onSaved={onCustomerCreated}
            />
          )}
          {mode === "sales" && customerId && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <CreditDot status={selectedCustomer?.creditStatus} />
                Linked: {formatEntityLabel({ name: customerInfo, id: customerId })}
                {(customerType || selectedCustomer?.customerType) && (
                  <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[9px] text-foreground">
                    {String(customerType || selectedCustomer?.customerType).replace(/_/g, " ")}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onOpenCustomerDrawer && (
                  <button
                    type="button"
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                    onClick={onOpenCustomerDrawer}
                  >
                    <ExternalLink size={9} /> Profile
                  </button>
                )}
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground underline"
                  onClick={onClearCustomer}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          {mode === "sales" && saleType === "credit" && !customerId && (
            <p className="mt-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Select a customer for credit sales
            </p>
          )}
          {mode === "sales" && saleType === "credit" && customerId && creditMissingLimit && (
            <p className="mt-1.5 text-[10px] font-medium text-destructive">
              Customer has no credit limit — set one on the Customers page before completing
            </p>
          )}
          {mode === "sales" && saleType === "credit" && customerId && selectedCustomer &&
            (selectedCustomer.creditStatus === 'warning' || selectedCustomer.creditStatus === 'over') && (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-[11px] font-medium ${
              selectedCustomer.creditStatus === 'over'
                ? 'border-red-300/60 bg-red-500/10 text-red-700 dark:text-red-400'
                : 'border-amber-300/60 bg-amber-500/10 text-amber-800 dark:text-amber-300'
            }`}>
              {selectedCustomer.creditStatus === 'over'
                ? '⚠ Customer is over credit limit'
                : '⚠ Customer is nearing credit limit (≥90%)'}
            </div>
          )}
          {mode === "sales" && saleType === "credit" && customerId && selectedCustomer && (
            <div className="mt-2 rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold capitalize">
                  {String(customerType || selectedCustomer.customerType || "regular").replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Limit</span>
                <span className="font-semibold tabular-nums">{fmt(creditLimit)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-semibold tabular-nums">{fmt(creditBalance)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold tabular-nums">{fmt(creditRemaining)}</span>
              </div>
              {creditNeedsApproval && (
                <p className="pt-1 font-semibold text-amber-800 dark:text-amber-300">
                  Needs approval — over credit limit
                </p>
              )}
              {creditOverLimitException && (
                <p className="pt-1 font-semibold text-sky-800 dark:text-sky-300">
                  Over limit — skip-approval exception is on. Sale will complete without permission.
                </p>
              )}
            </div>
          )}

          {mode === "sales" && saleType === "black" && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setFacilitatorSectionOpen((v) => !v)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                {facilitatorSectionOpen ? "− Hide facilitator & commission" : "+ Facilitator & commission"}
              </button>
              {facilitatorSectionOpen && (
                <>
                  <div className="p-2.5 border rounded-xl bg-muted/40 border-border/80">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Facilitator & Commission
                    </p>
                    <select
                      value={facilitatorMode}
                      onChange={(e) =>
                        onFacilitatorModeChange(e.target.value as "none" | "user" | "name")
                      }
                      className="mb-2 w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-card outline-none focus:border-primary"
                    >
                      <option value="none">None</option>
                      <option value="user">System User</option>
                      <option value="name">Name Only</option>
                    </select>

                    {facilitatorMode === "user" && (
                      <div className="relative mb-2">
                        <input
                          value={facilitatorSearchVal}
                          onChange={(e) => {
                            onFacilitatorSearchChange(e.target.value);
                            onShowFacilitatorSuggestions(true);
                          }}
                          onFocus={() => onShowFacilitatorSuggestions(true)}
                          placeholder="Search user..."
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                        {showFacilitatorSuggestions &&
                          !facilitatorUserId &&
                          facilitatorSearchResults.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                              {facilitatorSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  className="block w-full px-2 py-1.5 text-left text-[11px] hover:bg-muted border-b border-border last:border-0"
                                  onClick={() => onFacilitatorUserSelect(u)}
                                >
                                  {u.firstName} {u.lastName}{" "}
                                  <span className="text-muted-foreground">{u.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                    {facilitatorMode === "name" && (
                      <div className="mb-2">
                        <input
                          value={facilitatorName}
                          onChange={(e) => onFacilitatorNameChange(e.target.value)}
                          placeholder="Facilitator name"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                      </div>
                    )}
                    {facilitatorMode !== "none" && (
                      <div>
                        <input
                          type="number"
                          value={commissionPct}
                          onChange={(e) => onCommissionPctChange(e.target.value)}
                          placeholder="Commission %"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                  {facilitatorMode !== "none" && commissionPct && (
                    <div className="p-2 border border-border/80 bg-background rounded-lg flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Est. Commission</span>
                      <span className="font-semibold text-primary">
                        {fmt((blackMarkup * Number(commissionPct)) / 100)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border space-y-2 flex-shrink-0">
        {hasStockIssues && mode === "sales" && (
          <p className="text-[10px] font-medium text-red-600 text-center">
            Fix stock issues in the cart before completing
          </p>
        )}
        {mode === "sales" && creditNeedsApproval ? (
          <button
            type="button"
            onClick={onGenerateBill}
            disabled={generateDisabled}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700"
          >
            <Receipt size={16} />
            {checkingOut ? "Processing…" : "Send for Approval"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerateBill}
            disabled={generateDisabled}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${accentBtnCls}`}
          >
            {mode === "sales" ? <Receipt size={16} /> : <PackagePlus size={16} />}
            {checkingOut
              ? "Processing…"
              : mode === "sales"
                ? "Complete Sale"
                : "Create Purchase Order"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPrintReceipt}
            disabled={!hasReceipt}
            title={
              hasReceipt
                ? "Print last receipt"
                : mode === "sales"
                  ? "Complete a sale first"
                  : "Create a purchase order first"
            }
            className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={13} /> Print
          </button>
          <button
            type="button"
            disabled
            title="E-receipt not wired"
            className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
          >
            <Mail size={13} /> E-Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
