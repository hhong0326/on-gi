import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { pathname } = request.nextUrl

  // Invite code verification: /invite/[code] — runs before auth check
  if (pathname.startsWith('/invite/')) {
    // If user already has a session, skip onboarding
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const code = pathname.replace('/invite/', '')
    if (!code) return NextResponse.redirect(new URL('/', request.url))

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/invite_codes?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=id&limit=1`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        },
      )
      const rows = await res.json()

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      const redirectResponse = NextResponse.redirect(new URL('/onboarding', request.url))
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      redirectResponse.cookies.set('invite_verified', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      })
      return redirectResponse
    } catch (err) {
      console.error('[middleware] invite fetch failed:', err)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Onboarding guard: require invite_verified cookie
  if (pathname === '/onboarding') {
    const invited = request.cookies.get('invite_verified')?.value
    if (invited !== 'true') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
