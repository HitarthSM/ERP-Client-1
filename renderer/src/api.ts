export { configureApi, get, post, put, patch, del } from './lib/http';
import { get, post, put, patch, del, uploadForm } from './lib/http';
import { createResource, createCreateOnlyResource } from './lib/resource';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Organization, Category, Product, Supplier, PurchaseOrder, Bill, PaymentTransaction,
  Notification, ItemReturn, ReportGenerationLog, Order, Invoice, Customer, CustomerCreditTransaction, Expense, PurchaseItem,
  ActivityLog, Role, UserRole, PlatformConfiguration, PlatformUser, Location,
  ProductImage, ProductImageUploadUrl, ProductSupplier,
  InventoryItem, StockMovement, StockMovementOp, StockOperationBody, StockTransfer, StockTransferRequest,
  UnpublishedStock, UnpublishedStockMovement, ProductLog, PaginatedResponse,
  BillStatus, PaymentMethod, CreateBillItemInput, UpdateBillInput,
  SaleType, CustomerType, PaymentTiming,
  CreditApprovalRequest, CommissionPayable,
  QuickCharge, CustomerTypeRule,
  Country, State, City,
  CreatePurchaseOrderInput, ReceivePurchaseOrderInput,
  ClerkUserListResponse, ClerkUserRolesResponse, ClerkInvitation, EInvitationStatus,
  InviteUserPayload, UpdateRolesPayload, AssignOrgPayload, ClerkOrganization,
  PageAccessConfig,
  FleetVehicle, FleetDriver, FleetTrip, FleetMaintenance, FleetExpense,
  VehicleTypeRef, VehicleBrandRef, FuelTypeRef, MaintenanceTypeRef,
  SalesSummaryData, RevenueTrendPoint, TopProduct, TopCustomer,
  PurchaseSummaryData, PurchaseTrendPoint, TopSupplier,
  InventorySummaryData, StockByLocationPoint,
} from './types';

// ── New hook-based resources ───────────────────────────────────────────────────

export const Organizations = createResource<Organization>('/api/v1/organizations', 'organizations', 'Organization');
export const Categories = createResource<Category>('/api/v1/categories', 'categories', 'Category');
export const Products = createResource<Product>('/api/v1/products', 'products', 'Product');
export const Suppliers = createResource<Supplier>('/api/v1/suppliers', 'suppliers', 'Supplier');
const purchaseOrdersBase = createResource<PurchaseOrder>('/api/v1/purchase-orders', 'purchase-orders', 'Purchase order');

