import { parse } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { profile } from '../src/data/profile';
import { manifest } from '../src/lib/manifest';
import { toPlain } from '../src/lib/yaml';
import worker from './index';
import { wantsTerminal } from './negotiate';

const assets = vi.fn(async (req: Request) => new Response(`asset ${new URL(req.url).pathname}`, { headers: { 'content-type': 'text/html' } }));
const env = { ASSETS: { fetch: assets } } as unknown as Env;
const get = (url: string, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(url, { headers }) as Request<unknown, IncomingRequestCfProperties>, env);

const CURL = { 'user-agent': 'curl/8.7.1', accept: '*/*' };
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Macintosh) Safari/605.1.15', accept: 'text/html,application/xhtml+xml' };

describe('content negotiation', () => {
  it.each([
    ['curl/8.7.1', '*/*', true],
    ['Wget/1.21.4', '*/*', true],
    ['HTTPie/3.2.2', 'application/json, */*;q=0.5', true],
    ['xh/0.22.0', '*/*', true],
    ['Mozilla/5.0 (Windows NT 10.0) WindowsPowerShell/5.1.22621', '', true],
    ['curl/8.7.1', 'text/html', false],
    ['Mozilla/5.0 (Macintosh) Chrome/131.0', 'text/html', false],
    ['Go-http-client/2.0', '*/*', false],
  ])('%s with Accept "%s" → terminal %s', (ua, accept, expected) => {
    expect(wantsTerminal(new Headers({ 'user-agent': ua, accept }))).toBe(expected);
  });
});

describe('worker', () => {
  it('answers curl with the ANSI card', async () => {
    const res = await get('https://akila.dev/', CURL);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('vary')).toBe('User-Agent, Accept');
    const body = await res.text();
    expect(body).toContain('akila induranga');
    expect(body).toContain('\x1b[');
  });

  it('serves the HTML page to browsers, marked as varying by client', async () => {
    const res = await get('https://akila.dev/', BROWSER);
    expect(await res.text()).toBe('asset /');
    expect(res.headers.get('vary')).toContain('User-Agent');
  });

  it('redirects www to the apex and keeps the path and query', async () => {
    const res = await get('https://www.akila.dev/akila.yaml?x=1', BROWSER);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://akila.dev/akila.yaml?x=1');
  });

  it('serves /akila.yaml with the live local time', async () => {
    const res = await get('https://akila.dev/akila.yaml', CURL);
    expect(res.headers.get('content-type')).toBe('application/yaml; charset=utf-8');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const doc = parse(await res.text());
    expect(doc.status.localTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    const { localTime: _, ...status } = doc.status;
    expect({ ...doc, status }).toEqual(toPlain(manifest(profile)));
  });

  it('serves /akila.json as the same resource', async () => {
    const res = await get('https://akila.dev/akila.json', CURL);
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    const doc = (await res.json()) as { kind: string; status: { localTime: string } };
    expect(doc.kind).toBe('Engineer');
    expect(doc.status.localTime).toMatch(/^\d\d:\d\d$/);
  });

  it('passes everything else to the static assets', async () => {
    const res = await get('https://akila.dev/favicon.svg', CURL);
    expect(await res.text()).toBe('asset /favicon.svg');
  });
});
