import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { FormSelect } from '../../components/FormSelect';
import { Locations } from '../../api';
import type { EReportType, EReportPeriod, GenerateReportInput } from '../../types';
import { REPORT_TYPE_GROUPS } from './constants';

type Period = EReportPeriod;

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (input: GenerateReportInput) => void;
  isPending: boolean;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'DAILY', label: 'Daily' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'YEARLY', label: 'Yearly' },
  { key: 'CUSTOM', label: 'Custom' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [2022, 2023, 2024, 2025, 2026];

function toISO(date: string, endOfDay = false): string {
  return endOfDay ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`;
}

function buildDates(
  period: Period,
  date: string,
  month: number,
  year: number,
  fromDate: string,
  toDate: string,
): { fromDate: string; toDate: string } {
  if (period === 'DAILY') return { fromDate: toISO(date), toDate: toISO(date, true) };
  if (period === 'MONTHLY') {
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, '0');
    const ld = String(lastDay).padStart(2, '0');
    return { fromDate: toISO(`${year}-${mm}-01`), toDate: toISO(`${year}-${mm}-${ld}`, true) };
  }
  if (period === 'YEARLY') return { fromDate: toISO(`${year}-01-01`), toDate: toISO(`${year}-12-31`, true) };
  return { fromDate: toISO(fromDate), toDate: toISO(toDate, true) };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GenerateModal({ open, onClose, onGenerate, isPending }: Props): React.ReactElement | null {
  const [reportType, setReportType] = useState<EReportType | ''>('');
  const [period, setPeriod] = useState<Period>('DAILY');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [locationId, setLocationId] = useState('');
  const { data: locations } = Locations.useList();

  if (!open) return null;

  const handleSubmit = (): void => {
    if (!reportType) return;
    const dates = buildDates(period, date, month, year, fromDate, toDate);
    onGenerate({ reportType, reportPeriod: period, ...dates, locationId: locationId || undefined });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-[480px] flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-foreground">Generate Report</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Choose the report type and time period</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Report Type */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              Report Type{' '}
              <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Required</span>
            </label>
            <FormSelect
              value={reportType}
              onChange={(v) => setReportType(v as EReportType | '')}
              placeholder="— Select report type —"
              options={REPORT_TYPE_GROUPS.flatMap((grp) =>
                grp.options.map((o) => ({
                  value: o.value,
                  label: `${grp.label}: ${o.label}`,
                })),
              )}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Select a report to see what data it includes</p>
          </div>

          {/* Period */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              Report Period{' '}
              <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Required</span>
            </label>
            <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-input">
              {PERIODS.map((pt) => (
                <button
                  key={pt.key}
                  type="button"
                  onClick={() => setPeriod(pt.key)}
                  className={cn(
                    'border-r py-2 text-xs font-semibold transition-colors last:border-r-0 border-input',
                    period === pt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Adaptive date inputs */}
            {period === 'DAILY' && (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
            {period === 'MONTHLY' && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Month</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {MONTHS.map((mn, idx) => <option key={mn} value={idx + 1}>{mn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Year</label>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {YEARS.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                </div>
              </div>
            )}
            {period === 'YEARLY' && (
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {YEARS.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            )}
            {period === 'CUSTOM' && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              Location{' '}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">(optional — blank = all locations)</span>
            </label>
            <FormSelect
              value={locationId}
              onChange={setLocationId}
              placeholder="All Locations"
              options={[
                { value: '', label: 'All Locations' },
                ...(locations ?? []).map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!reportType || isPending} onClick={handleSubmit}>
            {isPending ? 'Generating…' : 'Generate Report →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
