/**
 * The profile as a Kubernetes-style resource: `kind: Engineer`.
 * Rendered as YAML on the page and at /akila.yaml, and as JSON at /akila.json.
 */
import { KIND_LABEL, type Profile } from '../data/profile';
import { Commented, Flow, Folded, Slot, type YamlNode } from './yaml';

export const API_VERSION = 'people.akila.dev/v1';
export const KIND = 'Engineer';

export const MANIFEST_HEADER = [
  'GET https://akila.dev/akila.yaml',
  'The same resource the human view renders, generated at build time.',
] as const;

export interface ManifestOptions {
  /** Adds status.localTime as a slot the browser keeps current. Page only. */
  liveClock?: boolean;
}

export function manifest(p: Profile, opts: ManifestOptions = {}): { [key: string]: YamlNode } {
  const status: { [key: string]: YamlNode } = {
    conditions: [{ type: p.condition.type, status: p.condition.status, reason: p.condition.reason, message: p.condition.message }],
  };
  if (opts.liveClock) status.localTime = new Commented(new Slot('data-clock'), `UTC${p.location.utcOffset}`);

  return {
    apiVersion: API_VERSION,
    kind: KIND,
    metadata: {
      name: p.slug,
      namespace: `${p.location.city}-${p.location.countryCode}`.toLowerCase(),
      labels: Object.fromEntries(p.labels.map((l) => [`focus.akila.dev/${l}`, 'true'])),
      annotations: {
        'github.com/user': p.handles.github,
        'linkedin.com/in': p.handles.linkedin,
        'medium.com/user': p.handles.medium,
      },
    },
    spec: {
      displayName: p.name,
      summary: new Folded(p.summary),
      roles: p.roles.map((r) => ({
        title: r.title,
        org: r.org,
        ...(r.note ? { project: new Commented(r.note, 'cncf.io') } : {}),
      })),
      location: { city: p.location.city, country: p.location.country, timeZone: p.location.timeZone },
      focus: p.focus.map((f) => ({ name: f.name, stack: new Flow(f.stack) })),
      career: p.career.map((s) => ({
        span: s.name,
        kind: KIND_LABEL[s.kind],
        start: s.start,
        end: s.end ?? new Commented(null, 'ongoing'),
      })),
      writing: p.writing.map((w) => ({ title: w.title, venue: w.venue, published: w.date.slice(0, 7), url: w.href })),
      ingress: [{ from: new Commented('anyone', 'no auth required'), to: new Flow(p.ingress.map((i) => i.to)) }],
    },
    status,
  };
}
