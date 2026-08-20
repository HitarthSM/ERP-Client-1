import {
  Activity,
  ArrowLeftRight,
  ArrowUpCircle,
  Banknote,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building,
  Building2,
  CalendarX,
  Car,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  EyeOff,
  FileText,
  FolderTree,
  Fuel,
  Hash,
  History,
  LayoutDashboard,
  Loader2,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Percent,
  Plug,
  Printer,
  Receipt,
  RotateCcw,
  Route,
  Ruler,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  Tags,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Users2,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon
} from 'lucide-react';

export interface ModuleItem {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
  /** No page/API wired up yet — rendered in the sidebar but not clickable. */
  disabled?: boolean;
}

export interface ModuleGroup {
  label: string;
  icon: LucideIcon;
  items: ModuleItem[];
}


export const MODULES: ModuleGroup[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { key: 'dashboard', title: 'Main Dashboard', path: '/', icon: LayoutDashboard },
      { key: 'dashboard-sales', title: 'Sales', path: '/dashboard/sales', icon: TrendingUp },
      { key: 'dashboard-purchase', title: 'Purchase', path: '/dashboard/purchase', icon: ShoppingCart },
      { key: 'dashboard-inventory', title: 'Inventory', path: '/dashboard/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Sales',
    icon: ShoppingBag,
    items: [
      { key: 'pos-sales', title: 'New Sale', path: '/pos/sales', icon: ScanLine },
      { key: 'sales-list', title: 'Sales List', path: '/sales/list', icon: FileText },
      { key: 'pending-approvals', title: 'Pending Approvals', path: '/pending-approvals', icon: CheckSquare },
      { key: 'black-ledger', title: 'Black Ledger', path: '/black-ledger', icon: Wallet },
      { key: 'customers', title: 'Customers', path: '/customers', icon: Users2 },
      // { key: 'quotations', title: 'Quotations', path: '/sales/quotations', icon: FileText, disabled: true },
      { key: 'orders', title: 'Sales Orders', path: '/orders', icon: ClipboardList },
      // { key: 'dispatch', title: 'Dispatch', path: '/sales/dispatch', icon: Truck, disabled: true },
      // { key: 'invoices', title: 'Invoices', path: '/invoices', icon: Receipt },
      // { key: 'sales-returns', title: 'Returns', path: '/item-returns', icon: RotateCcw },
      // { key: 'payments-received', title: 'Payments Received', path: '/payment-transactions', icon: CreditCard },
    ],
  },
  {
    label: 'Purchase',
    icon: ShoppingCart,
    items: [
      { key: 'purchase-billing', title: 'Purchase Billing', path: '/pos/purchase', icon: PackagePlus },
      { key: 'suppliers', title: 'Suppliers', path: '/suppliers', icon: Building2 },
      // { key: 'rfq', title: 'RFQ / Enquiry', path: '/purchase/rfq', icon: Search, disabled: true },
      { key: 'purchase-orders', title: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
      // { key: 'grn', title: 'GRN', path: '/purchase/grn', icon: PackageCheck, disabled: true },
      { key: 'bills', title: 'Bills', path: '/bills', icon: FileText },
      // { key: 'purchase-returns', title: 'Returns', path: '/item-returns', icon: RotateCcw },
      // { key: 'payments-made', title: 'Payments Made', path: '/payment-transactions', icon: Banknote },
      // { key: 'purchase-items', title: 'Purchase Items', path: '/purchase-items', icon: Receipt },
    ],
  },
  {
    label: 'Inventory',
    icon: Boxes,
    items: [
      { key: 'inventory', title: 'Stock Overview', path: '/inventory', icon: BarChart2 },
      { key: 'stock-movements', title: 'Stock Ledger', path: '/stock-movements', icon: BookOpen },
      // { key: 'adjustments', title: 'Adjustments', path: '/inventory/adjustments', icon: SlidersHorizontal, disabled: true },
      { key: 'stock-transfers', title: 'Transfers', path: '/stock-transfers', icon: ArrowLeftRight },
      { key: 'stock-requests', title: 'Stock Requests', path: '/stock-requests', icon: PackagePlus },
      // { key: 'in-transit', title: 'In Transit', path: '/inventory/in-transit', icon: Loader2, disabled: true },
      // { key: 'batches', title: 'Batches / Lots', path: '/inventory/batches', icon: Tag, disabled: true },
      // { key: 'expiry', title: 'Expiry', path: '/inventory/expiry', icon: CalendarX, disabled: true },
      { key: 'unpublished-stock', title: 'Unpublished Stock', path: '/unpublished-stock', icon: EyeOff },
    ],
  },
  {
    label: 'Products',
    icon: Package,
    items: [
      { key: 'products', title: 'Product List', path: '/products', icon: Package },
      { key: 'categories', title: 'Categories', path: '/categories', icon: FolderTree },
      { key: 'product-logs', title: 'Product Logs', path: '/product-logs', icon: History },
    ],
  },
  {
    label: 'Locations',
    icon: Warehouse,
    items: [
      { key: 'stores', title: 'Stores', path: '/stores', icon: Store },
      { key: 'warehouses', title: 'Warehouses', path: '/warehouse', icon: Building },
      // { key: 'warehouse-grn', title: 'GRN', path: '/warehouse/grn', icon: PackagePlus, disabled: true },
      // { key: 'gin', title: 'GIN', path: '/warehouse/gin', icon: PackageMinus, disabled: true },
    ],
  },
  {
    label: 'Fleet Management',
    icon: Truck,
    items: [
      { key: 'fleet-dashboard', title: 'Fleet Dashboard', path: '/fleet', icon: LayoutDashboard },
      { key: 'fleet-vehicles', title: 'Vehicles', path: '/fleet/vehicles', icon: Car },
      { key: 'fleet-drivers', title: 'Drivers', path: '/fleet/drivers', icon: Users2 },
      { key: 'fleet-trips', title: 'Trips', path: '/fleet/trips', icon: Route },
      { key: 'fleet-maintenance', title: 'Maintenance', path: '/fleet/maintenance', icon: Wrench },
      { key: 'fleet-expenses', title: 'Vehicle Expenses', path: '/fleet/expenses', icon: Fuel },
    ],
  },
  {
    label: 'Approvals',
    icon: CheckSquare,
    items: [
      { key: 'approvals-pending', title: 'Pending Credit Sales', path: '/approvals/pending', icon: Clock },
      { key: 'approvals-history', title: 'Black Ledger', path: '/approvals/black-ledger', icon: History },
    ],
  },
  // {
  //   label: 'Reports',
  //   icon: BarChart3,
  //   items: [
  //     { key: 'reports-home', title: 'Reports Home', path: '/reports', icon: BarChart3, disabled: true },
  //     { key: 'report-generation-logs', title: 'Report Generation Logs', path: '/report-generation-logs', icon: ClipboardList },
  //     { key: 'sales-summary', title: 'Sales Summary', path: '/reports/sales-summary', icon: TrendingUp, disabled: true },
  //     { key: 'purchase-summary', title: 'Purchase Summary', path: '/reports/purchase-summary', icon: ShoppingCart, disabled: true },
  //     { key: 'debtor-ageing', title: 'Debtor Ageing', path: '/reports/debtor-ageing', icon: CreditCard, disabled: true },
  //     { key: 'creditor-ageing', title: 'Creditor Ageing', path: '/reports/creditor-ageing', icon: Banknote, disabled: true },
  //     { key: 'stock-ageing', title: 'Stock Ageing', path: '/reports/stock-ageing', icon: Boxes, disabled: true },
  //     { key: 'warehouse-stock', title: 'Warehouse Stock', path: '/reports/warehouse-stock', icon: Warehouse, disabled: true },
  //     { key: 'lot-stock', title: 'Lot-wise Stock', path: '/reports/lot-stock', icon: Tag, disabled: true },
  //     { key: 'sales-vs-purchase', title: 'Sales vs Purchase', path: '/reports/sales-vs-purchase', icon: BarChart2, disabled: true },
  //     { key: 'product-profit', title: 'Product Profit', path: '/reports/product-profit', icon: BarChart3, disabled: true },
  //     { key: 'tax-summary', title: 'Tax Summary', path: '/reports/tax-summary', icon: Percent, disabled: true },
  //   ],
  // },
  {
    label: 'Administration',
    icon: Users,
    items: [
      { key: 'users', title: 'Users', path: '/users', icon: Users },
      { key: 'roles', title: 'Roles & Permissions', path: '/roles', icon: Lock },
      { key: 'user-roles', title: 'User Roles', path: '/user-roles', icon: UserCog },
      { key: 'organizations', title: 'Organizations', path: '/organizations', icon: Building2 },
      { key: 'activity-logs', title: 'Activity Logs', path: '/activity-logs', icon: Activity },
      { key: 'audit-log', title: 'Audit Log lookup', path: '/audit-log', icon: History },
      { key: 'expenses', title: 'Expenses', path: '/expenses', icon: Wallet },
      { key: 'page-access', title: 'Page Access', path: '/page-access', icon: ShieldCheck },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      //     { key: 'settings-general', title: 'General', path: '/platform-configurations', icon: Settings },
      { key: 'settings-app-updates', title: 'App updates', path: '/settings/app', icon: ArrowUpCircle },
      { key: 'settings-billing', title: 'Billing', path: '/settings/billing', icon: Percent },
      { key: 'settings-notifications', title: 'Notifications', path: '/settings/notifications', icon: Bell },
      //     { key: 'settings-tax', title: 'Tax', path: '/settings/tax', icon: Percent, disabled: true },
      //     { key: 'settings-uom', title: 'Unit of Measure', path: '/settings/uom', icon: Ruler, disabled: true },
      //     { key: 'settings-pricelists', title: 'Price Lists', path: '/settings/pricelists', icon: Tags, disabled: true },
      //     { key: 'settings-currency', title: 'Currency', path: '/settings/currency', icon: DollarSign, disabled: true },
      //     { key: 'settings-sequences', title: 'Sequences', path: '/settings/sequences', icon: Hash, disabled: true },
      //     { key: 'settings-templates', title: 'Templates', path: '/settings/templates', icon: Printer, disabled: true },
      //     { key: 'settings-integrations', title: 'Integrations', path: '/settings/integrations', icon: Plug, disabled: true },
      //     { key: 'settings-backup', title: 'Backup', path: '/settings/backup', icon: Database, disabled: true },
    ],
  },
];

export const ALL_ITEMS: ModuleItem[] = MODULES.flatMap((g) => g.items);

/** Longest matching MODULES path for a location, or null if the URL is not in the nav. */
export function pageKeyForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  let best: { path: string; key: string } | null = null;
  for (const item of ALL_ITEMS) {
    const path = item.path.replace(/\/$/, '') || '/';
    const matches = normalized === path || (path !== '/' && normalized.startsWith(`${path}/`));
    if (matches && (!best || path.length > best.path.length)) {
      best = { path, key: item.key };
    }
  }
  return best?.key ?? null;
}
