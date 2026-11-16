# akila.dev

One profile, rendered for people and for kubectl.

`src/data/profile.ts` is the single source of truth. Everything else is a rendering of it:

| Output | Source |
|---|---|
| `/` human view (`kubectl describe` layout, expandable career trace) | `src/pages/index.astro`, `src/components/*` |
| `/` yaml view, `/akila.yaml` | `src/lib/manifest.ts` → `src/lib/yaml.ts` |
| `/akila.json` | same manifest, as JSON |
| `curl akila.dev` card (and its preview on the page) | `src/lib/card.ts` |

## Develop

Requires Node 22.23+ (see `.nvmrc`).

```sh
nvm use
npm install
npm run dev       # http://localhost:4321
npm run preview   # build, then run the site behind the edge Worker: http://localhost:8787
npm run verify    # typecheck + tests + build
```

## Edge Worker

`worker/index.ts` runs in front of the static build on Cloudflare Workers:

- `curl akila.dev` (also wget, HTTPie, xh and PowerShell) gets the ANSI card instead of HTML
- `/akila.yaml` and `/akila.json` include the current local time and allow cross-origin reads
- `www.akila.dev` redirects to `https://akila.dev`
- everything else is served from `dist/`, with headers from `public/_headers`

It imports the same profile and renderers as the site, so there is no second copy of any content.

## Notes

- Light ("Ceylon") is the default theme. Dark ("Cobalt") applies only when chosen, and the choice is remembered.
- Without JavaScript the page still renders in full: every trace span is open and the bar links to `/akila.yaml`.
- Career dates are inclusive months (Jan–Jun is 6 months), matching LinkedIn.
