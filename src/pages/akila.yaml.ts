import type { APIRoute } from 'astro';
import { profile } from '../data/profile';
import { manifest, MANIFEST_HEADER } from '../lib/manifest';
import { linesToText, yamlLines } from '../lib/yaml';

/** GET /akila.yaml: the profile as a Kubernetes-style resource. */
export const GET: APIRoute = () =>
  new Response(linesToText(yamlLines(manifest(profile), MANIFEST_HEADER)), {
    headers: { 'Content-Type': 'application/yaml; charset=utf-8' },
  });
