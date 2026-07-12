export interface PostHogClient {
  capture: (event: string, props?: Record<string, unknown>) => void;
  captureException: (err: unknown) => void;
  get_distinct_id?: () => string;
  get_session_id?: () => string;
}

declare global {
  interface Window {
    posthog?: PostHogClient;
  }
}

export function getPostHog(): PostHogClient | undefined {
  return typeof window !== "undefined" ? window.posthog : undefined;
}

export function getPostHogHeaders(): Record<string, string> {
  const ph = getPostHog();
  return {
    "X-PostHog-Session-Id": ph?.get_session_id?.() || "",
    "X-PostHog-Distinct-Id": ph?.get_distinct_id?.() || "",
  };
}
