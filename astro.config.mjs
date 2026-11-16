// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://akila.dev',
  output: 'static',
  devToolbar: { enabled: false },
  build: {
    // Inline the CSS (about 6 KB compressed) so the first paint does not wait for
    // extra stylesheet requests, and the @font-face rules arrive with the HTML.
    inlineStylesheets: 'always',
  },
});
