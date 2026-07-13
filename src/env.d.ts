type Runtime = import("@astrojs/cloudflare").Runtime;

declare namespace App {
  interface Locals extends Runtime {
    /** Per-request CSP nonce, set in src/middleware.ts. */
    nonce: string;
  }
}
