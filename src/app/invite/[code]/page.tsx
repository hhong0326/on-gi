import type { Metadata } from 'next';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://on-gi-five.vercel.app';

  return {
    title: 'ON-GI',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요. 초대 링크를 통해 함께 기도에 참여하세요.',
    openGraph: {
      title: 'ON-GI',
      description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
      url: `${siteUrl}/invite/${code}`,
      siteName: 'ON-GI',
      type: 'website',
      images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 600, alt: 'ON-GI' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ON-GI',
      description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
      images: [`${siteUrl}/og-image.png`],
    },
  };
}

export default async function InvitePage() {
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
