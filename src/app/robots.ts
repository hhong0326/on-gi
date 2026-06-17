import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/onboarding'],
    },
    sitemap: 'https://on-gi.app/sitemap.xml',
  };
}
