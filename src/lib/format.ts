'use client';

import { useFormatter } from 'next-intl';

/**
 * Locale-aware USD money formatter.
 *
 * Currency stays USD across every locale — only the DISPLAY format localizes
 * (e.g. "$1,234.56" in en-US, "1234,56 US$" in es-ES). Keep the
 * `font-mono tabular-nums` wrapper at the call site; this returns the string,
 * styling is a sibling concern. Replaces the hand-rolled
 * `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` pattern.
 */
export function useMoney() {
  const format = useFormatter();
  return (amount: number) =>
    format.number(amount, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

/**
 * Locale-aware date formatters mirroring the design spec's two forms:
 *   short — "May 26, 2026" (medium date)
 *   full  — "May 26, 2026 at 3:40 PM" (long date + short time, for tooltips)
 */
export function useDateFormats() {
  const format = useFormatter();
  return {
    short: (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' }),
    full: (iso: string) =>
      format.dateTime(new Date(iso), { dateStyle: 'long', timeStyle: 'short' }),
  };
}
