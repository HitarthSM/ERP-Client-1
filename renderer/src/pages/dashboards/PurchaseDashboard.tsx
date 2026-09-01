import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus } from 'lucide-react';
import { Analytics, PurchaseOrders, Suppliers } from '../../api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import type { DashboardPeriodRange } from '../../components/dashboard/DashboardPeriodFilter';
import { formatPeriodAxisLabel } from '../../lib/dashboard-period';
import { formatMoney } from '../../lib/format-money';
import { formatEntityLabel } from '../../lib/entityLabel';
import { cn } from '../../lib/utils';

const PURCHASE_BLUE = '#3b82f6';
const DIST_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#8b5cf6'];

function toParams(period: DashboardPeriodRange, locationId?: string) {
  return { period: period.preset, from: period.from, to: period.to, locationId };
}

function ChartCard({
  title, subtitle, children, className, headerRight,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-4 shadow-sm', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">{label}</div>
  );
}

function PurchaseDashboardBody({
  period, locationId, currencyCode,
}: { period: DashboardPeriodRange; locationId?: string; currencyCode: string }) {
  const params = toParams(period, locationId);
  const fmt = (n: number) => formatMoney(n, currencyCode);

  const { data: trend, isLoading: tLoading } = Analytics.usePurchaseTrend(params);
  const { data: byCategory, isLoading: cLoading } = Analytics.usePurchaseByCategory(params);
  const { data: recentPos, isLoading: poLoading } = PurchaseOrders.useSearch({ limit: 8 });
  const { data: draftPos, isLoading: draftLoading } = PurchaseOrders.useSearch({
    limit: 10,
    filters: { status: 'draft' },
  });
  const { data: suppliers = [] } = Suppliers.useList();

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  const purchaseInfo = useMemo(() => {
    return (recentPos?.items ?? []).map((po) => {
      const total = po.totalAmount ?? 0;
      return {
        id: po.id,
        supplier: po.supplierId ? (supplierMap[po.supplierId] ?? formatEntityLabel({ id: po.supplierId })) : '—',
        purchaseId: po.poNumber ?? formatEntityLabel({ id: po.id }),
        price: total,
        total,
      };
    });
  }, [recentPos, supplierMap]);

  const pendingOrders = useMemo(() => {
    return (draftPos?.items ?? []).map((po) => ({
      id: po.id,
      supplier: po.supplierId ? (supplierMap[po.supplierId] ?? formatEntityLabel({ id: po.supplierId })) : '—',
      purchaseId: po.poNumber ?? formatEntityLabel({ id: po.id }),
      total: po.totalAmount ?? 0,
      status: po.status ?? 'draft',
    }));
  }, [draftPos, supplierMap]);

  const distribution = (byCategory ?? []).filter((c) => c.value > 0);

  const periodLabel = period.preset === 'today' ? 'Today'
    : period.preset === '7d' ? 'Last 7 Days'
      : period.preset === 'month' ? 'This Month'
        : period.preset === 'year' ? 'This Year'
          : 'Custom Range';

  return (
    <>
      <ChartCard
        title="Purchase Trend"
        subtitle="Day · Date · Branch"
        headerRight={(
          <span className="text-xs font-medium px-2.5 py-1 rounded-md border border-border bg-muted/50 text-muted-foreground">
            {periodLabel}
          </span>
        )}
      >
        {tLoading ? (
          <ChartEmpty label="Loading…" />
        ) : (trend ?? []).length === 0 ? (
          <ChartEmpty label="No purchase data in period" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trend ?? []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="purchaseTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURCHASE_BLUE} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={PURCHASE_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatPeriodAxisLabel}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => fmt(Number(v))}
                width={72}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Spend']}
                labelFormatter={(label) => formatPeriodAxisLabel(String(label ?? ''))}
              />
              <Area type="monotone" dataKey="spend" fill="url(#purchaseTrendFill)" stroke="none" legendType="none" />
              <Line
                type="monotone"
                dataKey="spend"
                stroke={PURCHASE_BLUE}
                strokeWidth={2.5}
                dot={{ r: 4, fill: PURCHASE_BLUE, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
                name="Spend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Purchase Information">
        {poLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : purchaseInfo.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No purchase orders yet</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="px-3 py-2.5 font-medium">Supplier</th>
                  <th className="px-3 py-2.5 font-medium">Purchase ID</th>
                  <th className="px-3 py-2.5 font-medium text-right">Price</th>
                  <th className="px-3 py-2.5 font-medium text-right">VAT</th>
                  <th className="px-3 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchaseInfo.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/60 last:border-0',
                      idx % 2 === 1 && 'bg-muted/30',
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium">{row.supplier}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/purchase-orders/${row.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        #{row.purchaseId}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.price)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Purchase Pending List" className="lg:col-span-2">
          {draftLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No draft purchase orders</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs">
                    <th className="px-3 py-2.5 font-medium">Supplier</th>
                    <th className="px-3 py-2.5 font-medium">Purchase ID</th>
                    <th className="px-3 py-2.5 font-medium text-right">Total</th>
                    <th className="px-3 py-2.5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border/60 last:border-0',
                        idx % 2 === 1 && 'bg-muted/30',
                      )}
                    >
                      <td className="px-3 py-2.5 font-medium">{row.supplier}</td>
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/purchase-orders/${row.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          #{row.purchaseId}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.total)}</td>
                      <td className="px-3 py-2.5 text-right capitalize text-muted-foreground">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Purchase Distribution">
          {cLoading ? (
            <ChartEmpty label="Loading…" />
          ) : distribution.length === 0 ? (
            <ChartEmpty label="No category data" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="categoryName"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {distribution.map((_, idx) => (
                    <Cell key={idx} fill={DIST_COLORS[idx % DIST_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Spend']} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </>
  );
}

export default function PurchaseDashboard() {
  return (
    <DashboardShell
      title="Purchase Dashboard"
      actions={(
        <Link
          to="/pos/purchase"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Purchase
        </Link>
      )}
    >
      {(ctx) => <PurchaseDashboardBody {...ctx} />}
    </DashboardShell>
  );
}
