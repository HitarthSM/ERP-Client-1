const COUNTRY_CURRENCY: Record<string, string> = {
  ke: 'KES',
  kenya: 'KES',
  in: 'INR',
  india: 'INR',
  us: 'USD',
  usa: 'USD',
};

export function resolveCurrencyCode(country?: string | null, fallback = 'KES'): string {
  if (!country) return fallback;
  const key = country.trim().toLowerCase();
  return COUNTRY_CURRENCY[key] ?? fallback;
}

export function formatMoney(amount: number, currencyCode = 'KES'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(0)}`;
  }
}

export function formatMoneyCompact(amount: number, currencyCode = 'KES'): string {
  if (amount >= 1_000_000) return formatMoney(amount / 1_000_000, currencyCode).replace(/[\d,.]+/, (m) => `${m}M`);
  if (amount >= 1_000) return formatMoney(amount / 1_000, currencyCode).replace(/[\d,.]+/, (m) => `${m}K`);
  return formatMoney(amount, currencyCode);
}
