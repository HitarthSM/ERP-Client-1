import type { ReactNode } from 'react';
import { useSession } from '../../context/SessionContext';
import { canViewSensitiveChart } from '../../config/dashboard-permissions';

interface PermissionGatedChartProps {
  permission: string;
  children: ReactNode;
}

/** Renders nothing when the user lacks a sensitive-chart permission. */
export default function PermissionGatedChart({ permission, children }: PermissionGatedChartProps) {
  const { user, raw } = useSession();
  const hasOrgWideAccess = raw?.hasOrgWideAccess ?? false;

  const isSensitive =
    permission.includes('all-branches') ||
    permission.includes('margin') ||
    permission.includes('supplier-pricing');

  if (isSensitive && !canViewSensitiveChart(permission, user?.roles, hasOrgWideAccess)) {
    return null;
  }

  return <>{children}</>;
}
