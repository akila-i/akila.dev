/**
 * The `curl akila.dev` card. One description, two outputs: ANSI for terminals
 * (served by the Worker in a later phase) and HTML for the preview on the page.
 */
import type { Profile } from '../data/profile';
import { escapeHtml } from './html';

export type Tone = 'dim' | 'acc' | 'ok';
export interface Segment {
  text: string;
  tone?: Tone;
}
export type CardLine = Segment[];

export function cardLines(p: Profile): CardLine[] {
  const links = [...p.ingress.map((i) => ({ label: i.via, value: i.to })), { label: 'yaml', value: 'curl akila.dev/akila.yaml' }];
  const width = Math.max(...links.map((l) => l.label.length));
  const lower = (s: string) => s.toLowerCase();

  return [
    [],
    [{ text: '  ' }, { text: lower(p.name), tone: 'acc' }],
    [{ text: '  ' + p.roles.map((r) => lower(`${r.title}, ${r.org}`)).join(' · ') }],
    [{ text: '  ' + p.focus.map((f) => f.name.replace(/-/g, ' ')).join(' · ') }],
    [],
    ...links.map((l): CardLine => [{ text: '  ' }, { text: l.label.padEnd(width), tone: 'dim' }, { text: '  ' + l.value }]),
    [],
    [{ text: '  ' }, { text: '●', tone: p.condition.status === 'True' ? 'ok' : 'dim' }, { text: ` ${p.condition.type} · ${p.condition.reason}` }],
  ];
}

const ANSI: Record<Tone, string> = { dim: '\x1b[2m', acc: '\x1b[1;33m', ok: '\x1b[32m' };
const RESET = '\x1b[0m';

export function cardToAnsi(lines: readonly CardLine[]): string {
  return lines.map((l) => l.map((s) => (s.tone ? `${ANSI[s.tone]}${s.text}${RESET}` : s.text)).join('')).join('\n') + '\n\n';
}

export function cardToHtml(lines: readonly CardLine[]): string {
  return lines.map((l) => l.map((s) => (s.tone ? `<span class="t-${s.tone}">${escapeHtml(s.text)}</span>` : escapeHtml(s.text))).join('')).join('\n');
}
