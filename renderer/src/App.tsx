import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { PageAccessProvider } from './context/PageAccessContext';
import PageAccessRoute from './components/PageAccessRoute';

const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifySecondFactor = lazy(() => import('./pages/VerifySecondFactor'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));
const SSOContinue = lazy(() => import('./pages/SSOContinue'));
const CreateOrganization = lazy(() => import('./pages/CreateOrganization'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PurchaseDashboard = lazy(() => import('./pages/dashboards/PurchaseDashboard'));
const InventoryDashboard = lazy(() => import('./pages/dashboards/InventoryDashboard'));
const SalesDashboard = lazy(() => import('./pages/dashboards/SalesDashboard'));
const Products = lazy(() => import('./pages/Products'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const InventoryDetailPage = lazy(() => import('./pages/InventoryDetail'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Locations = lazy(() => import('./pages/Locations'));
const Categories = lazy(() => import('./pages/Categories'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const PurchaseOrderReceive = lazy(() => import('./pages/PurchaseOrderReceive'));
const Bills = lazy(() => import('./pages/Bills'));
const BillDetail = lazy(() => import('./pages/BillDetail'));
const PaymentTransactions = lazy(() => import('./pages/PaymentTransactions'));
const ItemReturns = lazy(() => import('./pages/ItemReturns'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ReportGenerationLogs = lazy(() => import('./pages/ReportGenerationLogs'));
const StockMovementsPage = lazy(() => import('./pages/StockMovements'));
const StockTransfersPage = lazy(() => import('./pages/StockTransfers'));
const StockRequestsPage = lazy(() => import('./pages/StockRequests'));
const UnpublishedStockPage = lazy(() => import('./pages/UnpublishedStock'));
const ProductLogsPage = lazy(() => import('./pages/ProductLogs'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Orders = lazy(() => import('./pages/Orders'));
const Invoices = lazy(() => import('./pages/Invoices'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Expenses = lazy(() => import('./pages/Expenses'));
const PlatformConfigurations = lazy(() => import('./pages/PlatformConfigurations'));
const AppUpdates = lazy(() => import('./pages/AppUpdates'));
const BillingSettings = lazy(() => import('./pages/BillingSettings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const PurchaseItems = lazy(() => import('./pages/PurchaseItems'));
const Roles = lazy(() => import('./pages/Roles'));
const UserRoles = lazy(() => import('./pages/UserRoles'));
const Users = lazy(() => import('./pages/Users'));
const UserDetail = lazy(() => import('./pages/UserDetail'));
const PageAccessPage = lazy(() => import('./pages/PageAccess'));
const PendingApprovals = lazy(() => import('./pages/credit-approvals/PendingApprovals'));
const BlackLedger = lazy(() => import('./pages/credit-approvals/BlackLedger'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'));
const FleetDashboard = lazy(() => import('./pages/Fleet'));
const FleetVehiclesPage = lazy(() => import('./pages/Fleet/Vehicles'));
const FleetDriversPage = lazy(() => import('./pages/Fleet/Drivers'));
const FleetTripsPage = lazy(() => import('./pages/Fleet/Trips'));
const FleetMaintenancePage = lazy(() => import('./pages/Fleet/Maintenance'));
const FleetExpensesPage = lazy(() => import('./pages/Fleet/Expenses'));
const SalesList = lazy(() => import('./pages/SalesList'));
const SalesBilling = lazy(() => import('./pages/pos/SalesBilling'));
const PurchaseBilling = lazy(() => import('./pages/pos/PurchaseBilling'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

// Requires a valid Clerk session but not an org — used for the onboarding flow.
function SessionRoute({ children }: { children: React.ReactNode }) {
  const { user, syncing } = useAuth();
  if (syncing && !user) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PosRedirect() {
  const [searchParams] = useSearchParams();
  if (searchParams.get('mode') === 'purchase') return <Navigate to="/pos/purchase" replace />;
  return <Navigate to="/pos/sales" replace />;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-second-factor" element={<VerifySecondFactor />} />
          <Route path="/sso-callback" element={<SSOCallback />} />
          <Route path="/sso-continue" element={<SSOContinue />} />
          <Route path="/onboarding/create-org" element={<SessionRoute><CreateOrganization /></SessionRoute>} />

          <Route path="/" element={<ProtectedRoute><PageAccessProvider><AppLayout /></PageAccessProvider></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/:id" element={<InventoryDetailPage />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="stores" element={<Locations />} />
            <Route path="warehouse" element={<Locations />} />
            <Route path="locations" element={<Locations />} />
            <Route path="categories" element={<Categories />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="purchase-orders/:id/receive" element={<PurchaseOrderReceive />} />
            <Route path="dashboard/purchase" element={<PurchaseDashboard />} />
            <Route path="dashboard/inventory" element={<InventoryDashboard />} />
            <Route path="dashboard/sales" element={<SalesDashboard />} />
            <Route path="pos" element={<PosRedirect />} />
            <Route path="sales/list" element={<SalesList />} />
            <Route path="pos/sales" element={<SalesBilling />} />
            <Route path="pos/purchase" element={<PurchaseBilling />} />
            <Route path="bills" element={<Bills />} />
            <Route path="bills/:id" element={<BillDetail />} />
            <Route path="payment-transactions" element={<PaymentTransactions />} />
            <Route path="item-returns" element={<ItemReturns />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="report-generation-logs" element={<ReportGenerationLogs />} />
            <Route path="stock-movements" element={<StockMovementsPage />} />
            <Route path="stock-transfers" element={<StockTransfersPage />} />
            <Route path="stock-requests" element={<StockRequestsPage />} />
            <Route path="unpublished-stock" element={<UnpublishedStockPage />} />
            <Route path="product-logs" element={<ProductLogsPage />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="pending-approvals" element={<PendingApprovals />} />
            <Route path="black-ledger" element={<BlackLedger />} />
            <Route path="orders" element={<Orders />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="approvals/pending" element={<PendingApprovals />} />
            <Route path="approvals/black-ledger" element={<BlackLedger />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="vehicles/:id" element={<VehicleDetailPage />} />
            <Route path="fleet" element={<FleetDashboard />} />
            <Route path="fleet/vehicles" element={<FleetVehiclesPage />} />
            <Route path="fleet/drivers" element={<FleetDriversPage />} />
            <Route path="fleet/trips" element={<FleetTripsPage />} />
            <Route path="fleet/maintenance" element={<FleetMaintenancePage />} />
            <Route path="fleet/expenses" element={<FleetExpensesPage />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="platform-configurations" element={<PlatformConfigurations />} />
            <Route path="settings/app" element={<AppUpdates />} />
            <Route path="settings/billing" element={<BillingSettings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="purchase-items" element={<PurchaseItems />} />
            <Route path="roles" element={<Roles />} />
            <Route path="user-roles" element={<UserRoles />} />
            <Route path="users" element={<Users />} />
            <Route path="users/clerk/:clerkUserId" element={<UserDetail />} />
            <Route path="page-access" element={<PageAccessRoute pageKey="page-access"><PageAccessPage /></PageAccessRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
