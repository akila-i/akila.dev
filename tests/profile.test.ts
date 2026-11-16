import { describe, expect, it } from 'vitest';
import { profile, ProfileSchema } from '../src/data/profile';
import { layoutTrace } from '../src/lib/trace';

describe('profile', () => {
  it('passes its own schema', () => {
    expect(() => ProfileSchema.parse(profile)).not.toThrow();
  });

  it('rejects a span that ends before it starts', () => {
    const career = profile.career.map((s, i) => (i === 0 ? { ...s, start: '2025-01', end: '2024-01' } : s));
    expect(ProfileSchema.safeParse({ ...profile, career }).success).toBe(false);
  });

  it('rejects an openSpan that does not exist', () => {
    expect(ProfileSchema.safeParse({ ...profile, openSpan: 'nope' }).success).toBe(false);
  });

  it('only links over https', () => {
    const hrefs = [
      ...profile.writing.map((w) => w.href),
      ...profile.ingress.map((i) => i.href),
      ...profile.career.flatMap((s) => s.highlights.flatMap((h) => h.links.map((l) => l.href))),
    ];
    expect(hrefs.every((h) => h.startsWith('https://'))).toBe(true);
  });

  it('shows no email address anywhere until one can receive mail', () => {
    expect(JSON.stringify(profile)).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
  });
});

describe('trace layout', () => {
  const now = Date.UTC(2026, 10, 13);
  const { rows, ticks } = layoutTrace(profile.career, now);

  it('keeps every bar inside the track', () => {
    for (const r of rows) {
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width).toBeLessThanOrEqual(100);
      expect(r.width).toBeGreaterThan(0);
    }
  });

  it('starts the earliest span at the left edge', () => {
    expect(Math.min(...rows.map((r) => r.left))).toBe(0);
  });

  it('labels each year after the first, up to now', () => {
    expect(ticks.map((t) => t.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(ticks.every((t) => t.left > 0 && t.left < 100)).toBe(true);
  });
});
