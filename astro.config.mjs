// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://simic.systems",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/checkout/") && !page.includes("/api/"),
      serialize(item) {
        return { ...item, lastmod: new Date().toISOString() };
      },
    }),
    react({
      experimentalReactChildren: true,
    }),
  ],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        "react-dom/server": "react-dom/server.edge",
      },
    },
  },
});
