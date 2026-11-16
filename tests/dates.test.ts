import { describe, expect, it } from 'vitest';
import { formatDuration, formatMonth, spanMonths } from '../src/lib/dates';

const NOV_13_2026 = Date.UTC(2026, 10, 13);

describe('spanMonths counts both end months, like LinkedIn', () => {
  it.each([
    ['2023-01', '2023-06', 6, '6mo'], // WSO2 internship
    ['2024-06', '2026-02', 21, '1y 9mo'], // Software Engineer
    ['2020-01', '2024-07', 55, '4y 7mo'], // University of Moratuwa
    ['2025-03', '2025-03', 1, '1mo'],
  ])('%s → %s is %i months', (start, end, months, label) => {
    expect(spanMonths(start, end, NOV_13_2026)).toBe(months);
    expect(formatDuration(months)).toBe(label);
  });

  it('counts the current month for ongoing spans', () => {
    expect(spanMonths('2026-02', null, NOV_13_2026)).toBe(10); // Senior Software Engineer
    expect(spanMonths('2025-10', null, NOV_13_2026)).toBe(14);
  });
});

describe('formatting', () => {
  it('shows month and year only', () => {
    expect(formatMonth('2026-10-27')).toBe('Oct 2026');
    expect(formatMonth('2023-01')).toBe('Jan 2023');
  });

  it('formats whole years without months', () => {
    expect(formatDuration(24)).toBe('2y');
    expect(formatDuration(0)).toBe('<1mo');
  });
});
