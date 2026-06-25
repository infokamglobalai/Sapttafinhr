import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value): Decimal => new Decimal(v ?? 0);

// The currency that formatINR() renders in. Driven by the active company's base
// currency (see setDisplayCurrency, wired in AppShell) so a GCC tenant whose
// books are in AED/SAR doesn't see ₹ and Indian lakh/crore grouping everywhere.
let _displayCurrency = 'INR';

/** Set the base currency used by formatINR() for the active company. */
export function setDisplayCurrency(currency?: string | null): void {
  _displayCurrency = currency || 'INR';
}

/** The active company's base currency code — for labels like "Amount (AED)". */
export function getDisplayCurrency(): string {
  return _displayCurrency;
}

/** Currency symbol for the active (or given) currency — e.g. ₹, $, AED. For compact chart ticks. */
export function currencySymbol(currency = _displayCurrency): string {
  try {
    const parts = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency', currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * Format an amount in the active company's base currency. Named formatINR for
 * historical reasons (most of the app is India-first), but it honors whatever
 * base currency the active company uses.
 */
export function formatINR(value: Decimal.Value): string {
  return formatMoney(value, _displayCurrency);
}

/** Format an amount in any ISO currency (INR, AED, SAR, …) for the active jurisdiction. */
export function formatMoney(value: Decimal.Value, currency = 'INR'): string {
  const d = D(value);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(d.toFixed(2)));
  } catch {
    // Unknown currency code — fall back to a plain number with the code.
    return `${currency} ${d.toFixed(2)}`;
  }
}

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), D(0));
}
