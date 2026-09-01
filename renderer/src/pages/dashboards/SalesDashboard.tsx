import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  ComposedChart, Area, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Analytics } from '../../api';
import DashboardShell, { CHART_COLORS } from '../../components/dashboard/DashboardShell';
import { DASHBOARD_PERMISSIONS, canViewSensitiveChart } from '../../config/dashboard-permissions';
import { useSession } from '../../context/SessionContext';
import type { DashboardPeriodRange } from '../../components/dashboard/DashboardPeriodFilter';
import { formatPeriodAxisLabel } from '../../lib/dashboard-period';
import { formatMoney } from '../../lib/format-money';
import { cn } from '../../lib/utils';

const SALES_BLUE = '#3b82f6';
const SALES_BLUE_LIGHT = '#93c5fd';

const PAYMENT_COLORS: Record<string, string> = {
  'M-Pesa': '#22c55e',
  Cash: '#f97316',
  Bank: '#3b82f6',
  Credit: '#94a3b8',
  Other: '#94a3b8',
};

const PERF_BAR_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f97316'];

function toParams(period: DashboardPeriodRange, locationId?: string) {
  return { period: period.preset, from: period.from, to: period.to, locationId };
}

function truncateName(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatTrend(current: number, previous: number | undefined, label: string): string | undefined {
  if (previous === undefined) return undefined;
  const pct = pctChange(current, previous);
  if (pct === null) return undefined;
  if (pct === 0) return `— No change ${label}`;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}% ${label}`;
}

function ChartCard({
  title, subtitle, children, className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-4 shadow-sm', className)}>
      <div className="mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  label, value, sub, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
}) {
  const isUp = trend?.startsWith('+');
  const isDown = trend?.startsWith('-') && !trend.startsWith('—');

  return (
    <div className="p-3.5 bg-card border border-border rounded-xl shadow-sm min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
      <p className="text-lg font-bold mt-1 truncate" title={value}>{value}</p>
      {trend && (
        <p className={cn(
          'text-[11px] mt-1 truncate flex items-center gap-0.5',
          isUp && 'text-green-600 dark:text-green-400',
          isDown && 'text-red-600 dark:text-red-400',
          !isUp && !isDown && 'text-muted-foreground',
        )}>
          {isUp && <TrendingUp size={11} />}
          {isDown && <TrendingDown size={11} />}
          {trend}
        </p>
      )}
      {!trend && sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">{label}</div>
  );
}

function TopPerformanceList({
  items, loading,
}: {
  items: { name: string; pct: number; detail: string }[];
  loading: boolean;
}) {
  if (loading) return <ChartEmpty label="Loading…" />;
  if (items.length === 0) return <ChartEmpty label="No sales in period" />;

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={item.name}>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
            </div>
            <span className="text-xs font-semibold tabular-nums flex-shrink-0">{item.pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${item.pct}%`, background: PERF_BAR_COLORS[idx % PERF_BAR_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesDashboardBody({
  period, locationId, currencyCode,
}: { period: DashboardPeriodRange; locationId?: string; currencyCode: string }) {
  const { user, raw } = useSession();
  const canViewMargin = canViewSensitiveChart(
    DASHBOARD_PERMISSIONS.sales.margin,
    user?.roles,
    raw?.hasOrgWideAccess ?? false,
  );

  const params = toParams(period, locationId);
  const fmt = (n: number) => formatMoney(n, currencyCode);
  const ld = (loading: boolean, value: string) => (loading ? '…' : value);

  const { data: summary, isLoading: sLoading } = Analytics.useSalesSummary(params);
  const { data: trend, isLoading: tLoading } = Analytics.useRevenueTrend(params);
  const { data: topProd, isLoading: pLoading } = Analytics.useTopProducts({ ...params, limit: 10 });
  const { data: byCategory, isLoading: cLoading } = Analytics.useSalesByCategory(params);
  const { data: paymentMix, isLoading: payLoading } = Analytics.usePaymentMix(params);
  const { data: demandTiers, isLoading: dLoading } = Analytics.useProductDemandTiers(params);

  const showMarginKpi = canViewMargin;

  const comparisonLabel = summary?.comparisonLabel ?? 'vs previous period';

  const categoryBars = useMemo(
    () => (byCategory ?? []).slice(0, 8).map((c) => ({
      name: truncateName(c.categoryName, 12),
      revenue: c.value,
    })),
    [byCategory],
  );

  const performanceItems = useMemo(() => {
    const products = topProd ?? [];
    const total = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    if (total <= 0) return [];
    return products.slice(0, 4).map((p) => ({
      name: p.productName,
      pct: Math.round((p.totalRevenue / total) * 100),
      detail: `${fmt(p.totalRevenue)} revenue`,
    }));
  }, [topProd, currencyCode]);

  const pieData = (paymentMix ?? []).filter((p) => p.amount > 0);
  const demandPie = (demandTiers ?? []).filter((d) => d.count > 0);
  const demandTotal = demandPie.reduce((sum, d) => sum + d.count, 0);

  const periodLabel = period.preset === 'today' ? 'today'
    : period.preset === '7d' ? 'last 7 days'
      : period.preset === 'month' ? 'this month'
        : period.preset === 'year' ? 'this year'
          : 'selected period';

  const prev = summary?.previous;

  return (
    <>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Top Selling"
          value={ld(sLoading, summary?.topSelling ? truncateName(summary.topSelling.productName, 18) : '—')}
          trend={summary?.topSelling
            ? formatTrend(summary.topSelling.currentValue, summary.topSelling.previousValue, comparisonLabel)
            : undefined}
          sub={summary?.topSelling ? fmt(summary.topSelling.currentValue) : 'No sales yet'}
        />
        <KpiCard
          label="High Profit"
          value={ld(sLoading, !showMarginKpi ? 'Restricted' : summary?.topMargin ? truncateName(summary.topMargin.productName, 18) : '—')}
          trend={showMarginKpi && summary?.topMargin
            ? formatTrend(summary.topMargin.currentValue, summary.topMargin.previousValue, comparisonLabel)
            : undefined}
          sub={showMarginKpi ? undefined : 'Margin access required'}
        />
        <KpiCard
          label="Premium Product"
          value={ld(sLoading, summary?.topCostly ? truncateName(summary.topCostly.productName, 18) : '—')}
          trend={summary?.topCostly
            ? formatTrend(summary.topCostly.currentValue, summary.topCostly.previousValue, comparisonLabel)
            : undefined}
        />
        <KpiCard
          label="Invoices"
          value={ld(sLoading, String(summary?.completedBills ?? 0))}
          trend={prev ? formatTrend(summary?.completedBills ?? 0, prev.completedBills, comparisonLabel) : undefined}
        />
        <KpiCard
          label="Units Sold"
          value={ld(sLoading, (summary?.totalUnitsSold ?? 0).toLocaleString())}
          trend={prev ? formatTrend(summary?.totalUnitsSold ?? 0, prev.totalUnitsSold, comparisonLabel) : undefined}
        />
        <KpiCard
          label="Customers"
          value={ld(sLoading, String(summary?.activeCustomers ?? 0))}
          trend={prev ? formatTrend(summary?.activeCustomers ?? 0, prev.activeCustomers, comparisonLabel) : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Sales by Category" subtitle={`Revenue · ${periodLabel}`}>
          {cLoading ? (
            <ChartEmpty label="Loading…" />
          ) : categoryBars.length === 0 ? (
            <ChartEmpty label="No sales in period" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryBars} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56}
                  tickFormatter={(v) => fmt(Number(v)).replace(/\.\d+/, '')} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} />
                <Bar dataKey="revenue" fill={SALES_BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Sales Trend" subtitle={`Revenue · ${periodLabel}`} className="lg:col-span-2">
          {tLoading ? (
            <ChartEmpty label="Loading…" />
          ) : (trend ?? []).length === 0 ? (
            <ChartEmpty label="No revenue data in period" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trend ?? []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SALES_BLUE} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={SALES_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatPeriodAxisLabel} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={72} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [fmt(Number(v)), 'Revenue']}
                  labelFormatter={(label) => formatPeriodAxisLabel(String(label ?? ''))}
                />
                <Area type="monotone" dataKey="revenue" fill="url(#salesTrendFill)" stroke="none" legendType="none" />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={SALES_BLUE}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: SALES_BLUE, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Top Performance" subtitle="Share of revenue from top products">
          <TopPerformanceList items={performanceItems} loading={pLoading} />
        </ChartCard>

        <ChartCard title="Product Distribution" subtitle="Demand tiers in period">
          {dLoading ? (
            <ChartEmpty label="Loading…" />
          ) : demandPie.length === 0 ? (
            <ChartEmpty label="No sales in period" />
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={demandPie}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {demandPie.map((_, idx) => (
                      <Cell key={idx} fill={idx === 0 ? SALES_BLUE : idx === 1 ? '#6366f1' : SALES_BLUE_LIGHT} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [Number(v).toLocaleString(), name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                <span className="text-lg font-bold tabular-nums">{demandTotal.toLocaleString()}</span>
                <span className="text-[11px] text-muted-foreground">Products</span>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Payment Methods" subtitle="By amount collected">
          {payLoading ? (
            <ChartEmpty label="Loading…" />
          ) : pieData.length === 0 ? (
            <ChartEmpty label="No payments in period" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={82}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pieData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PAYMENT_COLORS[entry.method] ?? CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={ld(sLoading, fmt(summary?.revenueThisMonth ?? 0))}
          trend={prev ? formatTrend(summary?.revenueThisMonth ?? 0, prev.revenue, comparisonLabel) : undefined}
        />
        <KpiCard
          label="Avg Bill Value"
          value={ld(sLoading, fmt(summary?.avgBillValue ?? 0))}
          trend={prev ? formatTrend(summary?.avgBillValue ?? 0, prev.avgBillValue, comparisonLabel) : undefined}
        />
        <KpiCard
          label="Pending Bills"
          value={ld(sLoading, String(summary?.pendingBills ?? 0))}
          sub="draft or initiated"
        />
        <KpiCard
          label="Bill Count Trend"
          value={ld(tLoading, String((trend ?? []).reduce((s, p) => s + (p.billCount ?? 0), 0)))}
          sub="bills in trend buckets"
        />
      </div>
    </>
  );
}

export default function SalesDashboard() {
  return (
    <DashboardShell title="Sales Dashboard">
      {(ctx) => <SalesDashboardBody {...ctx} />}
    </DashboardShell>
  );
}
