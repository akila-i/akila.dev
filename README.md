# akila.dev

One profile, rendered for people and for kubectl.

`src/data/profile.ts` is the single source of truth. Everything else is a rendering of it:

| Output | Source |
|---|---|
| `/` human view (`kubectl describe` layout, expandable career trace) | `src/pages/index.astro`, `src/components/*` |
| `/` yaml view, `/akila.yaml` | `src/lib/manifest.ts` → `src/lib/yaml.ts` |
| `/akila.json` | same manifest, as JSON |
| `curl akila.dev` card (preview on the page; the Worker comes later) | `src/lib/card.ts` |

## Develop

Requires Node 22.23+ (see `.nvmrc`).

```sh
nvm use
npm install
npm run dev       # http://localhost:4321
npm run verify    # astro check + vitest + build
```

## Notes

- Light ("Ceylon") is the default theme. Dark ("Cobalt") applies only when chosen, and the choice is remembered.
- Without JavaScript the page still renders in full: every trace span is open and the bar links to `/akila.yaml`.
- Career dates are inclusive months (Jan–Jun is 6 months), matching LinkedIn.
