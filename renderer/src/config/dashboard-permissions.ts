/** Hybrid dashboard permissions — module + sensitive widgets (Wave 1 role heuristics). */

export const DASHBOARD_PERMISSIONS = {
  sales: {
    view: 'dashboard.sales.view',
    allBranches: 'dashboard.sales.all-branches',
    margin: 'dashboard.sales.margin',
  },
  purchase: {
    view: 'dashboard.purchase.view',
    supplierPricing: 'dashboard.purchase.supplier-pricing',
  },
  inventory: {
    view: 'dashboard.inventory.view',
  },
} as const;

export function canViewDashboardModule(
  roles: readonly string[] | undefined,
  module: keyof typeof DASHBOARD_PERMISSIONS,
): boolean {
  const r = roles ?? [];
  if (r.some((role) => role === 'super_admin' || role === 'org_admin')) return true;
  if (module === 'sales' || module === 'purchase' || module === 'inventory') {
    return r.includes('store_manager') || r.includes('org_admin') || r.includes('super_admin');
  }
  return false;
}

export function canViewAllBranches(hasOrgWideAccess: boolean): boolean {
  return hasOrgWideAccess;
}

export function canViewSensitiveChart(
  permission: string,
  roles: readonly string[] | undefined,
  hasOrgWideAccess: boolean,
): boolean {
  if (permission.includes('all-branches') || permission.includes('margin') || permission.includes('supplier-pricing')) {
    return hasOrgWideAccess || (roles ?? []).some((r) => r === 'org_admin' || r === 'super_admin');
  }
  return canViewDashboardModule(roles, 'sales');
}
