import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { profile } from '../src/data/profile';
import { manifest, MANIFEST_HEADER } from '../src/lib/manifest';
import { Commented, Flow, Folded, Slot, lineToHtml, linesToText, needsQuotes, toPlain, yamlLines } from '../src/lib/yaml';

const text = (doc: Parameters<typeof yamlLines>[0]) => linesToText(yamlLines(doc));

describe('manifest YAML', () => {
  const yaml = linesToText(yamlLines(manifest(profile), MANIFEST_HEADER));

  it('parses back to exactly the data it was built from', () => {
    expect(parse(yaml)).toEqual(toPlain(manifest(profile)));
  });

  it('is a Kubernetes-style resource', () => {
    const doc = parse(yaml);
    expect(doc.apiVersion).toBe('people.akila.dev/v1');
    expect(doc.kind).toBe('Engineer');
    expect(doc.metadata.name).toBe('akila-induranga');
    expect(doc.spec.career).toHaveLength(profile.career.length);
  });

  it('marks ongoing spans with a null end and a comment', () => {
    expect(yaml).toMatch(/end: null # ongoing/);
  });

  it('starts with the header comments and has no trailing spaces', () => {
    expect(yaml.startsWith('# GET https://akila.dev/akila.yaml\n')).toBe(true);
    expect(yaml.split('\n').some((l) => / $/.test(l))).toBe(false);
  });

  it('only renders the live clock slot to HTML', () => {
    const lines = yamlLines(manifest(profile, { liveClock: true }));
    expect(() => linesToText(lines)).toThrow(/Slot/);
    expect(lines.map(lineToHtml).join('\n')).toContain('<span class="y-str" data-clock></span>');
  });
});

describe('emitter', () => {
  it('quotes strings YAML would read as something else', () => {
    for (const s of ['true', 'no', 'null', '~', '42', '3.14', '1e3', '14:32', '2026-10-27', '', ' padded', '#tag', '- item', 'a: b', 'x #y', 'ends:']) {
      expect(needsQuotes(s), s).toBe(true);
    }
    for (const s of ['2026-10', 'Asia/Colombo', 'https://akila.dev/akila.yaml', 'CSE ’19', 'focus.akila.dev/cilium']) {
      expect(needsQuotes(s), s).toBe(false);
    }
  });

  it('round-trips awkward scalars', () => {
    const doc = { a: 'true', b: '14:32', c: 'GSoC 2023: A Tale', d: 'say "hi" \\ bye', e: 7, f: false, g: null, h: [] as string[], i: {} };
    expect(parse(text(doc))).toEqual(doc);
  });

  it('writes flow sequences, folded strings and comments', () => {
    const long = 'word '.repeat(40).trim();
    const doc = { list: new Flow(['a', 'b, c', 'd']), note: new Folded(long, 20), x: new Commented('val', 'why') };
    const out = text(doc);
    expect(out).toContain('list: [a, "b, c", d]');
    expect(out).toContain('note: >-');
    expect(out).toContain('x: val # why');
    expect(out.split('\n').every((l) => l.length <= 26)).toBe(true);
    expect(parse(out)).toEqual({ list: ['a', 'b, c', 'd'], note: long, x: 'val' });
  });

  it('puts sequence items at the same indent as their key', () => {
    expect(text({ roles: [{ title: 'T', org: 'O' }] })).toBe('roles:\n- title: T\n  org: O\n');
  });

  it('escapes HTML in highlighted output', () => {
    const [line] = yamlLines({ k: '<script>' });
    expect(lineToHtml(line!)).toBe('<span class="y-key">k</span><span class="y-pun">:</span> <span class="y-str">&lt;script&gt;</span>');
  });

  it('refuses a slot in plain output', () => {
    expect(() => toPlain(new Slot('data-x'))).toThrow();
  });
});
