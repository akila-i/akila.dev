const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function parts(date: string): [number, number] {
  const [y, m] = date.split('-').map(Number);
  if (!y || !m) throw new Error(`expected YYYY-MM or YYYY-MM-DD, got "${date}"`);
  return [y, m];
}

/** Midnight UTC on the first day of the month in a "YYYY-MM" or "YYYY-MM-DD" string. */
export function monthStart(date: string): number {
  const [y, m] = parts(date);
  return Date.UTC(y, m - 1, 1);
}

/** Midnight UTC on the first day of the month after `ms`. */
export function nextMonthStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** "2026-10-27" or "2026-10" → "Oct 2026" */
export function formatMonth(date: string): string {
  const [y, m] = parts(date);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Whole calendar months from a to b, ignoring days. */
export function monthsBetween(a: number, b: number): number {
  const A = new Date(a);
  const B = new Date(b);
  return Math.max(0, (B.getUTCFullYear() - A.getUTCFullYear()) * 12 + B.getUTCMonth() - A.getUTCMonth());
}

/**
 * Length of a span in months, counting both the first and the last month,
 * the way LinkedIn does: Jan–Jun is 6 months. An ongoing span counts the current month.
 */
export function spanMonths(start: string, end: string | null, now: number): number {
  return monthsBetween(monthStart(start), end ? monthStart(end) : now) + 1;
}

/** 21 → "1y 9mo" */
export function formatDuration(months: number): string {
  if (months < 1) return '<1mo';
  const y = Math.floor(months / 12);
  const r = months % 12;
  if (!y) return `${r}mo`;
  return r ? `${y}y ${r}mo` : `${y}y`;
}
