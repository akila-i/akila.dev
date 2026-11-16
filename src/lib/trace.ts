import type { Span } from '../data/profile';
import { monthStart, nextMonthStart, spanMonths } from './dates';

export interface TraceRow {
  span: Span;
  /** Bar position and width as percentages of the track. */
  left: number;
  width: number;
  months: number;
  ongoing: boolean;
}

export interface TraceTick {
  year: number;
  left: number;
}

/** Room after "now" so ongoing bars do not touch the right edge (and their pulse marker shows). */
const RIGHT_PAD_MS = 75 * 864e5;
/** Very short spans still get a visible bar. */
const MIN_WIDTH = 0.6;

/** Lays career spans on one time axis, from the earliest start to now. */
export function layoutTrace(spans: readonly Span[], now: number): { rows: TraceRow[]; ticks: TraceTick[] } {
  if (!spans.length) return { rows: [], ticks: [] };
  const t0 = Math.min(...spans.map((s) => monthStart(s.start)));
  const t1 = now + RIGHT_PAD_MS;
  const pos = (ms: number) => ((ms - t0) / (t1 - t0)) * 100;

  const rows = spans.map((span) => {
    const a = monthStart(span.start);
    // End months are inclusive, so a closed bar runs to the start of the following month.
    const b = span.end ? nextMonthStart(monthStart(span.end)) : now;
    return {
      span,
      left: pos(a),
      width: Math.max(MIN_WIDTH, pos(b) - pos(a)),
      months: spanMonths(span.start, span.end, now),
      ongoing: span.end === null,
    };
  });

  const ticks: TraceTick[] = [];
  const first = new Date(t0).getUTCFullYear() + 1;
  const last = new Date(now).getUTCFullYear();
  for (let year = first; year <= last; year++) ticks.push({ year, left: pos(Date.UTC(year, 0, 1)) });

  return { rows, ticks };
}
