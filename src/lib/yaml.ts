/**
 * A small YAML emitter for the profile manifest.
 *
 * It writes the subset of YAML the manifest needs (block maps, block sequences,
 * flow sequences of scalars, folded strings and trailing comments) as a list of
 * typed tokens. The same tokens become plain text for /akila.yaml and
 * highlighted HTML for the page, so the two can never drift apart.
 */
import { escapeHtml } from './html';

export type Scalar = string | number | boolean | null;
export type YamlNode = Scalar | Flow | Folded | Commented | Slot | YamlNode[] | { [key: string]: YamlNode };

/** A one-line sequence of scalars: `[a, b, c]`. */
export class Flow {
  constructor(readonly items: readonly Scalar[]) {}
}

/** A long string written as a folded block (`>-`), wrapped at `width` characters. */
export class Folded {
  constructor(
    readonly text: string,
    readonly width = 62,
  ) {}
}

/** A value with a trailing `# comment`. */
export class Commented {
  constructor(
    readonly value: YamlNode,
    readonly comment: string,
  ) {}
}

/** An empty value the browser fills in, such as the live clock. HTML output only. */
export class Slot {
  constructor(readonly attr: `data-${string}`) {}
}

export type TokenKind = 'key' | 'str' | 'num' | 'com' | 'pun' | 'text';
export interface Token {
  kind: TokenKind;
  text: string;
  attr?: string;
}
export type Line = Token[];

/* ---------------------------------------------------------------------------- */

const RESERVED = /^(true|false|yes|no|on|off|y|n|null|~)$/i;
const NUMBER_LIKE = /^[-+]?(\.inf|\.nan|\d[\d_]*(\.\d*)?([eE][-+]?\d+)?|\.\d+|0x[\da-f]+|0o[0-7]+)$/i;
const SEXAGESIMAL = /^[-+]?\d+(:[0-5]?\d)+(\.\d*)?$/; // YAML 1.1 reads 14:32 as a number
const TIMESTAMP = /^\d{4}-\d\d?-\d\d?([Tt ]|$)/;

