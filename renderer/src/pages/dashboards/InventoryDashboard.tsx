import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Layers, AlertTriangle, DollarSign, PackageX, MapPin, ShieldAlert, CalendarX } from 'lucide-react';
import { Analytics, Locations, Products, useInventoryLowStock } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import DashboardShell, { CHART_COLORS } from '../../components/dashboard/DashboardShell';
import { formatMoney } from '../../lib/format-money';
import { formatPeriodAxisLabel } from '../../lib/dashboard-period';

function KpiCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: string;
  icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className={`p-2 rounded-full ${color}`}><Icon size={16} /></div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function InventoryDashboardBody({
  period,
  locationId,
  currencyCode,
}: {
  period: import('../../components/dashboard/DashboardPeriodFilter').DashboardPeriodRange;
  locationId?: string;
  currencyCode: string;
}) {
  const locParams = { locationId };
  const periodParams = {
    period: period.preset,
    from: period.from,
    to: period.to,
    locationId,
  };
  const fmt = (n: number) => formatMoney(n, currencyCode);
  const ld = (v: boolean, s: string) => (v ? '…' : s);

  const { data: summary, isLoading: sLoading } = Analytics.useInventorySummary(locParams);
  const { data: byCategory, isLoading: catLoading } = Analytics.useStockValueByCategory(locParams);
  const { data: byLoc, isLoading: lLoading } = Analytics.useStockByLocation(locParams);
  const { data: invStatus, isLoading: statusLoading } = Analytics.useInventoryStatus(locParams);
  const { data: statusTrend, isLoading: trendLoading } = Analytics.useInventoryStatusTrend(periodParams);
  const { data: damage, isLoading: damageLoading } = Analytics.useStockDamageSummary({ ...periodParams, limit: 10 });
  const { data: fastMoving, isLoading: fastLoading } = Analytics.useFastMovingProducts({ ...periodParams, limit: 10 });
  const { data: deadStock, isLoading: deadLoading } = Analytics.useDeadStock({ ...locParams, limit: 10 });
  const { data: lowStock, isLoading: lowLoading } = useInventoryLowStock();
  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();

  const productName = useMemo(() => {
    const mp = new Map<string, string>();
    for (const p of products ?? []) {
      mp.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return mp;
  }, [products]);

  const locationName = useMemo(() => {
    const ml = new Map<string, string>();
    for (const l of locations ?? []) {
      ml.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    }
    return ml;
  }, [locations]);

  const categoryBars = (byCategory ?? []).filter((c) => c.value > 0);
  const locationPie = (byLoc ?? []).filter((l) => l.valuation > 0);

  const statusBars = useMemo(() => {
    if (!invStatus) return [];
    return [
      { status: 'Normal', count: invStatus.normal, fill: '#22c55e' },
      { status: 'Low', count: invStatus.low, fill: '#f59e0b' },
      { status: 'Out', count: invStatus.out, fill: '#ef4444' },
      { status: 'Over', count: invStatus.over, fill: '#8b5cf6' },
      { status: 'Dead', count: invStatus.dead, fill: '#64748b' },
    ].filter((r) => r.count > 0);
  }, [invStatus]);

  const statusTrendLines = useMemo(() => {
    return (statusTrend ?? []).map((row) => ({
      ...row,
      label: formatPeriodAxisLabel(row.period),
    }));
  }, [statusTrend]);

  const filteredLowStock = useMemo(() => {
    if (!locationId) return lowStock ?? [];
    return (lowStock ?? []).filter((row) => row.locationId === locationId);
  }, [lowStock, locationId]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total SKUs Tracked" icon={Layers} color="bg-blue-500/10 text-blue-500"
          value={ld(sLoading, String(summary?.totalSkus ?? 0))} />
        <KpiCard label="Low-Stock SKUs" icon={AlertTriangle} color="bg-amber-500/10 text-amber-500"
          value={ld(sLoading, String(summary?.lowStockCount ?? 0))} />
        <KpiCard label="Zero-Stock Items" icon={PackageX} color="bg-red-500/10 text-red-500"
          value={ld(sLoading, String(summary?.zeroStockCount ?? 0))} />
        <KpiCard label="Total Valuation" icon={DollarSign} color="bg-green-500/10 text-green-500"
          value={ld(sLoading, fmt(summary?.totalValuation ?? 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Stock Value by Category</h3>
          {catLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : categoryBars.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No category data</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, categoryBars.length * 36)}>
              <BarChart data={categoryBars} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(Number(v))} />
                <YAxis type="category" dataKey="categoryName" width={100} tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Value']} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} name="Value">
                  {categoryBars.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-blue-500" /> Stock Value by Store
          </h3>
          {lLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : locationPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No location data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={locationPie} dataKey="valuation" nameKey="locationName" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}>
                  {locationPie.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">Stock Status</h3>
        <p className="text-xs text-muted-foreground mb-3">Normal / Low / Out / Over / Dead (no sale in 90 days)</p>
        {statusLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : statusBars.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No inventory rows</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusBars} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="status" width={60} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {statusBars.map((row) => (
                  <Cell key={row.status} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">Stock Status Over Time</h3>
        <p className="text-xs text-muted-foreground mb-3">Trend by period — dead stock uses 90-day sales window at each point</p>
        {trendLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : statusTrendLines.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No trend data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={statusTrendLines} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="normal" name="Normal" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="low" name="Low" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="out" name="Out" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="over" name="Over" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dead" name="Dead" stroke="#64748b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            <h3 className="font-semibold text-sm">Damage & Write-offs</h3>
          </div>
          {damageLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (damage?.eventCount ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No damage or write-offs in selected period.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-muted-foreground text-xs">Units lost</p>
                  <p className="text-xl font-bold">{damage?.totalUnits ?? 0}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-muted-foreground text-xs">Events</p>
                  <p className="text-xl font-bold">{damage?.eventCount ?? 0}</p>
                </div>
              </div>
              {(damage?.topProducts.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Product</th>
                        <th className="py-2 font-medium">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(damage?.topProducts ?? []).map((row) => (
                        <tr key={row.productId} className="border-b border-border/60">
                          <td className="py-2 pr-4">{row.productName}</td>
                          <td className="py-2 font-semibold text-red-600">{row.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CalendarX size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm">Expiry Stock</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Batch and expiry tracking is not enabled yet. Enable the expiry module to see near-expiry and expired stock here.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Fast Moving — Top 10</h3>
          {fastLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (fastMoving?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">Units</th>
                    <th className="py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(fastMoving ?? []).map((row) => (
                    <tr key={row.productId} className="border-b border-border/60">
                      <td className="py-2 pr-4">{row.productName}</td>
                      <td className="py-2 pr-4 font-semibold">{row.quantity}</td>
                      <td className="py-2">{fmt(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Dead Stock — Top 10</h3>
            <Link to="/inventory" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {deadLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (deadStock?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No dead stock detected.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">On Hand</th>
                    <th className="py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(deadStock ?? []).map((row) => (
                    <tr key={row.productId} className="border-b border-border/60">
                      <td className="py-2 pr-4">{row.productName}</td>
                      <td className="py-2 pr-4">{row.quantity}</td>
                      <td className="py-2">{fmt(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" /> Low Stock Items
          </h3>
          <Link to="/inventory" className="text-sm text-primary hover:underline">View all inventory</Link>
        </div>
        {lowLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredLowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items below reorder level.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 pr-4 font-medium">On Hand</th>
                  <th className="py-2 font-medium">Reorder At</th>
                </tr>
              </thead>
              <tbody>
                {filteredLowStock.slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <Link to={`/inventory/${row.id}`} className="hover:underline">
                        {productName.get(row.productId) ?? formatEntityLabel({ id: row.productId })}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {locationName.get(row.locationId) ?? formatEntityLabel({ id: row.locationId })}
                    </td>
                    <td className="py-2 pr-4 text-red-500 font-semibold">{row.quantityOnHand}</td>
                    <td className="py-2 text-muted-foreground">{row.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function InventoryDashboard() {
  return (
    <DashboardShell title="Inventory Dashboard">
      {(ctx) => <InventoryDashboardBody {...ctx} />}
    </DashboardShell>
  );
}
