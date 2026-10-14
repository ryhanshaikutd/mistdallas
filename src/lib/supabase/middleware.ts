import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabaseEnv } from './env'

// Routes that cannot work without Supabase. Everything else (landing page,
// nationals, gallery, static assets) renders with empty data instead.
const AUTH_ROUTES = ['/portal', '/onboarding', '/login', '/auth', '/api']

let warnedMissingEnv = false

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing or still placeholders. ' +
          'Public pages will render without data; portal routes return 503. ' +
          'Copy .env.local.example to .env.local to fix.'
      )
    }
    const { pathname } = request.nextUrl
    const needsAuth = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (needsAuth) {
      return new NextResponse(
        'Supabase is not configured. Copy .env.local.example to .env.local and fill in the keys.',
        { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
      )
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect portal routes
  if (pathname.startsWith('/portal') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  // If a logged-in user lands on the root with no auth code, send them to the portal
  if (pathname === '/' && user && !request.nextUrl.searchParams.get('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
