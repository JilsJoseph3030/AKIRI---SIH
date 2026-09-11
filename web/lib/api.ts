export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * ngrok free tier serves a browser-warning interstitial unless this header
 * is present — without it API calls get HTML instead of JSON.
 */
export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "ngrok-skip-browser-warning": "true", ...extra };
}
