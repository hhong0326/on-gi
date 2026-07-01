import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';

interface InvitePageProps {
  params: Promise<{ locale: string; code: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://on-gi-five.vercel.app';

  return {
    title: t('title'),
    description: t('inviteDescription'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${siteUrl}/invite/${code}`,
      siteName: t('title'),
      type: 'website',
      images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: t('title') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [`${siteUrl}/og-image.png`],
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  // This page only serves OG meta tags for bots/crawlers.
  // Normal users are redirected by middleware before reaching here.
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ background: '#08080F' }}
    >
      <p className="text-center text-sm text-white/40">
        ON-GI
      </p>
    </div>
  );
}