export const PurchaseOrders = {
  ...purchaseOrdersBase,
  useCreatePO() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: CreatePurchaseOrderInput) =>
        post<PurchaseOrder>('/api/v1/purchase-orders', body),
      onSuccess: () => {
        toast.success('Purchase order created');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to create purchase order'),
    });
  },
  useGetItems(purchaseOrderId: string | undefined) {
    return useQuery({
      queryKey: ['purchase-items', 'by-order', purchaseOrderId],
      queryFn: () => get<PurchaseItem[]>(`/api/v1/purchase-items/by-order/${purchaseOrderId as string}`),
      enabled: !!purchaseOrderId,
    });
  },
  useReceive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: ReceivePurchaseOrderInput }) =>
        post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/receive`, body),
      onSuccess: () => {
        toast.success('Purchase order received');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to receive purchase order'),
    });
  },
};

const billsBase = createResource<Bill>('/api/v1/bills', 'bills', 'Bill');

/**
 * Bills SearchBillsRequest uses @IsNumber() on $page/$perPage without @Type(() => Number).
 * Sending those query params returns 400 on Render — omit them (handler defaults page 1 / 20).
 */
export const Bills = {
  ...billsBase,
  useSearch(params?: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string>;
    enabled?: boolean;
  }) {
    return billsBase.useSearch({ ...params, omitPagination: true });
  },
  useTransitionStatus() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        status,
        paymentMethod,
      }: {
        id: string;
        status: BillStatus;
        paymentMethod?: PaymentMethod;
      }) => patch<Bill>(`/api/v1/bills/${id}/status`, { status, paymentMethod }),
      onSuccess: (_bill, vars) => {
        toast.success(`Bill marked ${vars.status}`);
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update bill status'),
    });
  },
  useAddItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: CreateBillItemInput }) =>
        post<Bill>(`/api/v1/bills/${id}/items`, body),
      onSuccess: () => {
        toast.success('Item added');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to add item'),
    });
  },
  useUpdateItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        itemId,
        body,
      }: {
        id: string;
        itemId: string;
        body: Partial<CreateBillItemInput>;
      }) => put<Bill>(`/api/v1/bills/${id}/items/${itemId}`, body),
      onSuccess: () => {
        toast.success('Item updated');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update item'),
    });
  },
  useRemoveItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
        del(`/api/v1/bills/${id}/items/${itemId}`).then(() => undefined),
      onSuccess: () => {
        toast.success('Item removed');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to remove item'),
    });
  },
  useUpdateHeader() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateBillInput }) =>
        put<Bill>(`/api/v1/bills/${id}`, body),
      onSuccess: () => {
        toast.success('Bill updated');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update bill'),
    });
  },
};

export const PaymentTransactions = createResource<PaymentTransaction>('/api/v1/payment-transactions', 'payment-transactions', 'Payment');
const notificationsBase = createResource<Notification>('/api/v1/notifications', 'notifications', 'Notification');

export const Notifications = {
  ...notificationsBase,
  useUnreadCount() {
    return useQuery({
      queryKey: ['notifications', 'unread-count'],
      queryFn: () => get<{ count: number }>('/api/v1/notifications/unread-count'),
      refetchInterval: 30_000,
      staleTime: 15_000,
    });
  },
  useMarkAllRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: () => put<{ ok: boolean }>('/api/v1/notifications/mark-all-read', {}),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  },
  useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        put<Notification>(`/api/v1/notifications/${id}`, { readAt: new Date().toISOString() }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  },
};
export const ItemReturns = createResource<ItemReturn>('/api/v1/item-returns', 'item-returns', 'Return');
export const ReportGenerationLogs = createResource<ReportGenerationLog>('/api/v1/report-generation-logs', 'report-generation-logs', 'Report log');
export const Orders = createCreateOnlyResource<Order>('/api/v1/orders', 'orders', 'Order');
export const Invoices = createCreateOnlyResource<Invoice>('/api/v1/invoices', 'invoices', 'Invoice');

const customersBase = createResource<Customer>('/api/v1/customers', 'customers', 'Customer');

/**
 * Customers SearchCustomersRequest: same $page/$perPage string→@IsNumber 400 as bills.
 * Omit pagination; only send name/phone/filters. Handler defaults to page 1 / 20.
 */
export const Customers = {
  ...customersBase,
  useSearch(params?: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string>;
    hasCreditLimit?: boolean;
    enabled?: boolean;
  }) {
    return customersBase.useSearch({
      ...params,
      omitPagination: true,
      filters: {
        ...(params?.filters ?? {}),
        ...(params?.hasCreditLimit ? { hasCreditLimit: 'true' } : {}),
      },
    });
  },
  useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Customer> }) =>
        patch<Customer>(`/api/v1/customers/${id}`, body),
      onSuccess: () => {
        toast.success('Customer updated');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update customer'),
    });
  },
  useGetBills(customerId: string | undefined, page = 1) {
    return useQuery({
      queryKey: ['customers', customerId, 'bills', page],
      queryFn: () =>
        get<PaginatedResponse<Bill>>(`/api/v1/customers/${customerId as string}/bills`, {
          $page: page,
          $perPage: 10,
        }),
      enabled: !!customerId,
    });
  },
  useGetCreditTransactions(customerId: string | undefined, page = 1) {
    return useQuery({
      queryKey: ['customers', customerId, 'credit-transactions', page],
      queryFn: () =>
        get<PaginatedResponse<CustomerCreditTransaction>>(
          `/api/v1/customers/${customerId as string}/credit-transactions`,
          { $page: page, $perPage: 20 },
        ),
      enabled: !!customerId,
    });
  },
  useRecordCreditTransaction(customerId: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: {
        type: 'payment' | 'adjustment';
        amount: number;
        paymentMethod?: string;
        note?: string;
      }) => post<Customer>(`/api/v1/customers/${customerId as string}/credit-transactions`, body),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
        queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'credit-transactions'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to record transaction'),
    });
  },
};

export const CreditApprovals = {
  useListPending() {
    return useQuery({
      queryKey: ['credit-approvals', 'pending'],
      queryFn: () => get<CreditApprovalRequest[]>('/api/v1/credit-approvals'),
    });
  },
  useMyRejected(enabled = true) {
    return useQuery({
      queryKey: ['credit-approvals', 'mine', 'rejected'],
      queryFn: () =>
        get<CreditApprovalRequest[]>('/api/v1/credit-approvals/mine', { status: 'rejected' }),
      enabled,
      refetchInterval: 15_000,
    });
  },
  useApprove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CreditApprovalRequest>(`/api/v1/credit-approvals/${id}/approve`, {}),
      onSuccess: () => {
        toast.success('Credit sale approved');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals'] });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to approve'),
    });
  },
  useReject() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CreditApprovalRequest>(`/api/v1/credit-approvals/${id}/reject`, {}),
      onSuccess: () => {
        toast.success('Credit sale rejected');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to reject'),
    });
  },
  useBlackLedger() {
    return useQuery({
      queryKey: ['credit-approvals', 'black-ledger'],
      queryFn: () => get<{ bills: Bill[]; commissions: CommissionPayable[] }>('/api/v1/credit-approvals/black-ledger'),
    });
  },
  useMarkCommissionPaid() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CommissionPayable>(`/api/v1/credit-approvals/commissions/${id}/mark-paid`, {}),
      onSuccess: () => {
        toast.success('Commission marked paid');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals', 'black-ledger'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to mark paid'),
    });
  },
};

export const BillingSettings = {
  useQuickCharges(opts?: { enabled?: boolean }) {
    return useQuery({
      queryKey: ['billing-settings', 'quick-charges', opts?.enabled ?? 'all'],
      queryFn: () =>
        get<QuickCharge[]>('/api/v1/billing-settings/quick-charges', {
          enabled: opts?.enabled,
        }),
    });
  },
  useCreateQuickCharge() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Pick<QuickCharge, 'label' | 'amount'> & Partial<Pick<QuickCharge, 'enabled' | 'sortOrder'>>) =>
        post<QuickCharge>('/api/v1/billing-settings/quick-charges', body),
      onSuccess: () => {
        toast.success('Quick charge added');
        queryClient.invalidateQueries({ queryKey: ['billing-settings', 'quick-charges'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to add charge'),
    });
  },
  useUpdateQuickCharge() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<QuickCharge> }) =>
        patch<QuickCharge>(`/api/v1/billing-settings/quick-charges/${id}`, body),
      onSuccess: () => {
        toast.success('Quick charge updated');
        queryClient.invalidateQueries({ queryKey: ['billing-settings', 'quick-charges'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update charge'),
    });
  },
  useDeleteQuickCharge() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => del(`/api/v1/billing-settings/quick-charges/${id}`),
      onSuccess: () => {
        toast.success('Quick charge removed');
        queryClient.invalidateQueries({ queryKey: ['billing-settings', 'quick-charges'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to remove charge'),
    });
  },
  useCustomerTypeRules() {
    return useQuery({
      queryKey: ['billing-settings', 'customer-type-rules'],
      queryFn: () => get<CustomerTypeRule[]>('/api/v1/billing-settings/customer-type-rules'),
    });
  },
  useUpdateCustomerTypeRule() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<CustomerTypeRule> }) =>
        patch<CustomerTypeRule>(`/api/v1/billing-settings/customer-type-rules/${id}`, body),
      onSuccess: () => {
        toast.success('Customer type rule saved');
        queryClient.invalidateQueries({ queryKey: ['billing-settings', 'customer-type-rules'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to save type rule'),
    });
  },
};

export const Expenses = createCreateOnlyResource<Expense>('/api/v1/expenses', 'expenses', 'Expense');

export const ExpensesApi = {
  useList(status?: string) {
    return useQuery<Expense[]>({
      queryKey: ['expenses', 'list', status ?? 'all'],
      queryFn: () => get<Expense[]>('/api/v1/expenses/list', status ? { status } : undefined),
      staleTime: 30_000,
    });
  },
  useUpdateStatus() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        patch<Expense>(`/api/v1/expenses/${id}/status`, { status }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['expenses', 'list'] });
        toast.success('Expense status updated');
      },
      onError: () => toast.error('Failed to update expense status'),
    });
  },
};
export const PurchaseItems = createCreateOnlyResource<PurchaseItem>('/api/v1/purchase-items', 'purchase-items', 'Purchase item');
export const ActivityLogs = createCreateOnlyResource<ActivityLog>('/api/v1/activity-logs', 'activity-logs', 'Activity log');

export function useListActivityLogs() {
  return useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', 'list'],
    queryFn: () => get<ActivityLog[]>('/api/v1/activity-logs/list'),
    staleTime: 30_000,
  });
}
export const Roles = createCreateOnlyResource<Role>('/api/v1/roles', 'roles', 'Role');

/** Flat list of all roles — backed by the fixed 4-row role table (GET /api/v1/roles/list). */
export function useListRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles', 'list'],
    queryFn: () => get<Role[]>('/api/v1/roles/list'),
    staleTime: 5 * 60 * 1000,
  });
}

export const UserRoles = createCreateOnlyResource<UserRole>('/api/v1/user-roles', 'user-roles', 'User role');

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UserRole> }) =>
      put<UserRole>(`/api/v1/user-roles/${id}`, body),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update user role'),
  });
}

export function useListUserRoles() {
  return useQuery<UserRole[]>({
    queryKey: ['user-roles', 'list'],
    queryFn: () => get<UserRole[]>('/api/v1/user-roles/list'),
    staleTime: 30_000,
  });
}
export const PlatformConfigurations = createCreateOnlyResource<PlatformConfiguration>('/api/v1/platform-configurations', 'platform-configurations', 'Configuration');
/**
 * Internal user directory (local DB, distinct from the Clerk-backed `ClerkUsers` resource
 * used on the Users page). GET /api/v1/users/directory.
 */
export function useListUserDirectory(organizationId?: string) {
  return useQuery<PlatformUser[]>({
    queryKey: ['users', 'directory', organizationId],
    queryFn: () => get<PlatformUser[]>('/api/v1/users/directory', organizationId ? { organizationId } : undefined),
    staleTime: 5 * 60 * 1000,
  });
}
export const Locations = createResource<Location>('/api/v1/locations', 'locations', 'Location');
// ── Inventory cluster (hook-based) ─────────────────────────────────────────────

export function useCategoryParents(enabled = true) {
  return useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: () => get<Category[]>('/api/v1/categories/parents'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export const StockTransfers = {
  useGet(id: string | undefined) {
    return useQuery({
      queryKey: ['stock-transfers', id],
      queryFn: () => get<StockTransfer>(`/api/v1/stock-transfers/${id}`),
      enabled: !!id,
    });
  },
  /** Paginated history — resolves to { items, total }. */
  useSearch(params?: { page?: number; limit?: number; filters?: Record<string, string> }) {
    return useQuery({
      queryKey: ['stock-transfers', 'search', params?.page ?? 1, params?.limit ?? 15, params?.filters ?? {}],
      queryFn: async () => {
        const raw = await get<PaginatedResponse<StockTransfer>>('/api/v1/stock-transfers', {
          $page: params?.page ?? 1,
          $perPage: params?.limit ?? 15,
          ...(params?.filters ?? {}),
        });
        return { items: raw.items ?? [], total: raw.totalCount ?? 0 };
      },
    });
  },
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<StockTransfer>) => post<StockTransfer>('/api/v1/stock-transfers', body),
      onSuccess: () => {
        toast.success('Stock transfer created');
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to create stock transfer'),
    });
  },
};

export const StockTransferRequests = {
  useListMine(locationId: string | undefined) {
    return useQuery({
      queryKey: ['stock-transfer-requests', 'mine', locationId],
      queryFn: () => get<StockTransferRequest[]>('/api/v1/stock-transfer-requests/mine', { locationId }),
      enabled: !!locationId,
    });
  },
  useListOpen(locationId: string | undefined) {
    return useQuery({
      queryKey: ['stock-transfer-requests', 'open', locationId],
      queryFn: () => get<StockTransferRequest[]>('/api/v1/stock-transfer-requests/open', { locationId }),
      enabled: !!locationId,
    });
  },
  useRaise() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: { requestingLocationId: string; productId: string; variantId?: string; quantityRequested: number }) =>
        post<StockTransferRequest>('/api/v1/stock-transfer-requests', body),
      onSuccess: () => {
        toast.success('Stock request raised');
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-requests'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to raise request'),
    });
  },
  useAccept() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, acceptingLocationId }: { id: string; acceptingLocationId: string }) =>
        put<StockTransferRequest>(`/api/v1/stock-transfer-requests/${id}/accept`, { acceptingLocationId }),
      onSuccess: () => {
        toast.success('Request accepted — stock deducted from your store');
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-requests'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to accept request'),
    });
  },
  useClaim() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        put<StockTransferRequest>(`/api/v1/stock-transfer-requests/${id}/claim`, {}),
      onSuccess: () => {
        toast.success('Marked as received — stock added to your inventory');
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-requests'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to claim request'),
    });
  },
  useCancel() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        put<StockTransferRequest>(`/api/v1/stock-transfer-requests/${id}/cancel`, {}),
      onSuccess: () => {
        toast.success('Request cancelled');
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-requests'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to cancel request'),
    });
  },
};

export function useInventoryLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => get<InventoryItem[]>('/api/v1/inventory/low-stock'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory', 'valuation'],
    queryFn: () => get<InventoryItem[]>('/api/v1/inventory/valuation'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovement(id: string | undefined) {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => get<StockMovement>(`/api/v1/stock-movements/${id}`),
    enabled: !!id,
  });
}

export function useStockMovementsByInventory(inventoryId: string | undefined) {
  return useQuery({
    queryKey: ['stock-movements', 'by-inventory', inventoryId],
    queryFn: () => get<StockMovement[]>(`/api/v1/stock-movements/by-inventory/${inventoryId}`),
    enabled: !!inventoryId,
  });
}

export function useStockOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ op, body }: { op: StockMovementOp; body: StockOperationBody }) =>
      post<unknown>(`/api/v1/stock-movements/${op}`, body).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCompleteStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{
        fromInventoryId: string;
        // NEEDS BACKEND: resolve/create this server-side when omitted — see
        // docs/superpowers/plans/2026-08-04-backend-requirements.md
        toInventoryId?: string;
        productId: string;
        fromLocationId: string;
        toLocationId: string;
        quantity: number;
      }>;
    }) => put<StockTransfer>(`/api/v1/stock-transfers/${id}/complete`, { items }),
    onSuccess: () => {
      toast.success('Stock transfer completed');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to complete transfer'),
  });
}

export function useCancelStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<StockTransfer>(`/api/v1/stock-transfers/${id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Stock transfer cancelled');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to cancel transfer'),
  });
}

