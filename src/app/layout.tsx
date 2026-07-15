import type {Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import {preconnect, prefetchDNS} from 'react-dom';
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
  // Warm up connections to origins on the critical loading path
  preconnect('https://api.mapbox.com');
  prefetchDNS('https://events.mapbox.com');
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    preconnect(process.env.NEXT_PUBLIC_SUPABASE_URL);
  }

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
