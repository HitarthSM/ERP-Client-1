import type { FleetDriver, PaymentTiming, SaleType } from "../../../../types";
import type { DeliveryInfo, PosPayMethod } from "../../checkout";
import { fmt } from "../../posHelpers";

const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

const PAYMENT_TIMING: Array<{ value: PaymentTiming; label: string }> = [
  { value: "cod", label: "COD" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "after_delivery", label: "After Delivery" },
  { value: "half", label: "Half" },
];

export interface PaymentLogisticsSectionProps {
  payMethod: PosPayMethod;
  onPayMethodChange: (m: PosPayMethod) => void;
  paymentReference: string;
  onPaymentReferenceChange: (v: string) => void;
  paymentTiming: PaymentTiming;
  onPaymentTimingChange: (t: PaymentTiming) => void;
  partialAmount: string;
  onPartialAmountChange: (v: string) => void;
  partialAmountMissing: boolean;
  notes: string;
  onNotesChange: (v: string) => void;
  drivers: FleetDriver[];
  selectedDriverId: string;
  onDriverSelect: (driverId: string) => void;
  delivery: DeliveryInfo;
  onDeliveryChange: (d: DeliveryInfo) => void;
  saleType?: SaleType;
  blackMarkup?: number;
  facilitatorMode?: "none" | "user" | "name";
  onFacilitatorModeChange?: (m: "none" | "user" | "name") => void;
  facilitatorName?: string;
  onFacilitatorNameChange?: (v: string) => void;
  commissionPct?: string;
  onCommissionPctChange?: (v: string) => void;
}

export function PaymentLogisticsSection({
  payMethod,
  onPayMethodChange,
  paymentReference,
  onPaymentReferenceChange,
  paymentTiming,
  onPaymentTimingChange,
  partialAmount,
  onPartialAmountChange,
  partialAmountMissing,
  notes,
  onNotesChange,
  drivers,
  selectedDriverId,
  onDriverSelect,
  delivery,
  onDeliveryChange,
  saleType,
  blackMarkup = 0,
  facilitatorMode = "none",
  onFacilitatorModeChange,
  facilitatorName = "",
  onFacilitatorNameChange,
  commissionPct = "",
  onCommissionPctChange,
}: PaymentLogisticsSectionProps) {
  const inputCls = "h-7 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary";

  return (
    <section className="flex-shrink-0 border-t border-border bg-card px-4 py-2.5">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        {/* Payment Method */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payment</p>
          <div className="flex gap-1">
            {PAY_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onPayMethodChange(m.value)}
                className={`h-7 rounded px-3 text-xs font-semibold transition ${
                  payMethod === m.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Timing */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Timing</p>
          <div className="flex gap-1">
            {PAYMENT_TIMING.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onPaymentTimingChange(t.value)}
                className={`h-7 rounded px-2.5 text-xs font-medium transition ${
                  paymentTiming === t.value
                    ? "border border-primary bg-primary/10 text-primary font-semibold"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        {payMethod !== "cash" && (
          <div className="w-40">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reference</label>
            <input
              value={paymentReference}
              onChange={(e) => onPaymentReferenceChange(e.target.value)}
              placeholder="Transaction ID (optional)"
              className={inputCls + " w-full"}
            />
          </div>
        )}

        {/* Partial amount */}
        {paymentTiming === "half" && (
          <div className="w-36">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Partial Amt</label>
            <input
              type="number"
              value={partialAmount}
              onChange={(e) => onPartialAmountChange(e.target.value)}
              placeholder="Amount now"
              className={`${inputCls} w-full ${partialAmountMissing ? "border-destructive" : ""}`}
            />
          </div>
        )}

        {/* Driver */}
        {drivers.length > 0 && (
          <div className="w-44">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Driver</label>
            <select
              value={selectedDriverId}
              onChange={(e) => onDriverSelect(e.target.value)}
              className={inputCls + " w-full"}
            >
              <option value="">— Select Driver —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Delivery */}
        <div className="w-32">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</label>
          <input
            type="text"
            value={delivery.vehicleNumber ?? ""}
            onChange={(e) => onDeliveryChange({ ...delivery, vehicleNumber: e.target.value })}
            placeholder="Vehicle no."
            className={inputCls + " w-full"}
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery location</label>
          <input
            type="text"
            value={delivery.location ?? ""}
            onChange={(e) => onDeliveryChange({ ...delivery, location: e.target.value })}
            placeholder="Delivery location"
            className={inputCls + " w-full"}
          />
        </div>

        {/* Notes */}
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
          <input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Internal notes…"
            className={inputCls + " w-full"}
          />
        </div>
      </div>

      {/* Black sale facilitator — collapsible inline row */}
      {saleType === "black" && onFacilitatorModeChange && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Black · Markup {fmt(blackMarkup)}
          </span>
          <select
            value={facilitatorMode}
            onChange={(e) => onFacilitatorModeChange(e.target.value as "none" | "user" | "name")}
            className={inputCls}
          >
            <option value="none">No facilitator</option>
            <option value="name">Facilitator name</option>
          </select>
          {facilitatorMode === "name" && onFacilitatorNameChange && (
            <input
              value={facilitatorName}
              onChange={(e) => onFacilitatorNameChange(e.target.value)}
              placeholder="Facilitator name"
              className={inputCls + " w-36"}
            />
          )}
          {facilitatorMode !== "none" && onCommissionPctChange && (
            <input
              type="number"
              value={commissionPct}
              onChange={(e) => onCommissionPctChange(e.target.value)}
              placeholder="Commission %"
              className={inputCls + " w-28"}
            />
          )}
        </div>
      )}
    </section>
  );
}
