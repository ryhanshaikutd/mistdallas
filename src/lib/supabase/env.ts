/**
 * True when usable public Supabase credentials are present.
 *
 * Treats unset values and untouched placeholders from .env.local.example
 * (e.g. "https://<project-ref>.supabase.co") as "not configured". When not
 * configured, the public pages render with empty data instead of crashing,
 * and auth-dependent routes return a clear 503 from the proxy.
 */
export function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false
  if (url.includes('<') || key.includes('<')) return false
  try {
    new URL(url)
  } catch {
    return false
  }
  return true
}
