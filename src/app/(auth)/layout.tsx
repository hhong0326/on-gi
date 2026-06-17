import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ON-GI — 함께 기도하기',
  description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
