export type DashboardPeriodPreset = 'today' | '7d' | 'month' | 'year' | 'custom';

export interface DashboardPeriodRange {
  preset: DashboardPeriodPreset;
  from: string;
  to: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveDashboardPeriod(
  preset: DashboardPeriodPreset,
  customFrom?: string,
  customTo?: string,
): DashboardPeriodRange {
  const to = endOfToday();

  if (preset === 'custom') {
    const from = customFrom ? new Date(customFrom) : new Date(to.getTime() - 7 * 86400000);
    from.setHours(0, 0, 0, 0);
    const toD = customTo ? new Date(customTo) : to;
    toD.setHours(23, 59, 59, 999);
    return { preset, from: toDateStr(from), to: toDateStr(toD) };
  }

  if (preset === 'today') {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return { preset, from: toDateStr(from), to: toDateStr(to) };
  }

  if (preset === '7d') {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { preset, from: toDateStr(from), to: toDateStr(to) };
  }

  if (preset === 'month') {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { preset, from: toDateStr(from), to: toDateStr(to) };
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return { preset, from: toDateStr(from), to: toDateStr(to) };
}

export function formatPeriodAxisLabel(value: string): string {
  if (!value) return value;
  if (value.includes(' ')) {
    const [date, time] = value.split(' ');
    return `${date.slice(5)} ${time}`;
  }
  if (value.length === 10) return value.slice(5);
  if (value.includes('-') && value.length === 7) {
    const [year, month] = value.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('en', { month: 'short' });
  }
  return value;
}
