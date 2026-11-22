/*
 * Number and date helpers for charts. Kept out of the 'use client' chart
 * module: a Server Component may call these, and a function exported from
 * a client module is only a reference on the server, not callable.
 */

const fullNumber = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('uk-UA', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

/** Axis ticks: in full under 10 000, compact above. */
export function axisNumber(value: number): string {
  return value < 10_000 ? fullNumber.format(value) : compactNumber.format(value);
}

/** A "YYYY-MM-DD" day key read as a calendar date (no time zone shift). */
function day(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

export const formatShortDay = (key: string) => shortDate.format(day(key));
export const formatLongDay = (key: string) => longDate.format(day(key));

/**
 * Rounds the top of a scale up to a clean number whose half is clean too
 * (the middle tick): an even number up to 10, then 1, 2, 3, 4, 5, 6 or 8 × 10ⁿ.
 */
export function niceMax(value: number): number {
  if (value <= 0) return 2;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 3, 4, 5, 6, 8, 10].find((m) => m * power >= value)!;
  return step * power;
}
