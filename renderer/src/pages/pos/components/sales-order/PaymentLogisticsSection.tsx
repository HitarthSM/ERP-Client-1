import type { FleetDriver, PaymentTiming, SaleType } from "../../../../types";
import type { DeliveryInfo } from "../../checkout";
import { fmt } from "../../posHelpers";
import { FormSelect } from "../../../../components/FormSelect";

const PAYMENT_TIMING: Array<{ value: PaymentTiming; label: string }> = [
  { value: "cod", label: "COD" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "after_delivery", label: "After Delivery" },
  { value: "half", label: "Half" },
];

export interface PaymentLogisticsSectionProps {
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
  const inputCls = "h-8 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary";

  return (
    <section className="flex-shrink-0 border-t border-border bg-card px-6 py-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {/* Payment Timing */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Payment Timing</p>
          <div className="flex gap-1">
            {PAYMENT_TIMING.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onPaymentTimingChange(t.value)}
                className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
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
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reference</label>
          <input
            value={paymentReference}
            onChange={(e) => onPaymentReferenceChange(e.target.value)}
            placeholder="Transaction ID (optional)"
            className={inputCls + " w-full"}
          />
        </div>

        {/* Partial amount */}
        {paymentTiming === "half" && (
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Partial Amt</label>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Driver</label>
            <FormSelect
              value={selectedDriverId}
              onChange={onDriverSelect}
              placeholder="— Select Driver —"
              className="h-9 py-1.5"
              options={[
                { value: '', label: '— Select Driver —' },
                ...drivers.map((d) => ({
                  value: d.id,
                  label: `${d.firstName} ${d.lastName}`.trim(),
                })),
              ]}
            />
          </div>
        )}

        {/* Vehicle */}
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle</label>
          <input
            type="text"
            value={delivery.vehicleNumber ?? ""}
            onChange={(e) => onDeliveryChange({ ...delivery, vehicleNumber: e.target.value })}
            placeholder="Vehicle no."
            className={inputCls + " w-full"}
          />
        </div>

        {/* Delivery location */}
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Delivery Location</label>
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
          <input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Internal notes…"
            className={inputCls + " w-full"}
          />
        </div>
      </div>

      {/* Black sale facilitator */}
      {saleType === "black" && onFacilitatorModeChange && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-2">
          <span className="text-xs font-medium text-muted-foreground">
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
