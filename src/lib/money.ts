import { Prisma } from '@prisma/client';

/**
 * Money is handled as integer paise internally and Prisma.Decimal at the
 * database boundary. Floating point never touches a price.
 */
export type Paise = number;

export const DECIMAL_ZERO = new Prisma.Decimal(0);

/** Decimal | string | number → integer paise. */
export function toPaise(value: Prisma.Decimal | string | number): Paise {
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return d.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Integer paise → Decimal(10,2) for persistence. */
export function toDecimal(paise: Paise): Prisma.Decimal {
  return new Prisma.Decimal(Math.round(paise)).div(100).toDecimalPlaces(2);
}

/** Integer paise → rupees as a plain number, for JSON responses only. */
export function toRupees(paise: Paise): number {
  return Math.round(paise) / 100;
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** Format rupees for display. Whole rupees drop the decimals, as on the live store. */
export function formatINR(rupees: number, opts?: { showPaise?: boolean }): string {
  if (opts?.showPaise || rupees % 1 !== 0) return inrWithPaise.format(rupees);
  return inr.format(rupees);
}

export function formatPaise(paise: Paise, opts?: { showPaise?: boolean }): string {
  return formatINR(toRupees(paise), opts);
}

/** Discount percentage, floored — matches how the live store labels "67% OFF". */
export function discountPercent(price: Paise, compareAt?: Paise | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * Distribute a total discount across line subtotals without losing or
 * inventing paise. The remainder is handed to the largest lines first.
 */
export function apportion(total: Paise, weights: Paise[]): Paise[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (w * total) / sum);
  const out = raw.map((r) => Math.floor(r));
  let remainder = total - out.reduce((a, b) => a + b, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    out[order[k].i] += 1;
  }
  return out;
}
