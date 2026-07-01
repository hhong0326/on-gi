import type {Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {PwaRegistrar} from '@/components/ui/PwaRegistrar';
import {AgentationLoader} from '@/components/dev/AgentationLoader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#D4A44C',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
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
