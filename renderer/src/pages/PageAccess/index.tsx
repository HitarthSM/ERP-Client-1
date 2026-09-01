import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PageAccess } from '../../api';
import { useSession } from '../../context/SessionContext';
import type { PageAccessConfig } from '../../types';
import { ALL_ITEMS } from '../../config/modules';
import { isFullPageAccessRole } from '../../lib/page-access';

const ROLES = [
  { key: 'super_admin',    label: 'Super Admin' },
  { key: 'org_admin',     label: 'Org Admin' },
  { key: 'org_manager',   label: 'Org Manager' },
  { key: 'store_manager', label: 'Store Manager' },
  { key: 'store_staff',   label: 'Store Staff' },
];

function buildMap(configs: PageAccessConfig[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of configs) {
    map.set(c.pageKey, new Set(c.allowedRoles));
  }
  return map;
}

export default function PageAccessPage() {
  const { isSuperAdmin } = useSession();
  const { data: configs = [], isLoading } = PageAccess.useList();
  const { mutate: save, isPending } = PageAccess.useUpdate();

  const [accessMap, setAccessMap] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    if (configs.length > 0) {
      setAccessMap(buildMap(configs));
    }
  }, [configs]);

  const toggle = (pageKey: string, role: string) => {
    if (!isSuperAdmin) return;
    setAccessMap((prev) => {
      const next = new Map(prev);
      const roles = new Set(next.get(pageKey) ?? []);
      roles.has(role) ? roles.delete(role) : roles.add(role);
      next.set(pageKey, roles);
      return next;
    });
  };

  const handleReset = () => setAccessMap(buildMap(configs));

  const handleSave = () => {
    if (!isSuperAdmin) return;
    const payload: PageAccessConfig[] = ALL_ITEMS.map((item) => ({
      pageKey: item.key,
      allowedRoles: Array.from(accessMap.get(item.key) ?? []),
    }));
    save(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading page access configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Page Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Configure which roles can access each page. Super Admin and Org Admin always have full access.'
              : 'View which roles can access each page. Only Super Admin can change these settings.'}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
              <RotateCcw size={14} className="mr-1.5" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save size={14} className="mr-1.5" /> {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48">Page</th>
              {ROLES.map((r) => (
                <th key={r.key} className="px-4 py-3 font-medium text-muted-foreground text-center whitespace-nowrap">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_ITEMS.map((item) => {
              const allowed = accessMap.get(item.key) ?? new Set<string>();
              return (
                <tr key={item.key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="px-4 py-3 text-center">
                      {isFullPageAccessRole(r.key) ? (
                        <span className="inline-block w-4 h-4 rounded bg-primary/20 text-primary text-xs flex items-center justify-center" title="Always allowed">✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary"
                          checked={allowed.has(r.key)}
                          disabled={!isSuperAdmin}
                          onChange={() => toggle(item.key, r.key)}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
