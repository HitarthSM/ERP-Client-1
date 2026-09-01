import { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  type DashboardPeriodPreset,
  resolveDashboardPeriod,
  type DashboardPeriodRange,
} from '../../lib/dashboard-period';

const PRESETS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
];

interface DashboardPeriodFilterProps {
  value: DashboardPeriodRange;
  onChange: (range: DashboardPeriodRange) => void;
}

export default function DashboardPeriodFilter({ value, onChange }: DashboardPeriodFilterProps) {
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  const select = (preset: DashboardPeriodPreset) => {
    if (preset === 'custom') {
      onChange(resolveDashboardPeriod('custom', customFrom, customTo));
      return;
    }
    onChange(resolveDashboardPeriod(preset));
  };

  const applyCustom = () => {
    onChange(resolveDashboardPeriod('custom', customFrom, customTo));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => select(id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              value.preset === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export { resolveDashboardPeriod };
export type { DashboardPeriodRange, DashboardPeriodPreset };
