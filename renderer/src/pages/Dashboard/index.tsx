import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  FileText,
  Bell,
  AlertTriangle,
  DollarSign,
  Clock,
  ChevronRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Users2,
  MapPin,
  Car,
  ArrowRightLeft,
  Truck,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useSession } from '../../context/SessionContext';
import {
  Products,
  Suppliers,
  PurchaseOrders,
  Bills,
  Notifications,
  Customers,
  Locations,
  StockTransfers,
  useInventoryLowStock,
  useInventoryValuation,
  FleetVehicles,
  FleetTrips,
} from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { PurchaseOrder, Notification as NotificationType, Location } from '../../types';

// ── Chart colour palette ───────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  rose: '#f43f5e',
  teal: '#14b8a6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  lime: '#84cc16',
};

const PIE_COLORS = [C.blue, C.green, C.orange, C.rose, C.purple, C.teal];

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useCountUp(end: number, duration = 1400): number {
  const [count, setCount] = useState(0);
  const endRef = useRef(end);
  endRef.current = end;

  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      setCount(Math.round(endRef.current * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return count;
}

function useFadeIn(delay = 0) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return vis;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, iconColor = 'text-muted-foreground' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className={iconColor} />
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm p-5', className)}>
      <div className="mb-4">
        <h4 className="font-semibold text-sm">{title}</h4>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartTooltipBox({ active, payload, label, currency }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: boolean; payload?: any[]; label?: string; currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold ml-0.5">{currency ? fmt(p.value) : p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function AnimFade({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const vis = useFadeIn(delay);
  return (
    <div
      className={cn('transition-all duration-600', vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  label, rawValue, icon: Icon, iconBg, iconColor,
  sublabel, to, format, delay = 0,
}: {
  label: string;
  rawValue: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  sublabel?: string;
  to?: string;
  format?: 'currency' | 'number';
  delay?: number;
}) {
  const count = useCountUp(rawValue);
  const display = format === 'currency' ? fmt(count) : fmtN(count);

  const inner = (
    <AnimFade delay={delay}>
      <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group cursor-default">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{rawValue === 0 ? '…' : display}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
          <div className={cn('p-3 rounded-xl flex-shrink-0 ml-3 transition-transform duration-300 group-hover:scale-110', iconBg)}>
            <Icon size={20} className={iconColor} />
          </div>
        </div>
      </div>
    </AnimFade>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

function POBadge({ status }: { status: string | undefined }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-500',
    ordered: 'bg-blue-500/10 text-blue-500',
    partially_received: 'bg-amber-500/10 text-amber-500',
    received: 'bg-green-500/10 text-green-500',
    cancelled: 'bg-red-500/10 text-red-500',
  };
  const cls = map[status ?? ''] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', cls)}>
      {(status ?? 'unknown').replace('_', ' ')}
    </span>
  );
}

// ── Pie label ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + r * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Tab 1: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: productsData } = Products.useSearch({ limit: 1 });
  const { data: suppliersData } = Suppliers.useSearch({ limit: 1 });
  const { data: poData } = PurchaseOrders.useSearch({ limit: 1 });
  const { data: billsData } = Bills.useSearch({ limit: 1 });
  const { data: customersData } = Customers.useSearch({ limit: 1 });
  const { data: valuation } = useInventoryValuation();
  const { data: notifs, isLoading: notifsLoading } = Notifications.useSearch({ limit: 8 });
  const markReadMutation = Notifications.useMarkRead();
  const { data: pendingPOs, isLoading: pendingLoading } = PurchaseOrders.useSearch({
    limit: 6,
    filters: { status: 'draft' },
  });
  const { data: lowStock, isLoading: lowLoading } = useInventoryLowStock();

  const invValue = useMemo(() => {
    if (!valuation) return 0;
    return valuation.reduce((s, r) => s + (r.averageCost ?? 0) * r.quantityOnHand, 0);
  }, [valuation]);

  const notifList: NotificationType[] = notifs?.items ?? [];
  const pendingList: PurchaseOrder[] = pendingPOs?.items ?? [];
  const lowItems = (lowStock ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 6 KPI cards with count-up animation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Products" rawValue={productsData?.total ?? 0} icon={Package} iconBg="bg-blue-500/10" iconColor="text-blue-500" to="/products" delay={0} />
        <KpiCard label="Suppliers" rawValue={suppliersData?.total ?? 0} icon={Building2} iconBg="bg-violet-500/10" iconColor="text-violet-500" to="/suppliers" delay={80} />
        <KpiCard label="Purchase Orders" rawValue={poData?.total ?? 0} icon={ShoppingCart} iconBg="bg-orange-500/10" iconColor="text-orange-500" to="/purchase-orders" delay={160} />
        <KpiCard label="Bills" rawValue={billsData?.total ?? 0} icon={FileText} iconBg="bg-green-500/10" iconColor="text-green-500" to="/bills" delay={240} />
        <KpiCard label="Customers" rawValue={customersData?.total ?? 0} icon={Users2} iconBg="bg-teal-500/10" iconColor="text-teal-500" to="/customers" delay={320} />
        <KpiCard label="Inventory Value" rawValue={Math.round(invValue)} format="currency" icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-500" delay={400} />
      </div>

      <AnimFade delay={120}>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/sales" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
            Sales analytics →
          </Link>
          <Link to="/dashboard/purchase" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
            Purchase analytics →
          </Link>
          <Link to="/dashboard/inventory" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
            Inventory analytics →
          </Link>
        </div>
      </AnimFade>

      {/* Low-stock alert */}
      {!lowLoading && lowStock && lowStock.length > 0 && (
        <AnimFade delay={200}>
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 animate-pulse" />
            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
              <span className="font-semibold">{lowStock.length} SKU{lowStock.length !== 1 ? 's' : ''}</span> below reorder level — action needed
            </p>
            <Link to="/dashboard/inventory" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
              Review <ChevronRight size={12} />
            </Link>
          </div>
        </AnimFade>
      )}

      {/* Notifications + Pending POs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnimFade delay={100}>
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-muted-foreground" />
                <span className="font-semibold text-sm">Notifications</span>
                {notifList.filter((nn) => !nn.readAt).length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {notifList.filter((nn) => !nn.readAt).length}
                  </span>
                )}
              </div>
              <Link to="/notifications" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-border overflow-auto">
              {notifsLoading ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : notifList.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">All caught up</p>
                </div>
              ) : (
                notifList.map((nn, i) => (
                  <button
                    key={nn.id}
                    type="button"
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => { if (!nn.readAt) markReadMutation.mutate(nn.id); }}
                  >
                    <div className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', nn.readAt ? 'bg-muted' : 'bg-primary animate-pulse')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', nn.readAt ? 'font-normal text-muted-foreground' : 'font-medium')}>{nn.title ?? 'Notification'}</p>
                      {nn.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{nn.body}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{relativeTime(nn.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </AnimFade>

        <AnimFade delay={180}>
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-muted-foreground" />
                <span className="font-semibold text-sm">Pending Approvals</span>
              </div>
              <Link to="/purchase-orders" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-border overflow-auto">
              {pendingLoading ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : pendingList.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No pending orders</p>
                </div>
              ) : (
                pendingList.map((po) => (
                  <Link key={po.id} to={`/purchase-orders/${po.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{po.poNumber ?? formatEntityLabel({ id: po.id })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expected {formatDate(po.expectedAt)}{po.totalAmount ? ` · $${po.totalAmount.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <POBadge status={po.status} />
                      <ChevronRight size={13} className="text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </AnimFade>
      </div>

      {/* Low-stock table */}
      {!lowLoading && lowItems.length > 0 && (
        <AnimFade delay={300}>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <span className="font-semibold text-sm">Low Stock ({lowStock!.length} SKUs)</span>
              </div>
              <Link to="/dashboard/inventory" className="text-xs text-primary hover:underline flex items-center gap-1">
                Full report <ChevronRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs">
                    <th className="px-4 py-2.5 font-medium">Product ID</th>
                    <th className="px-4 py-2.5 font-medium">On Hand</th>
                    <th className="px-4 py-2.5 font-medium">Reorder At</th>
                    <th className="px-4 py-2.5 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`/inventory/${row.id}`} className="hover:underline font-medium">{formatEntityLabel({ id: row.productId })}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-red-500 font-bold">{row.quantityOnHand}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.reorderLevel}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500 font-medium">-{row.reorderLevel - row.quantityOnHand}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimFade>
      )}
    </div>
  );
}


// ── Tab 3: Operations ──────────────────────────────────────────────────────────

function OperationsTab() {
  const { data: transfers, isLoading: transfersLoading } = StockTransfers.useSearch({ limit: 8 });
  const { data: locationsList } = Locations.useList();
  const { data: valuation } = useInventoryValuation();
  const { data: vehicles } = FleetVehicles.useList();
  const { data: trips } = FleetTrips.useList();

  const fleetStatus = useMemo(() => {
    const counts: Record<string, number> = {
      available: 0, in_transit: 0, maintenance: 0, idle: 0, out_of_service: 0,
    };
    const colors: Record<string, string> = {
      available: C.green, in_transit: C.blue, maintenance: C.amber, idle: C.teal, out_of_service: C.rose,
    };
    const labels: Record<string, string> = {
      available: 'Available', in_transit: 'In transit', maintenance: 'Maintenance', idle: 'Idle', out_of_service: 'Out of service',
    };
    for (const vehicle of vehicles ?? []) {
      const status = vehicle.status ?? 'idle';
      if (status in counts) counts[status] += 1;
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ name: labels[key], value, color: colors[key] }));
  }, [vehicles]);

  const tripVolume = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const trip of trips ?? []) {
      const date = trip.startDatetime ? new Date(trip.startDatetime) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const key = date.toLocaleDateString('en', { month: 'short' });
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return Array.from(byMonth.entries()).map(([month, count]) => ({ month, trips: count }));
  }, [trips]);

  // Location performance
  const locationPerf = useMemo(() => {
    if (!valuation || !locationsList) return [];
    const locMap = new Map<string, Location>(locationsList.map((l) => [l.id, l]));
    const valMap = new Map<string, number>();
    const qtyMap = new Map<string, number>();
    for (const item of valuation) {
      const v = item.quantityOnHand * (item.averageCost ?? 0);
      valMap.set(item.locationId, (valMap.get(item.locationId) ?? 0) + v);
      qtyMap.set(item.locationId, (qtyMap.get(item.locationId) ?? 0) + item.quantityOnHand);
    }
    return Array.from(locMap.entries()).map(([id, loc]) => ({
      id, name: loc.name, type: loc.type,
      value: Math.round(valMap.get(id) ?? 0),
      qty: qtyMap.get(id) ?? 0,
      isActive: loc.isActive,
    })).sort((a, b) => b.value - a.value);
  }, [valuation, locationsList]);

  const transferList = transfers?.items ?? [];

  return (
    <div className="space-y-10">
      {/* ── Vehicle Fleet ── */}
      <section>
        <SectionHeader icon={Truck} title="Vehicle Fleet" iconColor="text-cyan-500" />
        <div className="grid gap-4 lg:grid-cols-3">
          <AnimFade delay={0}>
            <ChartCard title="Fleet Status" subtitle="Live · current vehicles">
              {fleetStatus.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No vehicles yet</div>
              ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={fleetStatus}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value"
                    animationBegin={0} animationDuration={1200}
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {fleetStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </ChartCard>
          </AnimFade>

          {/* Trip volume */}
          <AnimFade delay={80} className="lg:col-span-2">
            <ChartCard title="Trip Volume" subtitle="Live · by start month">
              {tripVolume.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No trips yet</div>
              ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={tripVolume}>
                  <defs>
                    <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.cyan} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipBox />} />
                  <Area type="monotone" dataKey="trips" name="Trips" stroke={C.cyan} strokeWidth={2} fill="url(#tripGrad)" dot={{ r: 3, fill: C.cyan }} animationDuration={1300} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </ChartCard>
          </AnimFade>

          {fleetStatus.map((v, i) => (
            <AnimFade key={v.name} delay={i * 70}>
              <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ background: `${v.color}18` }}>
                  <Car size={18} style={{ color: v.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{v.name} Vehicles</p>
                  <p className="text-xl font-bold">{v.value}</p>
                </div>
              </div>
            </AnimFade>
          ))}
        </div>

        {/* Vehicle module CTA */}
        <AnimFade delay={200}>
          <div className="mt-4 flex items-center gap-3 px-5 py-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <Zap size={16} className="text-cyan-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Fleet management</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vehicles, drivers, trips, and maintenance live under Fleet.</p>
            </div>
            <Link to="/fleet" className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 flex-shrink-0">
              Open module <ChevronRight size={12} />
            </Link>
          </div>
        </AnimFade>
      </section>

      {/* ── Stock Transfers ── */}
      <section>
        <SectionHeader icon={ArrowRightLeft} title="Stock Transfers" iconColor="text-indigo-500" />
        <AnimFade delay={0}>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Recent Transfers</span>
              <Link to="/stock-transfers" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {transfersLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">Loading transfers…</div>
            ) : transferList.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowRightLeft size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No stock transfers recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transferList.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-colors">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <ArrowRightLeft size={14} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formatEntityLabel({ id: t.id })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">#{t.transferNumber}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.status === 'completed' ? 'bg-green-500/10 text-green-500' : t.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500')}>
                      {t.status ?? 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimFade>
      </section>

      {/* ── Location Performance ── */}
      <section>
        <SectionHeader icon={MapPin} title="Location Performance" iconColor="text-rose-500" />
        {locationPerf.length > 0 ? (
          <>
            <AnimFade delay={0}>
              <ChartCard title="Stock Value by Location" subtitle="Real · all stores and warehouses">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={locationPerf} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltipBox currency />} />
                    <Bar dataKey="value" name="Stock Value" radius={[6, 6, 0, 0]} animationDuration={1200}>
                      {locationPerf.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </AnimFade>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {locationPerf.slice(0, 6).map((loc, i) => (
                <AnimFade key={loc.id} delay={i * 60}>
                  <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md" style={{ background: `${PIE_COLORS[i % PIE_COLORS.length]}18` }}>
                        <MapPin size={12} style={{ color: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Stock Value</p>
                        <p className="font-bold">{fmt(loc.value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Units</p>
                        <p className="font-bold">{loc.qty.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </AnimFade>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-xl text-sm text-muted-foreground">
            No location inventory data available
          </div>
        )}
      </section>
    </div>
  );
}

// ── Root Dashboard ─────────────────────────────────────────────────────────────

type Tab = 'overview' | 'operations';

export default function Dashboard() {
  const { user, organization } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const orgName = organization?.name ?? 'Your Organization';
  const userName = user?.firstName ?? 'there';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const tabs: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'operations', icon: Truck, label: 'Operations' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Good {getGreeting()}, {userName}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Building2 size={13} />
            <span className="font-medium">{orgName}</span>
            <span className="text-border">·</span>
            <span>{today}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl self-start sm:self-auto">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-in fade-in duration-300">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'operations' && <OperationsTab />}
      </div>
    </div>
  );
}