export function useUnpublishedStockList(params?: { locationId?: string; productId?: string }) {
  return useQuery({
    queryKey: ['unpublished-stock', 'list', params],
    queryFn:  () => get<UnpublishedStock[]>('/api/v1/unpublished-stock', params),
  });
}

export function useUnpublishedStock(id: string | undefined) {
  return useQuery({
    queryKey: ['unpublished-stock', id],
    queryFn: () => get<UnpublishedStock>(`/api/v1/unpublished-stock/${id}`),
    enabled: !!id,
  });
}

export function useUnpublishedStockMovements(unpublishedStockId: string | undefined) {
  return useQuery({
    queryKey: ['unpublished-stock', 'by-record', unpublishedStockId],
    queryFn: () => get<UnpublishedStockMovement[]>(`/api/v1/unpublished-stock/by-record/${unpublishedStockId}`),
    enabled: !!unpublishedStockId,
  });
}

export function useAddUnpublishedStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { locationId: string; productId: string; quantity: number; unitCost?: number; notes?: string }) =>
      post('/api/v1/unpublished-stock/add', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unpublished-stock'] }),
  });
}

export function usePublishUnpublishedStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { unpublishedStockId: string; quantity: number; notes?: string }) =>
      post('/api/v1/unpublished-stock/publish', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpublished-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useProductLog(id: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', id],
    queryFn: () => get<ProductLog>(`/api/v1/product-logs/${id}`),
    enabled: !!id,
  });
}

