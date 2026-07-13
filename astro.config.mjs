// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://simic.systems",
  trailingSlash: "always",
  image: {
    // Lets astro:assets (getImage/<Image>) optimize product photos that live
    // on Stripe's file CDN instead of shipping the raw, full-resolution JPEG.
    remotePatterns: [{ protocol: "https", hostname: "files.stripe.com" }],
  },
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
  adapter: cloudflare(),
  vite: {
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        "react-dom/server": "react-dom/server.edge",
      },
    },
    plugins: [
      tailwindcss(),
      {
        name: "fix-workerd-component-url",
        configureServer(server) {
          server.middlewares.use(async (req, _res, next) => {
            // In workerd dev mode, astro-island component-url arrives as an
            // absolute path or a /@fs/ path without extension. The Astro
            // middleware fixes the /@fs/ prefix; this middleware resolves the
            // file extension so Vite's transform pipeline can serve it.
            if (req.url) {
              let urlPath = req.url.split("?")[0].split("#")[0];

              // Add /@fs/ prefix for raw absolute paths (fallback)
              if (/^\/(?:home|usr|opt|root|var)\//.test(urlPath)) {
                req.url = "/@fs" + req.url;
                urlPath = "/@fs" + urlPath;
              }

              // Resolve extension for /@fs/ paths that have none
              if (
                urlPath.startsWith("/@fs/") &&
                !/\.[a-zA-Z0-9]+$/.test(urlPath)
              ) {
                const fsBase = urlPath.slice(4); // strip /@fs
                const fs = await import("fs");
                for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
                  if (fs.existsSync(fsBase + ext)) {
                    req.url = req.url.replace(urlPath, urlPath + ext);
                    break;
                  }
                }
              }
            }
            next();
          });
        },
      },
    ],
  },
});
