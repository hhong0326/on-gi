import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgentationLoader } from "@/components/dev/AgentationLoader";
import { PwaRegistrar } from "@/components/ui/PwaRegistrar";

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
  themeColor: '#D4A44C',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://on-gi-five.vercel.app'),
  title: 'ON-GI',
  description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'ON-GI',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
    siteName: 'ON-GI',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 600, alt: 'ON-GI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ON-GI',
    description: '세상의 빛인 당신, 기도의 온기로 함께 어둠을 밝혀요.',
    images: ['/og-image.png'],
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
        <PwaRegistrar />
        <AgentationLoader />
      </body>
    </html>
  );
}
