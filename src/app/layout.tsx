import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgentationLoader } from "@/components/dev/AgentationLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://on-gi.app'),
  title: 'ON-GI — 기도의 불',
  description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-bulb-sm.svg',
    apple: '/icon-bulb-lg.svg',
  },
  themeColor: '#D4A44C',
  openGraph: {
    title: 'ON-GI — 기도의 불',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
    siteName: 'ON-GI',
    type: 'website',
    images: [{ url: '/logo-en-lg.svg', width: 113, height: 40, alt: 'ON-GI' }],
  },
  twitter: {
    card: 'summary',
    title: 'ON-GI — 기도의 불',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
    images: ['/logo-en-lg.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <AgentationLoader />
      </body>
    </html>
  );
}
