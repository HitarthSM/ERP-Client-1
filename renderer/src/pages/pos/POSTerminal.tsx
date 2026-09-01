import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { CustomerDetailDrawer } from "../../components/CustomerDetailDrawer";
import { BillingSettings, Customers, CreditApprovals, ClerkUsers, FleetDrivers, Inventory, Locations, Products, Suppliers } from "../../api";
import { get } from "../../lib/http";
import { useAuth } from "../../context/AuthContext";
import type {
  Bill,
  ClerkUser,
  Customer,
  CustomerType,
  Location,
  PaymentTiming,
  Product,
  SaleType,
} from "../../types";
import { useDebounce } from "../../hooks/useDebounce";
import { formatEntityLabel } from "../../lib/entityLabel";
import {
  createDraftSale,
  runPurchaseCheckout,
  runSalesCheckout,
  type CheckoutResult,
  type CheckoutStep,
  type DeliveryInfo,
  type PosPayMethod,
  type PosReceipt,
} from "./checkout";
import { ReceiptDocument } from "./ReceiptDocument";
import { DebtorNoteDocument } from "./DebtorNoteDocument";
import { StatementDocument } from "./StatementDocument";
import { DeliveryNoteDocument } from "./DeliveryNoteDocument";
import { downloadSaleDoc, downloadBillPdf, downloadPurchaseOrderPdf } from "./billReceipt";
import { HeldSalesPanel } from "./HeldSalesPanel";
import { productRate, customerTypeToTier, productTierPrices, type BillLine, type ExtraCharge, type Mode, type PriceTier, type PrintDoc } from "./posHelpers";
import {
  buildLocationStockMap,
  cartQtyForProduct,
  getStockInfo,
  lineExceedsStock,
  saleHasStockIssues,
} from "./posStock";
import { PosToolbar } from "./components/PosToolbar";
import { ProductSearchPanel } from "./components/ProductSearchPanel";
import { CartTable } from "./components/CartTable";
import { CheckoutPanel } from "./components/CheckoutPanel";
import { StepList } from "./components/StepList";
import { SalesOrderHeader } from "./components/sales-order/SalesOrderHeader";
import { CustomerInfoSection } from "./components/sales-order/CustomerInfoSection";
import { ProductDetailsSection } from "./components/sales-order/ProductDetailsSection";
import { PaymentLogisticsSection } from "./components/sales-order/PaymentLogisticsSection";
import { OrderSummarySidebar } from "./components/sales-order/OrderSummarySidebar";
import { PurchaseOrderHeader } from "./components/purchase-order/PurchaseOrderHeader";
import { PurchaseDocumentDetails } from "./components/purchase-order/PurchaseDocumentDetails";
import { PurchaseSupplierInfo } from "./components/purchase-order/PurchaseSupplierInfo";
import { PurchaseLineItems } from "./components/purchase-order/PurchaseLineItems";
import { PurchaseStockPayment } from "./components/purchase-order/PurchaseStockPayment";
import type { QuickChargeTile } from "./components/ProductSearchPanel";
import { creditSaleRequiresApproval, discountedRate, effectiveDiscountPercent, effectiveSkipOverLimitApproval } from "./effectiveBilling";

let lineIdSeq = 100;

function printReceipt() {
  window.print();
}

