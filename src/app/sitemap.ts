import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://on-gi.app',
      lastModified: new Date(),
      priority: 1,
    },
  ];
}
