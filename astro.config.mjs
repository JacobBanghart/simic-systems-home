// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react"

// https://astro.build/config
export default defineConfig({
  site: "https://simic.systems",
  trailingSlash: "ignore",
  integrations: [sitemap({
    filter: (page) =>
      !page.includes('/checkout/') &&
      !page.includes('/api/'),
  }), react({
    experimentalReactChildren: true
  })],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      // @ts-ignore
      alias: import.meta.env.PROD && {
        "react-dom/server": "react-dom/server.edge",
      },
    },
  },
});
