import type { Metadata } from 'next';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://on-gi.app';

  return {
    title: 'ON-GI — 기도의 불',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요. 초대 링크를 통해 함께 기도에 참여하세요.',
    openGraph: {
      title: 'ON-GI — 기도의 불',
      description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
      url: `${siteUrl}/invite/${code}`,
      siteName: 'ON-GI',
      type: 'website',
      images: [{ url: `${siteUrl}/logo-en-lg.svg`, width: 113, height: 40, alt: 'ON-GI' }],
    },
    twitter: {
      card: 'summary',
      title: 'ON-GI — 기도의 불',
      description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
      images: [`${siteUrl}/logo-en-lg.svg`],
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ background: '#08080F' }}
    >
      <p className="text-center text-sm text-white/60">
        초대 코드를 확인하고 있습니다...
      </p>
      <meta httpEquiv="refresh" content={`0;url=/invite/${code}`} />
    </div>
  );
}
