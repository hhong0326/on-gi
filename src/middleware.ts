import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk|twitterbot|linkedinbot|discord|telegram|whatsapp/i

async function verifyInviteCode(code: string): Promise<boolean> {
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
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

function createInviteRedirect(request: NextRequest): NextResponse {
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
}

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
  const userAgent = request.headers.get('user-agent') || ''
  const isBot = BOT_PATTERN.test(userAgent)

  // Query string invite: /?code=ONGI2026 (primary method)
  if (pathname === '/') {
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
      if (isBot) return response // Let page render with OG tags

      const { data: { user: existingUser } } = await supabase.auth.getUser()
      if (existingUser) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      const valid = await verifyInviteCode(code)
      if (valid) return createInviteRedirect(request)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Legacy path invite: /invite/[code] (backward compatibility)
  if (pathname.startsWith('/invite/')) {
    const code = pathname.replace('/invite/', '')
    if (isBot && code) return response

    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (!code) return NextResponse.redirect(new URL('/', request.url))

    const valid = await verifyInviteCode(code)
    if (valid) return createInviteRedirect(request)
    return NextResponse.redirect(new URL('/', request.url))
  }

  await supabase.auth.getUser()

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
