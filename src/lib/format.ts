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

// ── Plain (non-hook) formatters for English-only admin/obelisk surfaces ───────
// These are fixed to 'en-US' on purpose: admin and obelisk are not localized,
// so the locale-aware hooks above do not apply. Shared here to replace the
// copy-pasted module-scope helpers that used to live in each admin/obelisk page.

/**
 * Plain 'en-US' USD, 2 decimals: "$1,234.56". For English-only admin/obelisk
 * module-scope helpers.
 *
 * Accepts `number | string` and coerces with Number() on purpose: several API
 * money fields (Laravel `decimal:2` casts) serialize as decimal STRINGS despite
 * their `number` TS type (see types.ts — "coerce with Number() at render"), and
 * String.prototype.toLocaleString ignores the options object, which would drop
 * the thousands separators (e.g. "1234.50" -> "$1234.50" instead of "$1,234.50").
 */
export function formatUsd(n: number | string): string {
  return '$' + Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Plain 'en-US' USD rounded to whole dollars: "$1,235". Number()-coerces (see formatUsd). */
export function formatUsdWhole(n: number | string): string {
  return '$' + Math.round(Number(n ?? 0)).toLocaleString('en-US');
}
/** Plain 'en-US' integer with thousands separators: "1,234". Number()-coerces (see formatUsd). */
export function formatCount(n: number | string): string {
  return Number(n ?? 0).toLocaleString('en-US');
}
/** Plain 'en-US' medium date: "May 26, 2026". Null/empty -> "—". */
export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
/** Plain 'en-US' date+time: "May 26, 2026, 03:40 PM". Null/empty -> "—". */
export function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
