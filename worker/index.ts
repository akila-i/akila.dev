/**
 * The edge Worker in front of the static build.
 *
 * - www.akila.dev redirects to akila.dev
 * - `curl akila.dev` gets the terminal card instead of HTML
 * - /akila.yaml and /akila.json include the current local time
 *
 * Everything else is served from the static assets. All output comes from the
 * same profile and renderers the site is built from.
 */
import { profile } from '../src/data/profile';
import { cardLines, cardToAnsi } from '../src/lib/card';
import { formatClock } from '../src/lib/dates';
import { manifest, MANIFEST_HEADER } from '../src/lib/manifest';
import { linesToText, toPlain, yamlLines } from '../src/lib/yaml';
import { wantsTerminal } from './negotiate';

const APEX = 'akila.dev';
const CARD = cardToAnsi(cardLines(profile));
const API_HEADERS = { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' };

function text(body: string, type: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    headers: { 'content-type': `${type}; charset=utf-8`, 'x-content-type-options': 'nosniff', ...headers },
  });
}

const liveManifest = () => manifest(profile, { localTime: formatClock(profile.location.timeZone) });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === `www.${APEX}`) {
      url.protocol = 'https:';
      url.hostname = APEX;
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      switch (url.pathname) {
        case '/': {
          const vary = { vary: 'User-Agent, Accept' };
          if (wantsTerminal(request.headers)) return text(CARD, 'text/plain', { ...vary, 'cache-control': 'no-cache' });
          const page = await env.ASSETS.fetch(request);
          const res = new Response(page.body, page);
          res.headers.append('vary', vary.vary);
          return res;
        }
        case '/akila.yaml':
          return text(linesToText(yamlLines(liveManifest(), MANIFEST_HEADER)), 'application/yaml', API_HEADERS);
        case '/akila.json':
          return text(JSON.stringify(toPlain(liveManifest()), null, 2) + '\n', 'application/json', API_HEADERS);
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
