import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value): Decimal => new Decimal(v ?? 0);

export function formatINR(value: Decimal.Value): string {
  const d = D(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(d.toFixed(2)));
}

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), D(0));
}
