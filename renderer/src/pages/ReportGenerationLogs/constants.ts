import type { EReportType } from '../../types';

type ReportOption = { value: EReportType; label: string };
export type ReportGroup = { label: string; options: ReportOption[] };

export const REPORT_TYPE_GROUPS: ReportGroup[] = [
  {
    label: 'Sales',
    options: [
      { value: 'total_sales', label: 'Total Sales' },
      { value: 'cash_sales', label: 'Cash Sales' },
      { value: 'credit_sales', label: 'Credit Sales' },
      { value: 'total_bills', label: 'Total Bills' },
      { value: 'average_bill_value', label: 'Average Bill Value' },
      { value: 'time_wise_sales', label: 'Time-wise Sales' },
      { value: 'top_selling_products', label: 'Top Selling Products' },
      { value: 'slow_moving_products', label: 'Slow Moving Products' },
    ],
  },
  {
    label: 'Finance',
    options: [
      { value: 'total_expense', label: 'Total Expense' },
      { value: 'shop_expense', label: 'Shop Expense' },
      { value: 'other_expense', label: 'Other Expense' },
      { value: 'opening_cash', label: 'Opening Cash' },
      { value: 'closing_cash', label: 'Closing Cash' },
      { value: 'total_purchase', label: 'Total Purchase' },
      { value: 'purchase_return', label: 'Purchase Return' },
      { value: 'total_profit', label: 'Total Profit' },
      { value: 'net_profit', label: 'Net Profit' },
    ],
  },
  {
    label: 'Stock',
    options: [
      { value: 'closing_stock', label: 'Closing Stock' },
      { value: 'low_stock_items', label: 'Low Stock Items' },
      { value: 'out_of_stock_items', label: 'Out of Stock Items' },
      { value: 'damaged_stock', label: 'Damaged Stock' },
      { value: 'returned_items', label: 'Returned Items' },
    ],
  },
  {
    label: 'Customers & Credit',
    options: [
      { value: 'total_customers', label: 'Total Customers' },
      { value: 'new_customers', label: 'New Customers' },
      { value: 'repeat_customers', label: 'Repeat Customers' },
      { value: 'credit_given', label: 'Credit Given' },
      { value: 'credit_received', label: 'Credit Received' },
      { value: 'pending_credit', label: 'Pending Credit' },
    ],
  },
  {
    label: 'Suppliers & Staff',
    options: [
      { value: 'supplier_payment', label: 'Supplier Payment' },
      { value: 'pending_supplier_payment', label: 'Pending Supplier Payment' },
      { value: 'staff_attendance', label: 'Staff Attendance' },
      { value: 'weekly_comparison', label: 'Weekly Comparison' },
    ],
  },
];

export const REPORT_TYPE_LABEL = Object.fromEntries(
  REPORT_TYPE_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label])),
) as Record<EReportType, string>;

const TYPE_CATEGORY: Partial<Record<EReportType, string>> = {};
for (const grp of REPORT_TYPE_GROUPS) {
  for (const opt of grp.options) {
    TYPE_CATEGORY[opt.value] = grp.label;
  }
}

const CHIP_STYLES: Record<string, string> = {
  Sales: 'bg-blue-100 text-blue-700',
  Finance: 'bg-teal-100 text-teal-700',
  Stock: 'bg-pink-100 text-pink-700',
  'Customers & Credit': 'bg-orange-100 text-orange-700',
  'Suppliers & Staff': 'bg-purple-100 text-purple-700',
};

export function reportChipClass(reportType: EReportType | undefined): string {
  const cat = reportType ? (TYPE_CATEGORY[reportType] ?? '') : '';
  return CHIP_STYLES[cat] ?? 'bg-slate-100 text-slate-600';
}

export const PERIOD_LABEL: Record<string, string> = {
  DAILY: 'Daily',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
};

export const REPORT_TYPE_FILTER_OPTIONS = REPORT_TYPE_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ value: o.value, label: o.label, group: g.label })),
);
