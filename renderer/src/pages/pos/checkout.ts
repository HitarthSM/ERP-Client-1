import { patch, post, put, get, del } from '../../lib/http';
import { getErrorMessage, parseCreditApprovalError } from '../../lib/api-error';
import type { Bill, InventoryItem, PaymentMethod, SaleType, CustomerType, PaymentTiming } from '../../types';

export type CheckoutStepStatus = 'ok' | 'failed' | 'skipped';

export interface CheckoutStep {
  name: string;
  status: CheckoutStepStatus;
  message?: string;
  entityId?: string;
}

export interface PosLineInput {
  productId: string;
  sku?: string;
  name?: string;
  qty: number;
  unitPrice: number;
  taxPct: number;
  /** Units per pack — present only for pack products in purchase mode */
  packSize?: number;
}

export type PosPayMethod = 'cash' | 'mpesa' | 'till' | 'bank' | 'other';

export interface DeliveryInfo {
  driverName?: string;
  companionName?: string;
  vehicleNumber?: string;
  license?: string;
  location?: string;
  distance?: string;
  gps?: string;
  note?: string;
  rating?: string;
}

export interface PosReceipt {
  ref: string;
  mode: 'sales' | 'purchase';
  storeName?: string;
  partyLabel?: string;
  paymentMethod?: string;
  paymentReference?: string;
  saleType?: SaleType | string;
  paymentTiming?: PaymentTiming | string;
  creditLimit?: number;
  creditBalance?: number;
  delivery?: DeliveryInfo;
  lines: Array<{
    sku: string;
    name: string;
    qty: number;
    rate: number;
    taxPct: number;
    lineTotal: number;
  }>;
  extraCharges: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  synced: boolean;
  orgName?: string;
  logoUrl?: string;
  orgMeta?: string;
  orgPhone?: string;
  orgAddress?: string;
}

export interface CheckoutResult {
  receipt: PosReceipt;
  steps: CheckoutStep[];
  /** True when a printable receipt was issued (always for valid cart). */
  primaryOk: boolean;
  /** Bill saved as draft and sent to Pending Approvals (credit over limit). */
  pendingCreditApproval?: boolean;
  approvalRequestId?: string;
  billId?: string;
}

export interface SalesCheckoutInput {
  storeName?: string;
  /** Locations UUID — bill.locationId and stock source. */
  locationId?: string;
  locationName?: string;
  inventory?: InventoryItem[];
  orgId?: string;
  customerId?: string;
  paymentMethod: PosPayMethod;
  paymentReference?: string;
  amountReceived?: number;
  customerInfo?: string;
  lines: PosLineInput[];
  extraCharges: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  // ── Sales v2 fields ──
  saleType?: SaleType | string;
  customerType?: CustomerType | string;
  paymentTiming?: PaymentTiming | string;
  partialAmount?: number;
  creditLimit?: number;
  creditBalance?: number;
  delivery?: DeliveryInfo;
  facilitatorUserId?: string;
  facilitatorName?: string;
  commissionPct?: number;
  existingBillId?: string;
  orderReference?: string;
  fulfillmentStores?: string[];
}

