import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Supabase may redirect the OAuth code to the site root; forward it to the
  // callback handler so the landing page itself can stay cacheable.
  const { pathname, searchParams } = request.nextUrl
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  return await updateSession(request)
}

export const config = {
  // Only routes that need a session check or token refresh. Public pages,
  // static assets and the hero video skip the Supabase round-trip entirely.
  matcher: ['/', '/portal/:path*', '/login', '/onboarding', '/auth/:path*', '/api/:path*'],
}
