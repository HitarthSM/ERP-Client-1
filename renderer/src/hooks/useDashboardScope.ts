import { useMemo, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Locations } from '../api';
import { canViewAllBranches } from '../config/dashboard-permissions';

export function useDashboardScope() {
  const { raw, isOrgAdmin } = useSession();
  const hasOrgWideAccess = raw?.hasOrgWideAccess ?? isOrgAdmin;
  const assignedLocationId = raw?.locationIds?.[0];
  const currencyCode = raw?.currencyCode ?? 'KES';

  const { data: locations } = Locations.useList();
  const canPickLocation = canViewAllBranches(hasOrgWideAccess);

  const [selectedLocationId, setSelectedLocationId] = useState<string | 'all'>('all');

  const effectiveLocationId = useMemo(() => {
    if (!canPickLocation) return assignedLocationId;
    return selectedLocationId === 'all' ? undefined : selectedLocationId;
  }, [canPickLocation, assignedLocationId, selectedLocationId]);

  const locationOptions = useMemo(() => {
    if (!canPickLocation && assignedLocationId) {
      const loc = locations?.find((l) => l.id === assignedLocationId);
      return loc ? [{ id: loc.id, name: loc.name }] : [];
    }
    return locations ?? [];
  }, [canPickLocation, assignedLocationId, locations]);

  return {
    currencyCode,
    hasOrgWideAccess,
    canPickLocation,
    assignedLocationId,
    selectedLocationId,
    setSelectedLocationId,
    effectiveLocationId,
    locationOptions,
  };
}
