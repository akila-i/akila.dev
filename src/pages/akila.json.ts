import type { APIRoute } from 'astro';
import { profile } from '../data/profile';
import { manifest } from '../lib/manifest';
import { toPlain } from '../lib/yaml';

/** GET /akila.json: the same resource as /akila.yaml, as JSON. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(toPlain(manifest(profile)), null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