export function useProductLogsByProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', 'by-product', productId],
    queryFn: async () => {
      const paged = await get<PaginatedResponse<ProductLog>>(`/api/v1/product-logs/by-product/${productId}`, { perPage: 100 });
      return paged.items ?? [];
    },
    enabled: !!productId,
  });
}

export function useProductLogsByInventory(inventoryId: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', 'by-inventory', inventoryId],
    queryFn: () => get<ProductLog[]>(`/api/v1/product-logs/by-inventory/${inventoryId}`),
    enabled: !!inventoryId,
  });
}
// ── Product subresources (images, suppliers) ──────────────────────────────────

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'images'],
    queryFn: () => get<ProductImage[]>(`/api/v1/products/${productId}/images`),
    enabled: !!productId,
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<ProductImage>(`/api/v1/products/${productId}/images`, form);
    },
    onSuccess: (_result, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'images'] });
    },
  });
}

const PRODUCT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
]);

/**
 * Direct R2 upload via presigned URL. Does NOT create a product_images row —
 * Core API has no confirm/imageKey endpoint yet. Do not invalidate gallery queries.
 */
export function useProductImagePresignedUpload() {
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const mimeType = file.type;
      if (!PRODUCT_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`);
      }
      const meta = await get<ProductImageUploadUrl>(`/api/v1/products/${productId}/image/presigned-url`, {
        mimeType,
      });
      const resp = await fetch(meta.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });
      if (!resp.ok) {
        throw new Error(`R2 upload failed (HTTP ${resp.status})`);
      }
      return meta;
    },
  });
}

export function useProductSuppliers(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'suppliers'],
    queryFn: () => get<ProductSupplier[]>(`/api/v1/products/${productId}/suppliers`),
    enabled: !!productId,
  });
}

export function useNextSku(name: string) {
  return useQuery({
    queryKey: ['products', 'next-sku', name],
    queryFn: () => get<{ sku: string }>(`/api/v1/products/next-sku?name=${encodeURIComponent(name)}`),
    enabled: name.trim().length > 0,
  });
}

interface ProductSupplierLinkBody {
  supplierId: string;
  isDefault?: boolean;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
}

export function useLinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductSupplierLinkBody) => post<ProductSupplier>(`/api/v1/products/${productId}/suppliers`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUpdateProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: Omit<ProductSupplierLinkBody, 'supplierId'> }) =>
      put<ProductSupplier>(`/api/v1/products/${productId}/suppliers/${supplierId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUnlinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) => del(`/api/v1/products/${productId}/suppliers/${supplierId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

// ── Common Utility — Countries / States / Cities ─────────────────────────────

export function useListCountries() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn:  () => get<Country[]>('/api/v1/common-utility/countries/list'),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useListStates(countryId: number | null) {
  return useQuery<State[]>({
    queryKey: ['states', countryId],
    queryFn:  () => get<State[]>(`/api/v1/common-utility/states/list?countryId=${countryId}`),
    enabled:  countryId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useListCities(stateId: number | null) {
  return useQuery<City[]>({
    queryKey: ['cities', stateId],
    queryFn:  () => get<City[]>(`/api/v1/common-utility/cities/list?stateId=${stateId}`),
    enabled:  stateId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── Location image (single image; upload replaces) ────────────────────────────

export function useUploadLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, file }: { locationId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<Location>(`/api/v1/locations/${locationId}/image`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useRemoveLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => del(`/api/v1/locations/${locationId}/image`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

// ── Clerk User Management ───────────────────────────────────────────────────

const CLERK_USERS_KEY       = 'clerk-users';
const CLERK_INVITATIONS_KEY = 'clerk-invitations';

/** Backend returns clerkUserId only — add `id` so rows satisfy DataTable's `{ id: string }`. */
function withId(res: ClerkUserListResponse): ClerkUserListResponse {
  return { ...res, data: res.data.map((u) => ({ ...u, id: u.clerkUserId })) };
}

export const ClerkUsers = {
  /** GET /api/v1/users?limit=&offset=&organizationId= */
  useList(params: { page: number; limit?: number; organizationId?: string; enabled?: boolean }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'list', params.page, limit, params.organizationId],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users', {
          limit,
          offset: (params.page - 1) * limit,
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        }).then(withId),
      enabled: params.enabled !== false,
      staleTime: 30_000,
    });
  },

  /** GET /api/v1/users/search?query=&limit=&offset= */
  useSearch(params: { query: string; page: number; limit?: number; enabled?: boolean }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'search', params.query, params.page, limit],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users/search', {
          query: params.query,
          limit,
          offset: (params.page - 1) * limit,
        }).then(withId),
      enabled: params.enabled !== false && params.query.trim().length > 0,
      staleTime: 15_000,
    });
  },

  /** GET /api/v1/users/clerk/:clerkUserId/roles */
  useGetRoles(clerkUserId: string | undefined) {
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'roles', clerkUserId],
      queryFn: () => get<ClerkUserRolesResponse>(`/api/v1/users/clerk/${clerkUserId as string}/roles`),
      enabled: !!clerkUserId,
      staleTime: 30_000,
    });
  },

  /** POST /api/v1/users/clerk/invite — body: { email, roleId, locationId?, redirectUrl? } */
  useInvite() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: InviteUserPayload) => post<void>('/api/v1/users/clerk/invite', body),
      onSuccess: () => {
        toast.success('Invitation sent');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
        queryClient.invalidateQueries({ queryKey: [CLERK_INVITATIONS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
    });
  },

  /** GET /api/v1/users/clerk/invitations?status= */
  useListInvitations(status?: EInvitationStatus) {
    return useQuery({
      queryKey: [CLERK_INVITATIONS_KEY, status ?? 'all'],
      queryFn: () =>
        get<ClerkInvitation[]>('/api/v1/users/clerk/invitations', status ? { status } : {}),
      staleTime: 30_000,
    });
  },

  /** DELETE /api/v1/users/clerk/invitations/:invitationId */
  useRevokeInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (invitationId: string) => del<void>(`/api/v1/users/clerk/invitations/${invitationId}`),
      onSuccess: () => {
        toast.success('Invitation revoked');
        queryClient.invalidateQueries({ queryKey: [CLERK_INVITATIONS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to revoke invitation'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/roles */
  useUpdateRoles() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, body }: { clerkUserId: string; body: UpdateRolesPayload }) =>
        put<void>(`/api/v1/users/clerk/${clerkUserId}/roles`, body),
      onSuccess: () => {
        toast.success('Roles updated');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to update roles'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/ban */
  useBan() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => put<void>(`/api/v1/users/clerk/${clerkUserId}/ban`, {}),
      onSuccess: () => {
        toast.success('User banned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to ban user'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/unban */
  useUnban() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => put<void>(`/api/v1/users/clerk/${clerkUserId}/unban`, {}),
      onSuccess: () => {
        toast.success('User unbanned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to unban user'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId */
  useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => del(`/api/v1/users/clerk/${clerkUserId}`),
      onSuccess: () => {
        toast.success('User deleted');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete user'),
    });
  },

  /** POST /api/v1/users/clerk/:clerkUserId/organizations */
  useAssignOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, body }: { clerkUserId: string; body: AssignOrgPayload }) =>
        post<void>(`/api/v1/users/clerk/${clerkUserId}/organizations`, body),
      onSuccess: () => {
        toast.success('User assigned to organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to assign to organisation'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId/organizations/:organizationId */
  useRemoveFromOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, organizationId }: { clerkUserId: string; organizationId: string }) =>
        del(`/api/v1/users/clerk/${clerkUserId}/organizations/${organizationId}`),
      onSuccess: () => {
        toast.success('User removed from organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to remove from organisation'),
    });
  },

  /** GET /api/v1/users/clerk/organizations */
  useListOrganizations() {
    return useQuery<ClerkOrganization[]>({
      queryKey: [CLERK_USERS_KEY, 'organizations'],
      queryFn: () => get<ClerkOrganization[]>('/api/v1/users/clerk/organizations'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

// ── Fleet Reference Data ──────────────────────────────────────────────────────

export const VehicleTypes = {
  useList() {
    return useQuery<VehicleTypeRef[]>({
      queryKey: ['vehicle-types'],
      queryFn: () => get<VehicleTypeRef[]>('/api/v1/vehicles/vehicle-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const VehicleBrands = {
  useList() {
    return useQuery<VehicleBrandRef[]>({
      queryKey: ['vehicle-brands'],
      queryFn: () => get<VehicleBrandRef[]>('/api/v1/vehicles/vehicle-brands/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const FuelTypes = {
  useList() {
    return useQuery<FuelTypeRef[]>({
      queryKey: ['fuel-types'],
      queryFn: () => get<FuelTypeRef[]>('/api/v1/vehicles/fuel-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const MaintenanceTypes = {
  useList() {
    return useQuery<MaintenanceTypeRef[]>({
      queryKey: ['maintenance-types'],
      queryFn: () => get<MaintenanceTypeRef[]>('/api/v1/maintenance/maintenance-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const Analytics = {
  useSalesSummary() {
    return useQuery<SalesSummaryData>({
      queryKey: ['analytics', 'sales-summary'],
      queryFn:  () => get<SalesSummaryData>('/api/v1/analytics/sales-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  useRevenueTrend(months = 6) {
    return useQuery<RevenueTrendPoint[]>({
      queryKey: ['analytics', 'revenue-trend', months],
      queryFn:  () => get<RevenueTrendPoint[]>('/api/v1/analytics/revenue-trend', { months }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopProducts(limit = 10) {
    return useQuery<TopProduct[]>({
      queryKey: ['analytics', 'top-products', limit],
      queryFn:  () => get<TopProduct[]>('/api/v1/analytics/top-products', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopCustomers(limit = 10) {
    return useQuery<TopCustomer[]>({
      queryKey: ['analytics', 'top-customers', limit],
      queryFn:  () => get<TopCustomer[]>('/api/v1/analytics/top-customers', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  usePurchaseSummary() {
    return useQuery<PurchaseSummaryData>({
      queryKey: ['analytics', 'purchase-summary'],
      queryFn:  () => get<PurchaseSummaryData>('/api/v1/analytics/purchase-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  usePurchaseTrend(months = 6) {
    return useQuery<PurchaseTrendPoint[]>({
      queryKey: ['analytics', 'purchase-trend', months],
      queryFn:  () => get<PurchaseTrendPoint[]>('/api/v1/analytics/purchase-trend', { months }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopSuppliers(limit = 10) {
    return useQuery<TopSupplier[]>({
      queryKey: ['analytics', 'top-suppliers', limit],
      queryFn:  () => get<TopSupplier[]>('/api/v1/analytics/top-suppliers', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useInventorySummary() {
    return useQuery<InventorySummaryData>({
      queryKey: ['analytics', 'inventory-summary'],
      queryFn:  () => get<InventorySummaryData>('/api/v1/analytics/inventory-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  useStockByLocation() {
    return useQuery<StockByLocationPoint[]>({
      queryKey: ['analytics', 'stock-by-location'],
      queryFn:  () => get<StockByLocationPoint[]>('/api/v1/analytics/stock-by-location'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

// ── Fleet Management ──────────────────────────────────────────────────────────

export const FleetVehicles = createResource<FleetVehicle>('/api/v1/vehicles', 'fleet-vehicles', 'Vehicle');
export const FleetDrivers  = createResource<FleetDriver>('/api/v1/drivers', 'fleet-drivers', 'Driver');
export const FleetTrips    = createResource<FleetTrip>('/api/v1/trips', 'fleet-trips', 'Trip');

export const FleetMaintenanceApi = {
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<FleetMaintenance>) => post<FleetMaintenance>('/api/v1/maintenance', body),
      onSuccess: () => {
        toast.success('Maintenance record created');
        queryClient.invalidateQueries({ queryKey: ['fleet-maintenance'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to create maintenance record'),
    });
  },
};

export const FleetExpensesApi = {
  useGet(id: string | undefined) {
    return useQuery<FleetExpense>({
      queryKey: ['fleet-expenses', id],
      queryFn: () => get<FleetExpense>(`/api/v1/vehicle-expenses/${id as string}`),
      enabled: !!id,
    });
  },
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<FleetExpense>) => post<FleetExpense>('/api/v1/vehicle-expenses', body),
      onSuccess: () => {
        toast.success('Expense recorded');
        queryClient.invalidateQueries({ queryKey: ['fleet-expenses'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to record expense'),
    });
  },
  useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => del(`/api/v1/vehicle-expenses/${id}`),
      onSuccess: () => {
        toast.success('Expense deleted');
        queryClient.invalidateQueries({ queryKey: ['fleet-expenses'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete expense'),
    });
  },
};

const PAGE_ACCESS_KEY = 'page-access';

export const PageAccess = {
  useList(opts?: { enabled?: boolean }) {
    return useQuery<PageAccessConfig[]>({
      queryKey: [PAGE_ACCESS_KEY],
      queryFn: () => get<PageAccessConfig[]>('/api/v1/common-utility/page-access'),
      staleTime: 5 * 60 * 1000,
      enabled: opts?.enabled !== false,
    });
  },

  useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (configs: PageAccessConfig[]) =>
        put<void>('/api/v1/common-utility/page-access', { configs }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: [PAGE_ACCESS_KEY] });
        toast.success('Page access configuration saved');
      },
      onError: () => toast.error('Failed to save page access configuration'),
    });
  },
};

export * from './features/auth/api';
export * from './features/inventory/api';
export * from './features/purchasing/api';
export * from './features/sales/api';
export * from './features/fleet/api';
export * from './features/core/api';