function BillSuccessModal({
  receipt,
  steps,
  printDoc,
  onPrintDoc,
  onClose,
  pendingCreditApproval,
  creditBalanceAfter,
  creditLimit,
  billId,
}: {
  receipt: PosReceipt;
  steps: CheckoutStep[];
  printDoc: PrintDoc;
  onPrintDoc: (doc: PrintDoc) => void;
  onClose: () => void;
  pendingCreditApproval?: boolean;
  creditBalanceAfter?: number;
  creditLimit?: number;
  billId?: string;
}) {
  const hasGaps = steps.some(
    (s) => s.status === "failed" || s.status === "skipped",
  );
  const failed = steps.some((s) => s.status === "failed");
  const preview =
    printDoc === "debtor" ? (
      <DebtorNoteDocument receipt={receipt} />
    ) : printDoc === "statement" ? (
      <StatementDocument receipt={receipt} />
    ) : printDoc === "delivery" ? (
      <DeliveryNoteDocument receipt={receipt} />
    ) : (
      <ReceiptDocument receipt={receipt} />
    );

  const docButtons: Array<{ id: PrintDoc; label: string }> = [
    { id: "receipt", label: "Receipt" },
    { id: "debtor", label: "Debtor Note" },
    { id: "statement", label: "Statement" },
    { id: "delivery", label: "Delivery Note" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-no-print">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="pos-success-title"
        className="relative flex max-h-[90vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex-shrink-0 border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                pendingCreditApproval
                  ? "bg-amber-500/15 text-amber-600"
                  : receipt.synced && !failed
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-amber-500/15 text-amber-500"
              }`}
            >
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="pos-success-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {pendingCreditApproval
                  ? `Waiting for approval — ${receipt.ref}`
                  : receipt.mode === "sales"
                    ? "Sale complete"
                    : "Purchase order created"}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                {receipt.ref}
              </p>
              <div className="mt-2">
                {pendingCreditApproval ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Waiting for approval — {receipt.ref}
                  </span>
                ) : receipt.synced && !failed ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Synced to server
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Partial sync — review steps
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                $
                {receipt.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {pendingCreditApproval ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              This credit sale exceeds the customer&apos;s limit. The bill is saved as a
              draft and queued for an Org Admin or Manager on{" "}
              <span className="font-medium text-foreground">Pending Approvals</span>.
              Stock is not deducted until approved.
            </p>
          ) : (
            <>
              {receipt.saleType === "credit" && creditBalanceAfter != null && creditLimit != null && (
                <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Updated Credit Balance</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance (owed)</span>
                    <span className="font-semibold tabular-nums">{creditBalanceAfter.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limit</span>
                    <span className="tabular-nums">{creditLimit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={`font-semibold tabular-nums ${(creditLimit - creditBalanceAfter) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(creditLimit - creditBalanceAfter).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {receipt.mode === "sales" && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {docButtons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onPrintDoc(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        printDoc === b.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-border/70 bg-white">
                {preview}
              </div>
            </>
          )}

          {hasGaps && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Checkout steps
              </p>
              <StepList steps={steps} />
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-border bg-card/80 px-5 py-4 backdrop-blur">
          {!pendingCreditApproval && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={printReceipt}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Printer size={15} />
                Print
              </button>
              {receipt.mode === "sales" && billId && (
                <button
                  type="button"
                  onClick={() => void downloadBillPdf(billId)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  PDF
                </button>
              )}
              {receipt.mode === "purchase" && billId && (
                <button
                  type="button"
                  onClick={() => void downloadPurchaseOrderPdf(billId)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  PDF
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {pendingCreditApproval
              ? "New sale"
              : receipt.mode === "sales"
                ? "New sale"
                : "New purchase order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSTerminal({ mode }: { mode: Mode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locationId, setLocationId] = useState("");
  const [lines, setLines] = useState<BillLine[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [payMethod, setPayMethod] = useState<PosPayMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [customerInfo, setCustomerInfo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [success, setSuccess] = useState<{
    receipt: PosReceipt;
    steps: CheckoutStep[];
    pendingCreditApproval?: boolean;
    billId?: string;
  } | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [printDoc, setPrintDoc] = useState<PrintDoc>("receipt");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(
    null,
  );
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("normal");
  const [customerType, setCustomerType] = useState<CustomerType>("regular");
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>("cod");
  const [partialAmount, setPartialAmount] = useState("");
  const [holding, setHolding] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [supplierMode, setSupplierMode] = useState<"old" | "new">("old");
  const [stockNotes, setStockNotes] = useState("");
  /** Bill id being edited via Resume — checkout completes THIS bill instead of creating a new one. */
  const [activeDraftBillId, setActiveDraftBillId] = useState<string | null>(null);
  const [dismissedRejectionIds, setDismissedRejectionIds] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem("pos-dismissed-credit-rejections");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [rejectionsExpanded, setRejectionsExpanded] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryInfo>({});
  const [orderReference, setOrderReference] = useState("");
  // ponytail: fulfillment routing removed — will be per-line when needed
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [facilitatorMode, setFacilitatorMode] = useState<'none' | 'user' | 'name'>('none');
  const [facilitatorUserId, setFacilitatorUserId] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [facilitatorSearchVal, setFacilitatorSearchVal] = useState("");
  const [showFacilitatorSuggestions, setShowFacilitatorSuggestions] = useState(false);

  const { user } = useAuth();
  const orgBrand = {
    orgName: user?.organization?.name,
    logoUrl: user?.organization?.logoUrl,
    orgMeta: [user?.organization?.slug].filter(Boolean).join(" · ") || undefined,
  };
  const userRoles = user?.roles ?? [];
  const canCreateBlackSale = userRoles.some((r) =>
    ["super_admin", "org_admin", "org_manager"].includes(r),
  );

  const debouncedCustomerInfo = useDebounce(customerInfo, 300);

  const { data: locations = [], isLoading: locationsLoading } =
    Locations.useList();
  const { data: inventory = [] } = Inventory.useList();
  const { data: suppliers = [] } = Suppliers.useList(mode === "purchase");
  const { data: productSearch } = Products.useSearch({
    page: 1,
    limit: 20,
    search: searchVal.trim() || undefined,
  });
  const { data: customerSearch } = Customers.useSearch({
    page: 1,
    limit: 8,
    search:
      mode === "sales" &&
      debouncedCustomerInfo.trim().length >= 2 &&
      !customerId
        ? debouncedCustomerInfo.trim()
        : undefined,
    hasCreditLimit: saleType === "credit" ? true : undefined,
    enabled:
      mode === "sales" &&
      debouncedCustomerInfo.trim().length >= 2 &&
      !customerId,
  });
  const { data: selectedCustomer, refetch: refetchSelectedCustomer } = Customers.useGet(
    mode === "sales" && customerId ? customerId : undefined,
  );
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const { data: myRejected = [] } = CreditApprovals.useMyRejected(mode === "sales");
  const { data: typeRules = [] } = BillingSettings.useCustomerTypeRules();
  const { data: orgQuickCharges = [] } = BillingSettings.useQuickCharges({ enabled: true });
  const { data: fleetDrivers = [] } = FleetDrivers.useList(mode === "sales");

  const rejectedNotices = useMemo(
    () => myRejected.filter((r) => !dismissedRejectionIds.includes(r.id)),
    [myRejected, dismissedRejectionIds],
  );

  const dismissRejection = (id: string) => {
    setDismissedRejectionIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      sessionStorage.setItem("pos-dismissed-credit-rejections", JSON.stringify(next));
      return next;
    });
  };

  const dismissAllRejections = () => {
    setDismissedRejectionIds((prev) => {
      const next = [...new Set([...prev, ...rejectedNotices.map((r) => r.id)])];
      sessionStorage.setItem("pos-dismissed-credit-rejections", JSON.stringify(next));
      return next;
    });
    setRejectionsExpanded(false);
  };

  const { data: facilitatorSearch } = ClerkUsers.useSearch({
    page: 1,
    limit: 8,
    query: facilitatorSearchVal.trim(),
    enabled: facilitatorMode === "user" && facilitatorSearchVal.trim().length >= 2 && !facilitatorUserId,
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (locations.length === 0 || locationId) return;
    setLocationId(locations[0].id);
  }, [locations, locationId]);

  const stockLocation = useMemo(
    () => locations.find((l: Location) => l.id === locationId),
    [locations, locationId],
  );
  const orgId = stockLocation?.organizationId;

  const stockMap = useMemo(
    () => buildLocationStockMap(inventory, locationId),
    [inventory, locationId],
  );

  const getProductStock = useCallback(
    (productId: string) =>
      getStockInfo(stockMap, productId, mode === "sales" ? saleType : "normal"),
    [stockMap, saleType, mode],
  );

  const lineOverStock = useCallback(
    (line: BillLine) =>
      mode === "sales" && lineExceedsStock(lines, line, stockMap, saleType),
    [mode, lines, stockMap, saleType],
  );

  const hasStockIssues =
    mode === "sales" && saleHasStockIssues(lines, stockMap, saleType);

  const suggestions: Product[] = useMemo(() => {
    if (!searchVal.trim()) return [];
    const items = productSearch?.items ?? [];
    const q = searchVal.toLowerCase();
    return items
      .filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [productSearch, searchVal]);

  const addProduct = (p: Product) => {
    let addQty = 1;

    if (mode === "sales") {
      const stock = getProductStock(p.id);
      const inCart = cartQtyForProduct(lines, p.id);
      if (!stock.found) {
        toast.error("No stock record at this location — add inventory first");
        return;
      }
      if (stock.available <= 0) {
        toast.error(
          saleType === "black"
            ? "No black stock available for this product"
            : "Out of stock at this location",
        );
        return;
      }
      const room = stock.available - inCart;
      if (room <= 0) {
        toast.error(`Already at max stock (${stock.available} available)`);
        return;
      }
      if (addQty > room) {
        toast.warning(`Only ${room} more available — adding ${room}`);
        addQty = room;
      }
    }

    const tiers = productTierPrices(p);
    const tier = customerTypeToTier(customerType);
    const listRate = tiers[tier];
    const rate =
      mode === "sales"
        ? discountedRate(listRate, effectiveDiscountPercent(selectedCustomer, customerType, typeRules))
        : listRate;
    const sku = formatEntityLabel({ sku: p.sku, id: p.id });
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      setLines((ls) =>
        ls.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + addQty } : l,
        ),
      );
    } else {
      setLines((ls) => [
        ...ls,
        {
          id: ++lineIdSeq,
          productId: p.id,
          sku,
          name: p.name || "Unnamed product",
          qty: addQty,
          rate,
          taxPct: 0,
          unitLabel: p.unit || "pcs",
          officialRate: listRate,
          p1: tiers.p1,
          p2: tiers.p2,
          p3: tiers.p3,
          p4: tiers.p4,
          activeTier: tier,
          storeCode: stockLocation?.name?.slice(0, 1).toUpperCase(),
          manufacturer: p.manufacturer,
          packSize: p.packSize,
        },
      ]);
    }
    setSearchVal("");
    searchRef.current?.focus();
  };

  const handleAddBtn = () => {
    if (suggestions.length > 0) addProduct(suggestions[0]);
  };

  const removeLine = (id: number) =>
    setLines((ls) => ls.filter((l) => l.id !== id));

  const handleLineQtyChange = (lineId: number, newQty: number) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== lineId) return l;
        let qty = Math.max(mode === "sales" ? 0.001 : 1, newQty);
        if (mode === "sales") {
          const stock = getStockInfo(stockMap, l.productId, saleType);
          const others = cartQtyForProduct(ls, l.productId, lineId);
          const maxForLine = Math.max(0.001, stock.available - others);
          if (!stock.found) {
            toast.error("No stock record for this product at this location");
            return l;
          }
          if (qty > maxForLine) {
            toast.warning(`Max ${maxForLine} for this line (${stock.available} available total)`);
            qty = maxForLine;
          }
        }
        return { ...l, qty };
      }),
    );
  };

  const handleRateChange = (lineId: number, rate: number) => {
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, rate } : l)));
  };

  const handleTierSelect = (lineId: number, tier: PriceTier) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== lineId) return l;
        const listRate = l[tier] ?? l.rate;
        const rate = discountedRate(
          listRate,
          effectiveDiscountPercent(selectedCustomer, customerType, typeRules),
        );
        return { ...l, activeTier: tier, rate, officialRate: listRate };
      }),
    );
  };

  useEffect(() => {
    if (mode !== "sales" || lines.length === 0) return;
    const tier = customerTypeToTier(customerType);
    setLines((ls) =>
      ls.map((l) => {
        const listRate = l[tier] ?? l.officialRate;
        const rate = discountedRate(
          listRate,
          effectiveDiscountPercent(selectedCustomer, customerType, typeRules),
        );
        return { ...l, activeTier: tier, rate, officialRate: listRate };
      }),
    );
  }, [customerType, selectedCustomer?.id, typeRules]);


  const handleDriverSelect = (driverId: string) => {
    setSelectedDriverId(driverId);
    const d = fleetDrivers.find((x) => x.id === driverId);
    if (d) {
      setDelivery((prev) => ({
        ...prev,
        driverName: `${d.firstName} ${d.lastName}`.trim(),
        license: d.licenseNumber,
      }));
      setShowDelivery(true);
    } else {
      setDelivery((prev) => ({ ...prev, driverName: undefined, license: undefined }));
    }
  };

  const addQuickCharge = (c: QuickChargeTile) => {
    setExtraCharges((ec) => [
      ...ec,
      { id: Date.now(), label: c.label, amount: c.amount },
    ]);
  };
  const removeCharge = (id: number) =>
    setExtraCharges((ec) => ec.filter((c) => c.id !== id));

  const lineUnits = (l: typeof lines[0]) => mode === 'purchase' ? l.qty * (l.packSize ?? 1) : l.qty;
  const subtotal = lines.reduce((s, l) => s + lineUnits(l) * l.rate, 0);
  const totalTax = lines.reduce((s, l) => s + (lineUnits(l) * l.rate * l.taxPct) / 100, 0);
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = subtotal + totalTax + extraTotal;
  const blackMarkup = saleType === "black" ? lines.reduce((s, l) => s + (l.rate - l.officialRate) * l.qty, 0) : 0;
  const creditLimit = Number(selectedCustomer?.creditLimit ?? 0);
  const creditBalance = Number(selectedCustomer?.creditBalance ?? 0);
  const creditRemaining = creditLimit - creditBalance;
  const skipOverLimitApproval = effectiveSkipOverLimitApproval(selectedCustomer, customerType, typeRules);
  const creditOverLimit =
    saleType === "credit" &&
    !!customerId &&
    creditLimit > 0 &&
    creditBalance + grandTotal > creditLimit;
  const creditNeedsApproval =
    saleType === "credit" &&
    !!customerId &&
    creditSaleRequiresApproval(creditLimit, creditBalance, grandTotal, skipOverLimitApproval);
  const creditOverLimitException = creditOverLimit && skipOverLimitApproval;
  const creditMissingCustomer = mode === "sales" && saleType === "credit" && !customerId;
  const creditMissingLimit =
    mode === "sales" &&
    saleType === "credit" &&
    !!customerId &&
    selectedCustomer != null &&
    (selectedCustomer.creditLimit == null || Number(selectedCustomer.creditLimit) <= 0);
  const deliveryPayload: DeliveryInfo | undefined =
    showDelivery || delivery.driverName || delivery.note
      ? Object.fromEntries(
          Object.entries(delivery).filter(([, v]) => String(v ?? "").trim() !== ""),
        )
      : undefined;

  const fulfillmentStoreNames: string[] = [];

  const listSubtotal = lines.reduce((s, l) => s + l.qty * (l.officialRate ?? l.rate), 0);
  const discountAmount = Math.max(0, listSubtotal - subtotal);
  const grandTotalWithBalance = grandTotal + (customerId ? creditBalance : 0);
  const saleRef = activeDraftBillId
    ? `DRAFT-${activeDraftBillId.slice(0, 8).toUpperCase()}`
    : "SO-NEW";

  const voidBill = () => {
    setLines([]);
    setExtraCharges([]);
    setCustomerInfo("");
    setCustomerId("");
    setSupplierRef("");
    setSearchVal("");
    setCashTendered("");
    setPaymentReference("");
    setCheckoutResult(null);
    setSaleType("normal");
    setCustomerType("regular");
    setPaymentTiming("cod");
    setPartialAmount("");
    setFacilitatorMode("none");
    setFacilitatorUserId("");
    setFacilitatorName("");
    setCommissionPct("");
    setFacilitatorSearchVal("");
    setShowDelivery(false);
    setDelivery({});
    setOrderReference("");
    setSelectedDriverId("");
    setPrintDoc("receipt");
    setActiveDraftBillId(null);
  };

  const closeSuccess = () => {
    setSuccess(null);
    voidBill();
    searchRef.current?.focus();
  };

  const cashShort =
    mode === "sales" &&
    payMethod === "cash" &&
    grandTotal > 0 &&
    (cashTendered === "" ||
      isNaN(Number(cashTendered)) ||
      Number(cashTendered) < grandTotal);

  const partialAmountMissing =
    mode === "sales" &&
    paymentTiming === "half" &&
    (partialAmount === "" ||
      isNaN(Number(partialAmount)) ||
      Number(partialAmount) <= 0);

  const buildLinePayload = () =>
    lines.map((l) => ({
      productId: l.productId,
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      unitPrice: l.rate,
      taxPct: l.taxPct,
      packSize: mode === 'purchase' ? l.packSize : undefined,
    }));

  const generateBill = async () => {
    if (lines.length === 0 || checkingOut || cashShort || partialAmountMissing) return;
    setCheckingOut(true);
    setCheckoutResult(null);
    try {
      const linePayload = buildLinePayload();

      const supplier = suppliers.find((s) => s.id === supplierId);

      const result =
        mode === "sales"
          ? await runSalesCheckout({
              storeName: stockLocation?.name,
              locationId: locationId || undefined,
              locationName: stockLocation?.name,
              inventory,
              orgId,
              customerId: customerId.trim() || undefined,
              paymentMethod: payMethod,
              paymentReference: paymentReference.trim() || undefined,
              amountReceived: cashTendered ? Number(cashTendered) : undefined,
              customerInfo,
              lines: linePayload,
              extraCharges,
              subtotal,
              taxAmount: totalTax,
              totalAmount: grandTotal,
              saleType,
              customerType,
              paymentTiming,
              partialAmount:
                paymentTiming === "half" ? Number(partialAmount) : undefined,
              creditLimit: selectedCustomer?.creditLimit ?? undefined,
              creditBalance: selectedCustomer?.creditBalance ?? undefined,
              delivery: deliveryPayload,
              facilitatorUserId: facilitatorMode === "user" ? facilitatorUserId : undefined,
              facilitatorName: facilitatorMode === "name" ? facilitatorName : undefined,
              commissionPct: commissionPct ? Number(commissionPct) : undefined,
              existingBillId: activeDraftBillId ?? undefined,
              orderReference: orderReference.trim() || undefined,
              fulfillmentStores: fulfillmentStoreNames.length ? fulfillmentStoreNames : undefined,
            })
          : await runPurchaseCheckout({
              storeName: stockLocation?.name,
              locationName: stockLocation?.name,
              inventory,
              orgId,
              supplierId: supplierId || undefined,
              supplierName: supplier?.name,
              supplierRef,
              lines: linePayload,
              subtotal,
              taxAmount: totalTax,
              totalAmount: grandTotal,
            });

      setCheckoutResult(result);
      if (result.primaryOk) {
        const brandedReceipt = { ...result.receipt, ...orgBrand };
        setPrintDoc("receipt");
        setLastReceipt(brandedReceipt);
        setSuccess({
          receipt: brandedReceipt,
          steps: result.steps,
          pendingCreditApproval: result.pendingCreditApproval,
          billId: result.billId,
        });
        if (saleType === "credit" && customerId) {
          void refetchSelectedCustomer();
        }
      }
    } finally {
      setCheckingOut(false);
    }
  };

  // Reuses the bill-create path (create -> DRAFT) via checkout.ts's createDraftSale,
  // but never calls the COMPLETED transition — the bill stays a resumable draft.
  const holdSale = async () => {
    if (lines.length === 0 || holding || partialAmountMissing || !locationId) return;
    setHolding(true);
    setCheckoutResult(null);
    try {
      const result = await createDraftSale({
        storeName: stockLocation?.name,
        locationId: locationId || undefined,
        locationName: stockLocation?.name,
        inventory,
        orgId,
        customerId: customerId.trim() || undefined,
        paymentMethod: payMethod,
        paymentReference: paymentReference.trim() || undefined,
        amountReceived: cashTendered ? Number(cashTendered) : undefined,
        customerInfo,
        lines: buildLinePayload(),
        extraCharges,
        subtotal,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        saleType,
        customerType,
        paymentTiming,
        partialAmount: paymentTiming === "half" ? Number(partialAmount) : undefined,
        creditLimit: selectedCustomer?.creditLimit ?? undefined,
        creditBalance: selectedCustomer?.creditBalance ?? undefined,
        delivery: deliveryPayload,
        facilitatorUserId: facilitatorMode === "user" ? facilitatorUserId : undefined,
        facilitatorName: facilitatorMode === "name" ? facilitatorName : undefined,
        commissionPct: commissionPct ? Number(commissionPct) : undefined,
        existingBillId: activeDraftBillId ?? undefined,
        orderReference: orderReference.trim() || undefined,
        fulfillmentStores: fulfillmentStoreNames.length ? fulfillmentStoreNames : undefined,
      });
      if (result.billId) {
        toast.success(`Sale held as draft — ${result.receipt.ref}`);
        voidBill();
      } else {
        setCheckoutResult({ receipt: result.receipt, steps: result.steps, primaryOk: false });
      }
    } finally {
      setHolding(false);
    }
  };

  const resumeSale = async (billId: string) => {
    try {
      const bill = await get<Bill>(`/api/v1/bills/${billId}`);
      const items = bill.items ?? [];
      const products = await Promise.all(
        items.map((it) =>
          get<Product>(`/api/v1/products/${it.productId}`).catch(() => null),
        ),
      );
      setLines(
        items.map((it, idx) => {
          const p = products[idx];
          return {
            id: ++lineIdSeq,
            productId: it.productId,
            sku: p
              ? formatEntityLabel({ sku: p.sku, id: p.id })
              : it.productId.slice(0, 8),
            name: p?.name || "Item",
            qty: it.quantity,
            rate: it.unitPrice,
            taxPct: it.taxRate,
            unitLabel: p?.unit || "pcs",
            officialRate: p ? productRate(p, mode) : it.unitPrice,
          };
        }),
      );
      setCustomerId(bill.customerId || "");
      setCustomerInfo(
        bill.walkInName ||
          (bill.customerId ? `Customer ${bill.customerId.slice(0, 8)}…` : ""),
      );
      if (bill.locationId) setLocationId(bill.locationId);
      setSaleType((bill.saleType as SaleType) || "normal");
      setCustomerType((bill.customerType as CustomerType) || "regular");
      setPaymentTiming((bill.paymentTiming as PaymentTiming) || "cod");
      setPartialAmount(
        bill.partialAmount != null ? String(bill.partialAmount) : "",
      );
      setShowHeldSales(false);
      setActiveDraftBillId(bill.id);
      toast.success(`Resumed ${bill.billNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume sale");
    }
  };

  const resumeSaleRef = useRef(resumeSale);
  resumeSaleRef.current = resumeSale;
  const resumeBillId = searchParams.get("resumeBillId");
  useEffect(() => {
    if (mode !== "sales" || !resumeBillId) return;
    let cancelled = false;
    void resumeSaleRef.current(resumeBillId).finally(() => {
      if (cancelled) return;
      setSearchParams(
        (prev) => {
          if (!prev.get("resumeBillId")) return prev;
          const next = new URLSearchParams(prev);
          next.delete("resumeBillId");
          return next;
        },
        { replace: true },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [mode, resumeBillId, setSearchParams]);

  const handleCustomerSelect = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerInfo(
      formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }),
    );
    setCustomerType((c.customerType as CustomerType) || "regular");
    if (c.creditLimit != null && Number(c.creditLimit) > 0) {
      setSaleType("credit");
    }
    setShowCustomerSuggestions(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerInfo(
      formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id }),
    );
    setCustomerType((customer.customerType as CustomerType) || "new");
    if (customer.creditLimit != null && Number(customer.creditLimit) > 0) {
      setSaleType("credit");
    }
    setShowCreateCustomer(false);
  };

  const handleClearCustomer = () => {
    setCustomerId("");
    setCustomerInfo("");
  };

  const handleNewSupplierCreated = (s: { id: string }) => {
    setSupplierId(s.id);
    setSupplierMode("old");
  };

  const handleCustomerInfoChange = (v: string) => {
    setCustomerInfo(v);
    setCustomerId("");
  };

  const handleFacilitatorUserSelect = (u: ClerkUser) => {
    setFacilitatorUserId(u.id);
    setFacilitatorSearchVal(`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email);
    setShowFacilitatorSuggestions(false);
  };

  const accentCls =
    mode === "sales"
      ? {
          btn: "bg-primary hover:bg-primary/90",
          light: "bg-primary/10 text-primary border-primary/30",
          badge: "bg-primary/15 text-primary",
        }
      : {
          btn: "bg-orange-500 hover:bg-orange-600",
          light: "bg-orange-50 text-orange-700 border-orange-200",
          badge: "bg-orange-100 text-orange-700",
        };

  const modeShellCls =
    mode === "sales" && saleType === "credit"
      ? "ring-1 ring-inset ring-amber-400/40 bg-amber-500/[0.04]"
      : mode === "sales" && saleType === "black"
        ? "ring-1 ring-inset ring-slate-400/40 bg-slate-500/[0.05]"
        : "";

  const handlePrintDoc = (doc: PrintDoc) => {
    setPrintDoc(doc);
    // Let React paint the selected print root before opening the dialog.
    requestAnimationFrame(() => printReceipt());
  };

  const shareToDriver = () => {
    const driver = fleetDrivers.find((d) => d.id === selectedDriverId);
    if (!driver?.phone) {
      toast.error("Select a driver with a phone number");
      return;
    }
    const receipt = success?.receipt ?? lastReceipt;
    const text = receipt
      ? `Delivery for ${receipt.ref} — Total ${receipt.totalAmount.toFixed(2)}`
      : "New delivery assignment";
    const phone = driver.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const generateDisabled =
    lines.length === 0 ||
    checkingOut ||
    cashShort ||
    partialAmountMissing ||
    creditMissingCustomer ||
    creditMissingLimit ||
    hasStockIssues ||
    (mode === "sales" && !locationId) ||
    (mode === "purchase" && !supplierId);

  const holdDisabled =
    lines.length === 0 || holding || partialAmountMissing || !locationId;

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${modeShellCls}`}>
      {mode === "sales" && rejectedNotices.length > 0 && (
        <div className="pos-no-print flex-shrink-0 border-b border-amber-200/80 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
              {rejectedNotices.length === 1
                ? "1 credit sale was rejected"
                : `${rejectedNotices.length} credit sales were rejected`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-amber-700/30 bg-white/70 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
                onClick={() => setRejectionsExpanded((v) => !v)}
              >
                {rejectionsExpanded ? "Hide" : "Review"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-700/30 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-200"
                onClick={dismissAllRejections}
              >
                Dismiss all
              </button>
            </div>
          </div>
          {rejectionsExpanded && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto border-t border-amber-200/60 px-4 py-2 dark:border-amber-800/40">
              {rejectedNotices.map((req) => {
                const billNo = req.bill?.billNumber || req.billId.slice(0, 8);
                return (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-950 dark:text-amber-100"
                  >
                    <p className="font-mono text-xs font-medium">{billNo}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
                        onClick={() => {
                          dismissRejection(req.id);
                          void resumeSale(req.billId);
                        }}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-amber-700/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
                        onClick={() => dismissRejection(req.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {mode === "sales" ? (
        <>
          <SalesOrderHeader
            onHoldSale={() => void holdSale()}
            holding={holding}
            holdDisabled={holdDisabled}
            onShowHeldSales={() => setShowHeldSales(true)}
            onCompleteSale={() => void generateBill()}
            generateDisabled={generateDisabled}
            checkingOut={checkingOut}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <CustomerInfoSection
                saleRef={saleRef}
                orderReference={orderReference}
                onOrderReferenceChange={setOrderReference}
                customerInfo={customerInfo}
                onCustomerInfoChange={handleCustomerInfoChange}
                customerId={customerId}
                onCustomerSelect={handleCustomerSelect}
                onClearCustomer={handleClearCustomer}
                selectedCustomer={selectedCustomer}
                customerType={customerType}
                onCustomerTypeChange={setCustomerType}
                saleType={saleType}
                onSaleTypeChange={setSaleType}
                canCreateBlackSale={canCreateBlackSale}
                creditBalance={creditBalance}
                billedBy={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Admin"}
                transactionDate={transactionDate}
                onTransactionDateChange={setTransactionDate}
                locations={locations}
                locationId={locationId}
                onLocationChange={setLocationId}
              />

              <ProductDetailsSection
                saleType={saleType}
                searchRef={searchRef}
                searchVal={searchVal}
                onSearchChange={setSearchVal}
                onEnter={handleAddBtn}
                suggestions={suggestions}
                onAddProduct={addProduct}
                getStockInfo={getProductStock}
                lineOverStock={lineOverStock}
                hasStockIssues={hasStockIssues}
                lines={lines}
                extraCharges={extraCharges}
                onQtyChange={handleLineQtyChange}
                onRateChange={handleRateChange}
                onRemoveLine={removeLine}
                onRemoveCharge={removeCharge}
                storeCode={stockLocation?.name?.slice(0, 1).toUpperCase()}
                checkoutResult={checkoutResult}
                showCheckoutFailureBanner={!!checkoutResult && !success}
              />

              <PaymentLogisticsSection
                paymentReference={paymentReference}
                onPaymentReferenceChange={setPaymentReference}
                paymentTiming={paymentTiming}
                onPaymentTimingChange={setPaymentTiming}
                partialAmount={partialAmount}
                onPartialAmountChange={setPartialAmount}
                partialAmountMissing={partialAmountMissing}
                notes={delivery.note ?? ""}
                onNotesChange={(note) => {
                  setDelivery((d) => ({ ...d, note }));
                  setShowDelivery(true);
                }}
                drivers={fleetDrivers}
                selectedDriverId={selectedDriverId}
                onDriverSelect={handleDriverSelect}
                delivery={delivery}
                onDeliveryChange={(d) => {
                  setDelivery(d);
                  setShowDelivery(true);
                }}
                saleType={saleType}
                blackMarkup={blackMarkup}
                facilitatorMode={facilitatorMode}
                onFacilitatorModeChange={setFacilitatorMode}
                facilitatorName={facilitatorName}
                onFacilitatorNameChange={setFacilitatorName}
                commissionPct={commissionPct}
                onCommissionPctChange={setCommissionPct}
              />
            </div>

            <OrderSummarySidebar
              subtotal={subtotal}
              totalTax={totalTax}
              extraTotal={extraTotal}
              discountAmount={discountAmount}
              previousBalance={customerId ? creditBalance : 0}
              grandTotal={grandTotal}
              payMethod={payMethod}
              onPayMethodChange={setPayMethod}
              cashTendered={cashTendered}
              onCashTenderedChange={setCashTendered}
              grandTotalWithBalance={grandTotalWithBalance}
              saleType={saleType}
              creditNeedsApproval={creditNeedsApproval}
              creditOverLimitException={creditOverLimitException}
              creditMissingCustomer={creditMissingCustomer}
              creditMissingLimit={creditMissingLimit}
              hasStockIssues={hasStockIssues}
              generateDisabled={generateDisabled}
              checkingOut={checkingOut}
              onCompleteSale={() => void generateBill()}
              onPrintBill={() => handlePrintDoc("receipt")}
              onDeliveryNote={() => handlePrintDoc("delivery")}
              onShareToDriver={shareToDriver}
              hasReceipt={!!lastReceipt || !!success}
              hasDriver={!!selectedDriverId}
            />
          </div>
        </>
      ) : (
        /* ── Purchase screen — form-based redesign ── */
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PurchaseOrderHeader
            onCancel={voidBill}
            onSubmit={() => void generateBill()}
            generateDisabled={generateDisabled}
            checkingOut={checkingOut}
          />

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {/* Row 1: Document Details + Supplier Info */}
            <div className="grid grid-cols-2 gap-4">
              <PurchaseDocumentDetails
                supplierMode={supplierMode}
                onSupplierModeChange={setSupplierMode}
                purchaseDate={purchaseDate}
                onPurchaseDateChange={setPurchaseDate}
                supplierRef={supplierRef}
                onSupplierRefChange={setSupplierRef}
                billedBy={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Admin"}
              />

              <PurchaseSupplierInfo
                supplierMode={supplierMode}
                suppliers={suppliers}
                supplierId={supplierId}
                onSupplierChange={setSupplierId}
                selectedSupplier={suppliers.find((s) => s.id === supplierId)}
                onNewSupplierCreated={handleNewSupplierCreated}
              />
            </div>

            {/* Row 2: Line Items */}
            <PurchaseLineItems
              searchRef={searchRef}
              searchVal={searchVal}
              onSearchChange={setSearchVal}
              onEnter={handleAddBtn}
              suggestions={suggestions}
              onAddProduct={addProduct}
              lines={lines}
              extraCharges={extraCharges}
              onQtyChange={handleLineQtyChange}
              onRateChange={handleRateChange}
              onRemoveLine={removeLine}
              onRemoveCharge={removeCharge}
              checkoutResult={checkoutResult}
              showCheckoutFailureBanner={!!checkoutResult && !success}
            />

            {/* Row 3: Stock Information + Payment Summary */}
            <PurchaseStockPayment
              stockNotes={stockNotes}
              onStockNotesChange={setStockNotes}
              subtotal={subtotal}
              totalTax={totalTax}
              grandTotal={grandTotal}
              payMethod={payMethod}
              onPayMethodChange={setPayMethod}
              cashTendered={cashTendered}
              onCashTenderedChange={setCashTendered}
              generateDisabled={generateDisabled}
              checkingOut={checkingOut}
              onSubmit={() => void generateBill()}
              onCancel={voidBill}
            />
          </div>

          {/* Footer action bar */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-card px-6 py-3">
            <button
              type="button"
              onClick={voidBill}
              className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={generateDisabled}
              onClick={() => void generateBill()}
              className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {checkingOut ? "Processing…" : "Submit Transaction"}
            </button>
          </div>
        </div>
      )}

      {success && (
        <BillSuccessModal
          receipt={success.receipt}
          steps={success.steps}
          printDoc={printDoc}
          onPrintDoc={handlePrintDoc}
          onClose={closeSuccess}
          pendingCreditApproval={success.pendingCreditApproval}
          creditBalanceAfter={success.receipt.saleType === 'credit' ? selectedCustomer?.creditBalance : undefined}
          creditLimit={success.receipt.saleType === 'credit' ? selectedCustomer?.creditLimit ?? undefined : undefined}
          billId={success.billId}
        />
      )}

      {(success?.receipt || lastReceipt) && (
        <div className="pos-print-root" aria-hidden>
          {(() => {
            const r = success?.receipt ?? lastReceipt!;
            if (printDoc === "debtor") return <DebtorNoteDocument receipt={r} />;
            if (printDoc === "statement") return <StatementDocument receipt={r} />;
            if (printDoc === "delivery") return <DeliveryNoteDocument receipt={r} />;
            return <ReceiptDocument receipt={r} />;
          })()}
        </div>
      )}

      {showHeldSales && (
        <HeldSalesPanel
          onClose={() => setShowHeldSales(false)}
          onResume={(bill) => void resumeSale(bill.id)}
        />
      )}

      {customerId && (
        <CustomerDetailDrawer
          customerId={customerId}
          open={customerDrawerOpen}
          onClose={() => setCustomerDrawerOpen(false)}
          onCreditUpdated={() => void refetchSelectedCustomer()}
        />
      )}
    </div>
  );
}
