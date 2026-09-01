import { useMemo, useState } from 'react';
import { Download, RefreshCw, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DataTable, type Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FilterDropdown } from '../../components/FilterDropdown';
import type { ExtraAction } from '../../components/RowActionsMenu';
import { Locations, ReportGenerationLogs } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { ReportGenerationLog, GenerateReportInput } from '../../types';
import {
  REPORT_TYPE_LABEL,
  REPORT_TYPE_FILTER_OPTIONS,
  PERIOD_LABEL,
  reportChipClass,
} from './constants';
import { GenerateModal } from './GenerateModal';

const PERIOD_FILTER_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PENDING', label: 'Pending' },
];

function formatDuration(log: ReportGenerationLog): string {
  if (!log.fromDate) return '—';
  const from = new Date(log.fromDate);
  const to = log.toDate ? new Date(log.toDate) : from;
  const fmt = (d: Date): string =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (log.reportPeriod === 'DAILY') return fmt(from);
  if (log.reportPeriod === 'MONTHLY')
    return from.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  if (log.reportPeriod === 'YEARLY') return String(from.getFullYear());
  const fromStr = from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${fromStr} – ${fmt(to)}`;
}

function statusBadge(status: string | undefined): React.ReactElement {
  if (status === 'COMPLETED')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Completed</span>;
  if (status === 'PROCESSING' || status === 'PENDING')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />{status === 'PROCESSING' ? 'Processing' : 'Pending'}</span>;
  if (status === 'FAILED')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Failed</span>;
  return <span className="text-xs text-muted-foreground">{status ?? '—'}</span>;
}

function StatCard({ icon, label, value, borderColor, bgColor, textColor }: {
  icon: React.ReactNode; label: string; value: number | undefined;
  borderColor: string; bgColor: string; textColor: string;
}): React.ReactElement {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-card p-5', borderColor)}>
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', bgColor, textColor)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value ?? '—'}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ReportGenerationLogsPage(): React.ReactElement {
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const [reportTypeFilter, setReportTypeFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportGenerationLog | null>(null);

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (reportTypeFilter) next.reportType = reportTypeFilter;
    if (periodFilter) next.reportPeriod = periodFilter;
    if (statusFilter) next.status = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [reportTypeFilter, periodFilter, statusFilter]);

  const hasActiveFilters = Boolean(reportTypeFilter || periodFilter || statusFilter || debouncedSearch);

  const { data: locations } = Locations.useList();
  const locationNameById = useMemo(
    () => Object.fromEntries((locations ?? []).map((loc) => [loc.id, loc.name])),
    [locations],
  );

  const { data, isLoading, error, refetch } = ReportGenerationLogs.useSearch({ page, search: debouncedSearch, filters });
  const { data: completedData } = ReportGenerationLogs.useSearch({ page: 1, limit: 1, filters: { status: 'COMPLETED' } });
  const { data: processingData } = ReportGenerationLogs.useSearch({ page: 1, limit: 1, filters: { status: 'PROCESSING' } });
  const { data: failedData } = ReportGenerationLogs.useSearch({ page: 1, limit: 1, filters: { status: 'FAILED' } });
  const { data: totalData } = ReportGenerationLogs.useSearch({ page: 1, limit: 1 });

  const generateMutation = ReportGenerationLogs.useGenerate();
  const downloadMutation = ReportGenerationLogs.useDownloadPdf();
  const deleteMutation = ReportGenerationLogs.useDelete();

  const columns: Column<ReportGenerationLog>[] = useMemo(() => [
    {
      key: 'reportName',
      label: 'Report Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-foreground">{row.reportName ?? '—'}</div>
          {row.reportType && (
            <div className="mt-0.5 text-xs text-muted-foreground">{REPORT_TYPE_LABEL[row.reportType]}</div>
          )}
        </div>
      ),
    },
    {
      key: 'reportType',
      label: 'Report Type',
      render: (row) =>
        row.reportType ? (
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', reportChipClass(row.reportType))}>
            {REPORT_TYPE_LABEL[row.reportType]}
          </span>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'reportPeriod',
      label: 'Period',
      render: (row) =>
        row.reportPeriod ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {PERIOD_LABEL[row.reportPeriod] ?? row.reportPeriod}
          </span>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'fromDate',
      label: 'Duration',
      render: (row) => <span className="text-sm text-muted-foreground">{formatDuration(row)}</span>,
    },
    {
      key: 'locationId',
      label: 'Location',
      render: (row) => (
        <span className="text-sm">
          {row.locationId ? (locationNameById[row.locationId] ?? 'Unknown location') : 'All Locations'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'createdAt',
      label: 'Generated On',
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '—',
    },
  ], [locationNameById]);

  const extraRowActions = useMemo(() => (row: ReportGenerationLog): ExtraAction[] => {
    const actions: ExtraAction[] = [];
    if (row.status === 'COMPLETED') {
      actions.push({
        label: 'Export PDF',
        icon: <Download size={14} />,
        onSelect: () => downloadMutation.mutate(row.id),
      });
    }
    if (row.status === 'FAILED' && row.reportType && row.reportPeriod && row.fromDate && row.toDate) {
      actions.push({
        label: 'Retry',
        icon: <RefreshCw size={14} />,
        onSelect: () =>
          generateMutation.mutate({
            reportType: row.reportType!,
            reportPeriod: row.reportPeriod!,
            fromDate: row.fromDate!,
            toDate: row.toDate!,
            locationId: row.locationId,
          }),
      });
    }
    return actions;
  }, [downloadMutation, generateMutation]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Report Type"
        options={REPORT_TYPE_FILTER_OPTIONS}
        value={reportTypeFilter}
        onChange={(v) => { setReportTypeFilter(v); setPage(1); }}
        searchable
        searchPlaceholder="Search types…"
      />
      <FilterDropdown
        label="Period"
        options={PERIOD_FILTER_OPTIONS}
        value={periodFilter}
        onChange={(v) => { setPeriodFilter(v); setPage(1); }}
      />
      <FilterDropdown
        label="Status"
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v); setPage(1); }}
      />
      <button
        type="button"
        onClick={() => setGenerateOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <FileText size={14} />
        Generate Report
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<FileText size={18} />} label="Total Reports" value={totalData?.total}
          borderColor="border-t-4 border-t-primary" bgColor="bg-blue-50" textColor="text-primary" />
        <StatCard icon={<CheckCircle size={18} />} label="Completed" value={completedData?.total}
          borderColor="border-t-4 border-t-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-700" />
        <StatCard icon={<Clock size={18} />} label="Processing" value={processingData?.total}
          borderColor="border-t-4 border-t-amber-400" bgColor="bg-amber-50" textColor="text-amber-700" />
        <StatCard icon={<XCircle size={18} />} label="Failed" value={failedData?.total}
          borderColor="border-t-4 border-t-red-500" bgColor="bg-red-50" textColor="text-red-700" />
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1">
        <DataTable
          title="Generated Reports"
          description={
            hasActiveFilters
              ? 'Filtered report generation jobs for this organisation'
              : 'All report generation jobs for this organisation'
          }
          columns={columns}
          rows={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          loading={isLoading}
          error={error ? String(error) : null}
          onPageChange={setPage}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search by report name…"
          toolbar={toolbar}
          onRefetch={() => void refetch()}
          isAdmin
          onView={undefined}
          extraRowActions={extraRowActions}
          onDelete={(row) => setDeleteTarget(row)}
          footerNote={
            hasActiveFilters && !isLoading && (data?.total ?? 0) === 0
              ? 'No reports match the current filters. Try clearing filters or generate a new report.'
              : undefined
          }
        />
      </div>

      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerate={(input: GenerateReportInput) => {
          generateMutation.mutate(input, {
            onSuccess: () => {
              setGenerateOpen(false);
              setPage(1);
            },
          });
        }}
        isPending={generateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Report"
        description="Delete this report log? This can't be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