export interface PurchaseCheckoutInput {
  storeName?: string;
  locationName?: string;
  inventory?: InventoryItem[];
  orgId?: string;
  supplierId?: string;
  supplierName?: string;
  supplierRef?: string;
  lines: PosLineInput[];
  extraCharges?: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

async function tryStep<T>(
  name: string,
  fn: () => Promise<T>,
  idOf?: (r: T) => string | undefined,
): Promise<{ step: CheckoutStep; result?: T }> {
  try {
    const result = await fn();
    return {
      result,
      step: { name, status: 'ok', entityId: idOf?.(result), message: 'Created' },
    };
  } catch (e) {
    return {
      step: {
        name,
        status: 'failed',
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

function skipped(name: string, message: string): CheckoutStep {
  return { name, status: 'skipped', message };
}

function localRef(prefix: string) {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${stamp}`;
}

function buildReceiptLines(lines: PosLineInput[]) {
  return lines.map((l) => {
    const units = l.qty * (l.packSize ?? 1);
    const lineTax = (units * l.unitPrice * l.taxPct) / 100;
    return {
      sku: l.sku || l.productId.slice(0, 8),
      name: l.name || 'Item',
      qty: units,
      rate: l.unitPrice,
      taxPct: l.taxPct,
      lineTotal: units * l.unitPrice + lineTax,
    };
  });
}


function toBillPaymentMethod(method: PosPayMethod): PaymentMethod {
  switch (method) {
    case 'mpesa':
    case 'till':
      return 'UPI';
    case 'bank':
      return 'NET_BANKING';
    case 'other':
      return 'CHEQUE';
    default:
      return 'CASH';
  }
}

export interface DraftSaleResult {
  /** Present only when the bill made it to DRAFT; steps carry the failure reason otherwise. */
  billId?: string;
  receipt: PosReceipt;
  steps: CheckoutStep[];
}

/**
 * Updates an existing DRAFT bill (from Held Sales) instead of creating a new one.
 */
async function updateDraftSale(
  billId: string,
  input: SalesCheckoutInput,
  walkInName: string | undefined,
  steps: CheckoutStep[],
  notesParts: string[],
): Promise<{ billId: string; bill?: Bill; steps: CheckoutStep[] }> {
  const headerAttempt = await tryStep(
    'Update held bill',
    () =>
      put<Bill>(`/api/v1/bills/${billId}`, {
        locationId: input.locationId,
        customerId: input.customerId?.trim() || undefined,
        walkInName: input.customerId?.trim() ? undefined : walkInName,
        notes: notesParts.length ? notesParts.join(' · ') : undefined,
        saleType: input.saleType,
        customerType: input.customerType,
        paymentTiming: input.paymentTiming,
        partialAmount: input.paymentTiming === 'half' ? input.partialAmount : undefined,
        facilitatorUserId: input.facilitatorUserId,
        facilitatorName: input.facilitatorName,
        commissionPct: input.commissionPct,
      }),
    (b) => b.id,
  );
  steps.push(headerAttempt.step);
  if (headerAttempt.step.status === 'failed') {
    return { billId: '', steps };
  }

  const loadAttempt = await tryStep('Load held bill items', () => get<Bill>(`/api/v1/bills/${billId}`));
  steps.push(loadAttempt.step);
  if (loadAttempt.step.status === 'failed') {
    return { billId: '', steps };
  }

  for (const item of loadAttempt.result?.items ?? []) {
    const removeAttempt = await tryStep(`Remove old item ${item.id.slice(0, 8)}…`, () =>
      del(`/api/v1/bills/${billId}/items/${item.id}`),
    );
    steps.push(removeAttempt.step);
  }

  let latestBill: Bill | undefined = headerAttempt.result;
  for (const l of input.lines) {
    const addAttempt = await tryStep(
      `Add item: ${l.name || l.sku || l.productId.slice(0, 8)}`,
      () =>
        post<Bill>(`/api/v1/bills/${billId}/items`, {
          productId: l.productId,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          taxRate: l.taxPct,
        }),
      (b) => b.id,
    );
    steps.push(addAttempt.step);
    if (addAttempt.step.status === 'failed') {
      return { billId: '', steps };
    }
    if (addAttempt.result) latestBill = addAttempt.result;
  }

  return { billId, bill: latestBill, steps };
}

/**
 * Shared "create bill (INITIATED) → mark DRAFT" path, used by both `runSalesCheckout`
 * (which continues on to COMPLETED) and `holdSale` in POSTerminal.tsx (which stops here).
 */
export async function createDraftSale(input: SalesCheckoutInput): Promise<DraftSaleResult> {
  const steps: CheckoutStep[] = [];
  const walkInName =
    input.customerInfo?.trim() ||
    (input.customerId ? undefined : 'Walk-in');
  const receipt: PosReceipt = {
    ref: localRef('POS'),
    mode: 'sales',
    storeName: input.storeName ?? input.locationName,
    partyLabel:
      input.customerInfo?.trim() ||
      (input.customerId ? `Customer ${input.customerId.slice(0, 8)}…` : 'Walk-in'),
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference?.trim() || undefined,
    saleType: input.saleType,
    paymentTiming: input.paymentTiming,
    creditLimit: input.creditLimit,
    creditBalance: input.creditBalance,
    delivery: input.delivery,
    lines: buildReceiptLines(input.lines),
    extraCharges: input.extraCharges,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (!input.locationId) {
    steps.push({
      name: 'Validate location',
      status: 'failed',
      message: 'Select a stock location — required for sales bills',
    });
    return { receipt, steps };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Cart is empty' });
    return { receipt, steps };
  }
  if (!input.customerId?.trim() && !walkInName) {
    steps.push({
      name: 'Validate customer',
      status: 'failed',
      message: 'Walk-in name or customer is required',
    });
    return { receipt, steps };
  }
  if (input.paymentTiming === 'half' && !(Number(input.partialAmount) > 0)) {
    steps.push({
      name: 'Validate payment timing',
      status: 'failed',
      message: 'Enter a partial amount greater than 0 for half payment',
    });
    return { receipt, steps };
  }

  steps.push({
    name: 'Local receipt',
    status: 'ok',
    message: `Issued ${receipt.ref} — ready to print`,
  });

  if (input.extraCharges.length > 0) {
    steps.push(
      skipped(
        'Extra charges',
        'Extra charges stay on the local receipt only (bill lines are products).',
      ),
    );
  }

  const notesParts: string[] = [];
  if (input.extraCharges.length > 0) {
    notesParts.push(
      `POS extras: ${input.extraCharges.map((c) => `${c.label}=${c.amount}`).join(', ')}`,
    );
  }
  if (input.storeName) notesParts.push(`Store: ${input.storeName}`);
  if (input.paymentReference?.trim()) {
    notesParts.push(`Pay ref: ${input.paymentReference.trim()}`);
  }
  if (input.orderReference?.trim()) {
    notesParts.push(`Ref: ${input.orderReference.trim()}`);
  }
  if (input.fulfillmentStores?.length) {
    notesParts.push(`Fulfillment: ${input.fulfillmentStores.join(', ')}`);
  }
  if (input.delivery?.driverName) {
    notesParts.push(`Driver: ${input.delivery.driverName}`);
  }

  if (input.existingBillId) {
    const updateAttempt = await updateDraftSale(input.existingBillId, input, walkInName, steps, notesParts);
    if (!updateAttempt.billId) return { receipt, steps };
    return { receipt, steps, billId: updateAttempt.billId };
  }

  const createAttempt = await tryStep(
    'Create bill',
    () =>
      post<Bill>('/api/v1/bills', {
        locationId: input.locationId,
        customerId: input.customerId?.trim() || undefined,
        walkInName: input.customerId?.trim() ? undefined : walkInName,
        notes: notesParts.length ? notesParts.join(' · ') : undefined,
        items: input.lines.map((l) => ({
          productId: l.productId,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          taxRate: l.taxPct,
        })),
        // Sales v2 fields
        saleType: input.saleType,
        customerType: input.customerType,
        paymentTiming: input.paymentTiming,
        partialAmount: input.paymentTiming === 'half' ? input.partialAmount : undefined,
        facilitatorUserId: input.facilitatorUserId,
        facilitatorName: input.facilitatorName,
        commissionPct: input.commissionPct,
      }),
    (b) => b.id,
  );
  steps.push(createAttempt.step);

  if (!createAttempt.result?.id) {
    const msg = createAttempt.step.message || '';
    if (/internal server error/i.test(msg)) {
      steps.push({
        name: 'Create bill hint',
        status: 'failed',
        message:
          'Server 500 on bill create — usually createdById fallback (BillsController has no ClerkAuthGuard). Needs core-apis fix; client payload is valid.',
      });
    }
    return { receipt, steps };
  }

  const billId = createAttempt.result.id;
  if (createAttempt.result.billNumber) {
    receipt.ref = createAttempt.result.billNumber;
  }

  const draftAttempt = await tryStep(
    'Mark draft',
    () => patch<Bill>(`/api/v1/bills/${billId}/status`, { status: 'DRAFT' }),
    (b) => b.id,
  );
  steps.push(draftAttempt.step);
  if (draftAttempt.step.status === 'failed') {
    return { receipt, steps };
  }

  return { receipt, steps, billId };
}

/**
 * Sales: POST bill (INITIATED) → PATCH DRAFT → PATCH COMPLETED.
 * Stock is deducted on the server when COMPLETED — no client stock-remove.
 */
export async function runSalesCheckout(input: SalesCheckoutInput): Promise<CheckoutResult> {
  const { receipt, steps, billId } = await createDraftSale(input);
  if (!billId) {
    return { receipt, steps, primaryOk: false };
  }

  let completeBill: Bill | undefined;
  try {
    completeBill = await patch<Bill>(`/api/v1/bills/${billId}/status`, {
      status: 'COMPLETED',
      paymentMethod: toBillPaymentMethod(input.paymentMethod),
    });
    steps.push({
      name: 'Complete bill',
      status: 'ok',
      entityId: completeBill.id,
      message: 'Completed',
    });
  } catch (e) {
    const approval = parseCreditApprovalError(e);
    if (approval.isPendingApproval) {
      steps.push({
        name: 'Complete bill',
        status: 'skipped',
        message: getErrorMessage(e),
        entityId: billId,
      });
      steps.push({
        name: 'Credit approval',
        status: 'ok',
        message: 'Sale held as draft — manager must approve on Pending Approvals',
        entityId: approval.approvalRequestId ?? billId,
      });
      return {
        receipt,
        steps,
        primaryOk: true,
        pendingCreditApproval: true,
        approvalRequestId: approval.approvalRequestId,
        billId,
      };
    }
    steps.push({
      name: 'Complete bill',
      status: 'failed',
      message: getErrorMessage(e),
    });
    return { receipt, steps, primaryOk: false, billId };
  }

  // Extras inflate local receipt total beyond server bill — do not claim full sync.
  receipt.synced = input.extraCharges.length === 0;
  if (completeBill?.billNumber) {
    receipt.ref = completeBill.billNumber;
  }
  steps.push({
    name: 'Inventory',
    status: 'ok',
    message: 'Stock deducted on server (COMPLETED)',
  });
  if (input.extraCharges.length > 0) {
    steps.push({
      name: 'Receipt totals',
      status: 'skipped',
      message: 'Server bill excludes POS extra charges — receipt total is local',
    });
  }

  return { receipt, steps, primaryOk: true };
}

/**
 * Purchase: POST /api/v1/purchase-orders — creates a Draft PO with all line items.
 * Stock is added separately when the verifier receives the order.
 */
export async function runPurchaseCheckout(input: PurchaseCheckoutInput): Promise<CheckoutResult> {
  const steps: CheckoutStep[] = [];
  const extras = input.extraCharges ?? [];
  const receipt: PosReceipt = {
    ref: localRef('PO'),
    mode: 'purchase',
    storeName: input.storeName,
    partyLabel: input.supplierName || input.supplierRef || 'Supplier',
    lines: buildReceiptLines(input.lines),
    extraCharges: extras,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (!input.supplierId) {
    steps.push({ name: 'Validate supplier', status: 'failed', message: 'Select a supplier from the left panel' });
    return { receipt, steps, primaryOk: false };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Add at least one product' });
    return { receipt, steps, primaryOk: false };
  }

  steps.push({ name: 'Local receipt', status: 'ok', message: `Issued ${receipt.ref}` });

  const createAttempt = await tryStep(
    'Create purchase order',
    () =>
      post<{ id: string; poNumber?: string }>('/api/v1/purchase-orders', {
        supplierId: input.supplierId,
        notes: input.supplierRef || undefined,
        items: input.lines.map((l) => ({
          productId: l.productId,
          ...(l.packSize != null
            ? { packQuantity: l.qty }
            : { quantityOrdered: l.qty }),
          unitCost: l.unitPrice,
        })),
      }),
    (po) => po.id,
  );
  steps.push(createAttempt.step);

  if (!createAttempt.result?.id) {
    return { receipt, steps, primaryOk: false };
  }

  if (createAttempt.result.poNumber) {
    receipt.ref = createAttempt.result.poNumber;
  }

  receipt.synced = true;
  steps.push({
    name: 'Draft PO saved',
    status: 'ok',
    message: `PO ${receipt.ref} created with Draft status. Open Purchase Orders to verify and receive stock.`,
  });

  return { receipt, steps, primaryOk: true, billId: createAttempt.result.id };
}


