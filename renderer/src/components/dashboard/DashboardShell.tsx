import type { ReactNode } from 'react';
import { useState } from 'react';
import DashboardPeriodFilter, {
  resolveDashboardPeriod,
  type DashboardPeriodRange,
} from './DashboardPeriodFilter';
import DashboardLocationFilter from './DashboardLocationFilter';
import { useDashboardScope } from '../../hooks/useDashboardScope';

interface DashboardShellProps {
  title: string;
  actions?: ReactNode;
  children: (ctx: {
    period: DashboardPeriodRange;
    locationId?: string;
    currencyCode: string;
  }) => ReactNode;
}

export default function DashboardShell({ title, actions, children }: DashboardShellProps) {
  const [period, setPeriod] = useState<DashboardPeriodRange>(() => resolveDashboardPeriod('month'));
  const scope = useDashboardScope();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {actions}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <DashboardPeriodFilter value={period} onChange={setPeriod} />
          <DashboardLocationFilter
            canPickLocation={scope.canPickLocation}
            selectedLocationId={scope.selectedLocationId}
            onChange={scope.setSelectedLocationId}
            locations={scope.locationOptions}
            assignedLocationId={scope.assignedLocationId}
          />
        </div>
      </div>
      {children({
        period,
        locationId: scope.effectiveLocationId,
        currencyCode: scope.currencyCode,
      })}
    </div>
  );
}

export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];
