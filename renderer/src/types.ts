// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

// ── Entities ──────────────────────────────────────────────────────────────────

// ── snake_case fields match actual API response field names ────────────────────

export interface Organization {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  imageKey?: string;
  isActive?: boolean;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

export interface State {
  id: number;
  name: string;
  countryId: number;
}

export interface City {
  id: number;
  name: string;
  stateId: number;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export type LocationType = 'store' | 'warehouse';

export interface Location {
  id: string;
  organizationId?: string;
  name: string;
  type: LocationType;
  imageKey?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Verified against core-apis source (categories.controller.ts, create/update-category.request.ts,
// category.response.ts): fields are camelCase, there is no `code` field, and status is the boolean
// `isActive` (settable only via update, not create).
export interface Category {
  id: string;
  organizationId?: string;
  parentId?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Verified 2026-07-26 against core-apis source (products.controller.ts,
// create/update-product.request.ts): fields are camelCase and there is no
// snake_case conversion layer in api.ts, so these names must match the wire
// format exactly. `unit` is a fixed backend enum, not free text.
export type ProductUnit = 'piece' | 'kg' | 'gram' | 'litre' | 'ml' | 'box' | 'pack' | 'dozen';

export interface Product {
  id: string;
  organizationId?: string;
  categoryId?: string;
  createdById?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit?: ProductUnit;
  costPrice?: number;
  retailPrice?: number;
  loyaltyPrice?: number;
  wholesalePrice?: number;
  transferPrice?: number;
  reorderPoint?: number;
  manufacturer?: string;
  packSize?: number;
  isActive?: boolean;
  createdAt?: string;
}

// GET/POST/PUT/DELETE /api/v1/products/:id/suppliers[...] — links a Supplier to a Product.
export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  isDefault: boolean;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
  createdAt?: string;
  updatedAt?: string;
}

// GET/POST /api/v1/products/:id/images — separate from the Product record.
export interface ProductImage {
  id: string;
  productId: string;
  storageKey: string;
  sortOrder: number;
  isPrimary: boolean;
  uploadedById?: string;
  url?: string;
  createdAt: string;
}

/** Response from GET /api/v1/products/:id/image/presigned-url */
export interface ProductImageUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// Matches core-apis' InventoryResponse DTO (camelCase). Verified 2026-07-30
// against src/application/modules/inventory source — the module was fully
// overhauled 2026-07-28 (commit 49a1426), after which this became the real
// wire shape for search/list/getById/create/update on `/api/v1/inventory`.
export interface InventoryItem {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved: number;
  /** Black / unpublished pool — used for black sales stock checks */
  quantityUnpublished?: number;
  reorderLevel: number;
  maxStock?: number;
  averageCost?: number;
  binLocation?: string;
  /** Pack size from product — null when product has no pack concept */
  productPackSize?: number;
  /** Whole packs on hand = floor(quantityOnHand / productPackSize). Null when no pack size. */
  packsOnHand?: number;
  /** Loose units beyond whole packs = quantityOnHand % productPackSize. Null when no pack size. */
  looseUnits?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  taxId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'partially_allocated'
  | 'allocated'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  organizationId?: string;
  supplierId?: string;
  createdById?: string;
  poNumber?: string;
  status?: PurchaseOrderStatus;
  expectedAt?: string;
  receivedAt?: string;
  totalAmount?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePurchaseOrderItemInput {
  productId: string;
  /** Units ordered — omit when packQuantity is provided */
  quantityOrdered?: number;
  unitCost: number;
  /** Packs ordered — backend converts to units using product packSize */
  packQuantity?: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedAt?: string;
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
}

export interface ReceivePurchaseOrderItemInput {
  purchaseItemId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderInput {
  items: ReceivePurchaseOrderItemInput[];
  notes?: string;
}

export interface AllocatePurchaseOrderItemInput {
  purchaseItemId: string;
  locationId: string;
  quantity: number;
}

export interface AllocatePurchaseOrderInput {
  allocations: AllocatePurchaseOrderItemInput[];
  notes?: string;
}

/** Sales bill lifecycle — matches core-apis EBillStatus. */
export type BillStatus = 'INITIATED' | 'DRAFT' | 'COMPLETED' | 'CANCELLED';

/** Matches core-apis EPaymentMethod. */
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CREDIT';

/** Matches core-apis ESaleType. */
export type SaleType = 'normal' | 'credit' | 'black';

/** Matches core-apis ECustomerType. */
export type CustomerType = 'regular' | 'new' | 'shop' | 'big_customer';

/** Matches core-apis EPaymentTiming. */
export type PaymentTiming = 'before_delivery' | 'after_delivery' | 'half' | 'cod';

export interface BillItem {
  id: string;
  billId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  organizationId: string;
  locationId: string;
  customerId?: string | null;
  createdById: string;
  walkInName?: string | null;
  walkInPhone?: string | null;
  walkInGstin?: string | null;
  status: BillStatus | string;
  paymentMethod?: PaymentMethod | string | null;
  saleType?: SaleType | string;
  customerType?: CustomerType | string | null;
  paymentTiming?: PaymentTiming | string | null;
  partialAmount?: number | null;
  blackAmount?: number;
  facilitatorUserId?: string | null;
  facilitatorName?: string | null;
  commissionAmount?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  billedAt?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  items?: BillItem[];
}

export interface CreateBillItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}

export interface CreateBillInput {
  locationId: string;
  customerId?: string;
  walkInName?: string;
  walkInPhone?: string;
  walkInGstin?: string;
  notes?: string;
  items: CreateBillItemInput[];
  // ── Sales v2 fields ──
  saleType?: SaleType | string;
  customerType?: CustomerType | string;
  paymentTiming?: PaymentTiming | string;
  partialAmount?: number;
  facilitatorUserId?: string;
  facilitatorName?: string;
  commissionPct?: number;
}

export interface UpdateBillInput {
  locationId?: string;
  customerId?: string | null;
  walkInName?: string | null;
  walkInPhone?: string | null;
  walkInGstin?: string | null;
  notes?: string | null;
  saleType?: SaleType | string;
  customerType?: CustomerType | string;
  paymentTiming?: PaymentTiming | string;
  partialAmount?: number;
  facilitatorUserId?: string;
  facilitatorName?: string;
  commissionPct?: number;
}

// Verified 2026-07-31: CreatePaymentTransactionRequest has no @AutoMap; domain
// orgId vs entity organizationId — create fails. See #0d.
export interface PaymentTransaction {
  id: string;
  orgId?: string;
  organizationId?: string;
  referenceId?: string;
  referenceType?: string;
  type?: string;
  method?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  orgId?: string;
  title?: string;
  body?: string;
  type?: string;
  readAt?: string | null;
  createdAt?: string;
}

// Verified 2026-07-31: entity field names match, but CreateItemReturnRequest has
// no @AutoMap so Automapper leaves the command empty — create fails until Core
// API adds @AutoMap (or maps manually). No returnNumber / purchaseOrderId. #0e
export interface ItemReturn {
  id: string;
  status?: string;
  totalAmount?: number;
  returnType?: 'sales' | 'purchase';
  locationId?: string;
  orderId?: string;
  supplierId?: string;
  createdAt?: string;
}

export type EReportPeriod = 'DAILY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type EReportType =
  | 'total_sales' | 'cash_sales' | 'credit_sales' | 'total_bills' | 'average_bill_value'
  | 'time_wise_sales' | 'top_selling_products' | 'slow_moving_products'
  | 'total_expense' | 'shop_expense' | 'other_expense' | 'opening_cash' | 'closing_cash'
  | 'total_purchase' | 'purchase_return' | 'total_profit' | 'net_profit'
  | 'closing_stock' | 'low_stock_items' | 'out_of_stock_items' | 'damaged_stock' | 'returned_items'
  | 'total_customers' | 'new_customers' | 'repeat_customers'
  | 'credit_given' | 'credit_received' | 'pending_credit'
  | 'supplier_payment' | 'pending_supplier_payment' | 'staff_attendance' | 'weekly_comparison';

export interface ReportGenerationLog {
  id: string;
  orgId?: string;
  reportType?: EReportType;
  reportPeriod?: EReportPeriod;
  reportName?: string;
  fromDate?: string;
  toDate?: string;
  locationId?: string;
  generatedById?: string;
  status?: string;
  fileUrl?: string;
  errorMessage?: string;
  createdAt?: string;
}

export interface GenerateReportInput {
  reportType: EReportType;
  reportPeriod: EReportPeriod;
  fromDate: string;
  toDate: string;
  locationId?: string;
}

// Matches core-apis StockMovementResponse + StockOperationRequest / AdjustStockRequest.
export type StockMovementOp =
  | 'add'
  | 'remove'
  | 'adjust'
  | 'reserve'
  | 'release-reservation'
  | 'damage'
  | 'write-off';

export interface StockOperationBody {
  inventoryId: string;
  locationId: string;
  productId: string;
  quantity?: number;
  absoluteQuantity?: number;
  unitCost?: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  inventoryId: string;
  locationId: string;
  productId: string;
  performedById?: string;
  referenceId?: string;
  referenceType?: string;
  movementType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  notes?: string;
  createdAt?: string;
}

export interface UnpublishedStock {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  quantityOnHand: number;
  averageCost?: number;
  binLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnpublishedStockMovement {
  id: string;
  unpublishedStockId: string;
  locationId: string;
  productId: string;
  performedById?: string;
  movementType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  notes?: string;
  createdAt?: string;
}

export interface ProductLog {
  id: string;
  organizationId: string;
  productId: string;
  inventoryId?: string;
  locationId?: string;
  performedById?: string;
  action: string;
  changedFields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface StockTransferItem {
  productId: string;
  quantitySent: number;
  quantityReceived: number;
}

export interface StockTransfer {
  id: string;
  organizationId: string;
  fromLocationId: string;
  toLocationId: string;
  transferNumber: string;
  status?: string;
  items?: StockTransferItem[];
}

export interface StockTransferRequest {
  id: string;
  organizationId: string;
  requestingLocationId: string;
  requestingUserId?: string;
  productId: string;
  variantId?: string;
  quantityRequested: number;
  status: string;
  acceptedByLocationId?: string;
  acceptedByUserId?: string;
  acceptedAt?: string;
  claimedAt?: string;
  cancelledByUserId?: string;
  cancelledAt?: string;
  fulfillmentTransferId?: string;
  createdAt: string;
  updatedAt?: string;
  canFulfill?: boolean;
  availableStock?: number;
}

// Verified 2026-07-26 against core-apis's OrderResponse/CreateOrderRequest source
// directly — camelCase, matches the entity well. OrderEntity has no organizationId
// column (tenancy flows through locationId -> location -> org). The real blocker for
// create is that customerId (required) has no valid value to test with, because
// Customers create is broken separately (see Customer below). See Orders.tsx.
export interface Order {
  id: string;
  orderNumber?: string;
  locationId?: string;
  customerId?: string;
  status?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  paymentStatus?: string;
}

// Verified 2026-07-26 against core-apis's InvoiceResponse/CreateInvoiceRequest
// source directly — the cleanest resource found in this investigation (no
// organizationId needed, invoiceNumber auto-generated server-side). Not live-tested
// — treat as unverified, not working, given every other create tested this session
// failed regardless of DTO cleanliness (see docs/core-apis-fixes.md callout).
export interface Invoice {
  id: string;
  orderId?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  status?: string;
}

// core-apis customers: create sets organizationId from auth/fallback; search/PATCH/DELETE supported.
export type CreditStatus = 'none' | 'available' | 'warning' | 'over';

export interface Customer {
  id: string;
  organizationId?: string;
  name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  pinCode?: string;
  shopName?: string;
  creditLimit?: number | null;
  creditBalance?: number;
  customerType?: CustomerType | string | null;
  discountPercent?: number | null;
  skipOverLimitApproval?: boolean | null;
  creditStatus?: CreditStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCreditTransaction {
  id: string;
  customerId: string;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  billId?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  performedById?: string | null;
  createdAt: string;
}

export interface CreditTransactionDocument {
  id: string;
  customerId: string;
  customerName: string | null;
  billId: string | null;
  billNumber: string | null;
  walkInName: string | null;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string | null;
  note: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  billedAt: string | null;
  createdAt: string;
}

export interface QuickCharge {
  id: string;
  organizationId: string;
  label: string;
  amount: number;
  enabled: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface CustomerTypeRule {
  id: string;
  organizationId: string;
  customerType: CustomerType | string;
  discountPercent: number;
  defaultCreditLimit?: number | null;
  skipOverLimitApproval: boolean;
  createdAt?: string;
}

export type CreditApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CreditApprovalRequest {
  id: string;
  organizationId: string;
  customerId: string;
  billId: string;
  requestedAmount: number;
  requestedById: string;
  status: CreditApprovalStatus | string;
  decidedById?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  bill?: Bill | null;
  /** Legacy alias used by older Pending Approvals UI. */
  amount?: number;
}

export type CommissionStatus = 'owed' | 'paid';

export interface CommissionPayable {
  id: string;
  organizationId: string;
  billId: string;
  facilitatorUserId?: string | null;
  facilitatorName?: string | null;
  amount: number;
  status: CommissionStatus | string;
  paidAt?: string | null;
  createdAt: string;
}


export type EExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  organizationId?: string;
  locationId?: string;
  category?: string;
  amount?: number;
  expenseDate?: string;
  description?: string;
  status?: EExpenseStatus;
  submittedBy?: string;
  createdAt?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseOrderId?: string;
  productId?: string;
  quantityOrdered?: number;
  quantityReceived?: number;
  quantityAllocated?: number;
  unitCost?: number;
  totalCost?: number;
  /** Packs entered at order time — null when ordered in units */
  packQuantity?: number;
  /** Product packSize snapshotted at order time — null when no pack concept used */
  packSizeSnapshot?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const ACTIVITY_LOG_ACTIONS = [
  'login', 'logout',
  'add_stock', 'remove_stock', 'adjust_stock', 'transfer_stock',
  'create_product', 'update_product', 'delete_product',
  'create_purchase_order', 'receive_purchase_order', 'cancel_purchase_order',
  'create_store', 'update_store',
  'create_user', 'update_user', 'deactivate_user',
] as const;

export interface ActivityLog {
  id: string;
  organizationId?: string;
  userId?: string;
  action?: string;
  entityName?: string;
  entityId?: string;
  createdAt?: string;
}

// Verified 2026-07-28 against role.entity.ts: `name` is a Postgres enum (4 fixed
// values, unique) — free text will fail. organizationId/permissions are required by
// CreateRoleRequest validation but RoleEntity has no matching columns, so the backend
// silently discards them after accepting the request.
export const ROLE_NAMES = ['super_admin', 'org_admin', 'org_manager', 'store_manager', 'store_staff'] as const;

export interface Role {
  id: string;
  organizationId?: string;
  name?: string;
  permissions?: Record<string, unknown>;
  description?: string;
  createdAt?: string;
}

export interface UserRole {
  id: string;
  userId?: string;
  roleId?: string;
  locationId?: string;
  createdAt?: string;
}

export interface PlatformConfiguration {
  id: string;
  configKey?: string;
  configValue?: Record<string, unknown>;
  description?: string;
  updatedAt?: string;
}

// ── Platform Users (backend /api/v1/users — distinct from the local PIN-based `User` above) ──

export interface PlatformUser {
  id: string;
  organizationId?: string;
  locationId?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
}

// ── Clerk User Management ───────────────────────────────────────────────────

export enum EInvitationStatus {
  Pending  = 'pending',
  Accepted = 'accepted',
  Revoked  = 'revoked',
}

export interface ClerkInvitation {
  id: string;
  emailAddress: string;
  status: EInvitationStatus;
  roles?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ClerkUser {
  /** Alias of clerkUserId — added client-side so rows satisfy DataTable's `{ id: string }`. */
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  banned: boolean;
  roles: string[];
  createdAt: number;
  lastSignInAt: number | null;
}

export interface ClerkUserListResponse {
  data: ClerkUser[];
  totalCount: number;
}

export interface ClerkUserRolesResponse {
  clerkUserId: string;
  roles: string[];
}

export interface InviteUserPayload {
  email: string;
  roleId: string;
  organizationId?: string;
  locationId?: string;
  redirectUrl?: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface AssignOrgPayload {
  organizationId: string;
  role: string;
}

export interface ClerkOrganization {
  organizationId: string;
  name: string;
  slug: string;
}

// ── Fleet / Vehicles (legacy mock shape — used by VehiclesPage mock only) ─────

export interface Vehicle {
  id: string;
  registration_number: string;
  vin?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  status?: 'In Transit' | 'Available' | 'Maintenance' | 'Out of Service';
  fuel_level?: number;
  tire_psi?: number;
  engine_temp?: number;
  current_speed?: number;
  load_weight?: number;
  current_location?: string;
  driver_name?: string;
  driver_cdl?: string;
  driver_experience?: string;
  last_service_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PageAccessConfig {
  pageKey: string;
  allowedRoles: string[];
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  date: string;
  service_type: string;
  provider: string;
  cost: number;
  status: 'Completed' | 'Scheduled' | 'In Progress';
}

// ── Fleet Reference Data ──────────────────────────────────────────────────────

export interface VehicleTypeRef {
  id: string;
  name: string;
  description?: string;
}

export interface VehicleBrandRef {
  id: string;
  brandName: string;
}

export interface FuelTypeRef {
  id: string;
  name: string;
}

export interface MaintenanceTypeRef {
  id: string;
  name: string;
}

// ── Fleet Management — real API shapes (core-apis feat/vehicle-and-transportation-management) ──

export type FleetVehicleStatus = 'available' | 'in_transit' | 'maintenance' | 'idle' | 'out_of_service';

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  vinNumber?: string;
  registrationNumber?: string;
  companyId: string;
  vehicleTypeId: string;
  brandId: string;
  model?: string;
  color?: string;
  fuelTypeId: string;
  status?: FleetVehicleStatus;
  imageUrl?: string;
}

export type FleetDriverStatus = 'active' | 'inactive' | 'on_trip' | 'suspended';

export interface FleetDriver {
  id: string;
  organizationId: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseType?: string;
  address?: string;
  emergencyContact?: string;
  status?: FleetDriverStatus;
}

export type FleetTripStatus = 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'delayed';

export interface FleetTrip {
  id: string;
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  customerId: string;
  pickupLocation: string;
  dropLocation: string;
  startDatetime: string;
  endDatetime?: string;
  estimatedDistance?: number;
  actualDistance?: number;
  tripStatus: FleetTripStatus;
  priority: string;
}

export interface FleetMaintenance {
  id: string;
  vehicleId: string;
  serviceCenter: string;
}

export type FleetExpenseType = 'fuel' | 'toll' | 'parking' | 'insurance' | 'tax' | 'washing' | 'repair' | 'other';

export interface FleetExpense {
  id: string;
  vehicleId: string;
  organizationId: string;
  expenseType: FleetExpenseType;
  amount: number;
  expenseDate: string;
  description?: string;
  tripId?: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface SalesSummaryData {
  revenueThisMonth: number;
  revenueThisWeek: number;
  avgBillValue: number;
  activeCustomers: number;
  completedBills: number;
  pendingBills: number;
  totalUnitsSold: number;
  comparisonLabel?: string;
  previous?: {
    completedBills: number;
    activeCustomers: number;
    totalUnitsSold: number;
    revenue: number;
    avgBillValue: number;
  };
  topSelling?: SalesProductHighlight;
  topMargin?: SalesProductHighlight;
  topCostly?: SalesProductHighlight;
}

export interface SalesProductHighlight {
  productId: string;
  productName: string;
  currentValue: number;
  previousValue: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  billCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalQtySold: number;
}

export interface TopCustomer {
  customerId: string | null;
  customerName: string;
  totalSpend: number;
  billCount: number;
}

export interface PurchaseSummaryData {
  spendThisMonth: number;
  outstandingPos: number;
  avgPoValue: number;
  supplierCount: number;
}

export interface PurchaseTrendPoint {
  month: string;
  spend: number;
  poCount: number;
}

export interface TopSupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  poCount: number;
}

export interface InventorySummaryData {
  totalSkus: number;
  lowStockCount: number;
  zeroStockCount: number;
  totalValuation: number;
}

export interface StockByLocationPoint {
  locationId: string;
  locationName: string;
  locationType: string;
  totalStock: number;
  productCount: number;
  valuation: number;
}

export interface PaymentMixPoint {
  method: string;
  amount: number;
}

export interface CategoryValuePoint {
  categoryId?: string;
  categoryName: string;
  value: number;
}

export interface PurchaseExceptionsData {
  pending: number;
  approvalPending: number;
  priceIncreased: number;
}

export interface DemandTierPoint {
  tier: string;
  count: number;
}

export interface ProductMovementRank {
  productId: string;
  productName: string;
  quantity: number;
  value: number;
}

export interface ProductMarginRank {
  productId: string;
  productName: string;
  totalMargin: number;
  totalRevenue: number;
  avgUnitPrice: number;
}

export interface SupplierPricePoint {
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  avgUnitCost: number;
}

export interface InventoryStatusData {
  normal: number;
  low: number;
  out: number;
  over: number;
  dead: number;
}

export interface InventoryStatusTrendPoint {
  period: string;
  normal: number;
  low: number;
  out: number;
  over: number;
  dead: number;
}

export interface StockDamageSummaryData {
  totalUnits: number;
  eventCount: number;
  topProducts: ProductMovementRank[];
}

export interface DashboardAnalyticsParams {
  period?: string;
  from?: string;
  to?: string;
  locationId?: string;
}

