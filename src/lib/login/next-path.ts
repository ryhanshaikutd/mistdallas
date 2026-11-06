/**
 * Only allow a same-origin relative path for post-login redirects; anything
 * else (e.g. "//evil.com", "/\evil.com", "@evil.com", absolute URLs) falls
 * back to the given default.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
