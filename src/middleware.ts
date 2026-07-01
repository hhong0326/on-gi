import {type NextRequest} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk|twitterbot|linkedinbot|discord|telegram|whatsapp/i;

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_PATTERN.test(userAgent);

  // Run next-intl middleware first (locale detection + redirect)
  const response = intlMiddleware(request);

  // Set up Supabase auth (preserves session cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({name, value, options}) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Allow bots to see OG tags without auth check
  if (!isBot) {
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