/** True when a string would not survive as a plain (unquoted) YAML scalar. */
export function needsQuotes(s: string, inFlow = false): boolean {
  return (
    s === '' ||
    /^\s|\s$/.test(s) ||
    /[\u0000-\u001f\u007f]/.test(s) ||
    /: |\s#|:$/.test(s) ||
    /^[[\]{},&*!|>'"%@`#?:-]/.test(s) ||
    RESERVED.test(s) ||
    NUMBER_LIKE.test(s) ||
    SEXAGESIMAL.test(s) ||
    TIMESTAMP.test(s) ||
    (inFlow && /[,[\]{}]/.test(s))
  );
}

const indent = (n: number): Token => ({ kind: 'text', text: ' '.repeat(n) });
const pun = (text: string): Token => ({ kind: 'pun', text });
const SPACE: Token = { kind: 'text', text: ' ' };

function scalar(v: Scalar, inFlow = false): Token {
  if (v === null) return { kind: 'num', text: 'null' };
  if (typeof v === 'number' || typeof v === 'boolean') return { kind: 'num', text: String(v) };
  return { kind: 'str', text: needsQuotes(v, inFlow) ? JSON.stringify(v) : v };
}

function flow(items: readonly Scalar[]): Token[] {
  const out: Token[] = [pun('[')];
  items.forEach((item, i) => {
    if (i) out.push(pun(', '));
    out.push(scalar(item, true));
  });
  out.push(pun(']'));
  return out;
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const isMap = (v: YamlNode): v is { [key: string]: YamlNode } =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Flow) && !(v instanceof Folded) && !(v instanceof Commented) && !(v instanceof Slot);

function emitMap(map: { [key: string]: YamlNode }, depth: number, out: Line[]): void {
  for (const [key, raw] of Object.entries(map)) {
    let value = raw;
    let comment: Token[] = [];
    if (value instanceof Commented) {
      comment = [SPACE, { kind: 'com', text: `# ${value.comment}` }];
      value = value.value;
    }
    const head: Line = [indent(depth), { kind: 'key', text: needsQuotes(key) ? JSON.stringify(key) : key }, pun(':')];

    if (value instanceof Flow) {
      out.push([...head, SPACE, ...flow(value.items), ...comment]);
    } else if (value instanceof Folded) {
      out.push([...head, SPACE, pun('>-'), ...comment]);
      for (const l of wrap(value.text, value.width)) out.push([indent(depth + 2), { kind: 'str', text: l }]);
    } else if (value instanceof Slot) {
      out.push([...head, SPACE, { kind: 'str', text: '', attr: value.attr }, ...comment]);
    } else if (value instanceof Commented) {
      throw new Error(`nested comments are not supported (key "${key}")`);
    } else if (Array.isArray(value)) {
      if (!value.length) out.push([...head, SPACE, pun('[]'), ...comment]);
      else {
        out.push([...head, ...comment]);
        // Kubernetes style: sequence items sit at the same indent as their key.
        for (const item of value) emitItem(item, depth, out);
      }
    } else if (isMap(value)) {
      if (!Object.keys(value).length) out.push([...head, SPACE, pun('{}'), ...comment]);
      else {
        out.push([...head, ...comment]);
        emitMap(value, depth + 2, out);
      }
    } else {
      out.push([...head, SPACE, scalar(value), ...comment]);
    }
  }
}

function emitItem(item: YamlNode, depth: number, out: Line[]): void {
  const dash = pun('- ');
  if (isMap(item) && Object.keys(item).length) {
    const sub: Line[] = [];
    emitMap(item, depth + 2, sub);
    const [first, ...rest] = sub;
    out.push([indent(depth), dash, ...first!.slice(1)], ...rest);
  } else if (item instanceof Flow) {
    out.push([indent(depth), dash, ...flow(item.items)]);
  } else if (item instanceof Commented && !isMap(item.value) && !Array.isArray(item.value)) {
    out.push([indent(depth), dash, scalar(item.value as Scalar), SPACE, { kind: 'com', text: `# ${item.comment}` }]);
  } else if (item === null || ['string', 'number', 'boolean'].includes(typeof item)) {
    out.push([indent(depth), dash, scalar(item as Scalar)]);
  } else {
    throw new Error('unsupported sequence item');
  }
}

/* ---------------------------------------------------------------------------- */

/** The document as typed tokens, one array per line. */
export function yamlLines(doc: { [key: string]: YamlNode }, header: readonly string[] = []): Line[] {
  const out: Line[] = header.map((h) => [{ kind: 'com', text: `# ${h}` }]);
  emitMap(doc, 0, out);
  return out;
}

/** Plain YAML text, e.g. for /akila.yaml. */
export function linesToText(lines: readonly Line[]): string {
  return (
    lines
      .map((line) =>
        line
          .map((t) => {
            if (t.attr) throw new Error('a Slot can only be rendered to HTML');
            return t.text;
          })
          .join('')
          .trimEnd(),
      )
      .join('\n') + '\n'
  );
}

/** One line of highlighted HTML. Token classes are y-key, y-str, y-num, y-com and y-pun. */
export function lineToHtml(line: Line): string {
  return line
    .map((t) => (t.kind === 'text' ? escapeHtml(t.text) : `<span class="y-${t.kind}"${t.attr ? ` ${t.attr}` : ''}>${escapeHtml(t.text)}</span>`))
    .join('');
}

/** The same document without YAML presentation details, e.g. for /akila.json. */
export function toPlain(node: YamlNode): unknown {
  if (node instanceof Flow) return [...node.items];
  if (node instanceof Folded) return node.text;
  if (node instanceof Commented) return toPlain(node.value);
  if (node instanceof Slot) throw new Error('a Slot has no plain value');
  if (Array.isArray(node)) return node.map(toPlain);
  if (isMap(node)) return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, toPlain(v)]));
  return node;
}
