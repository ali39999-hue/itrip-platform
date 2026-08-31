import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://firuzo.ir';
  const locales = ['fa', 'en', 'ar', 'ru', 'zh'];
  const routes = [
    '',
    '/hotels/search',
    '/flights/search',
    '/tours',
    '/destinations',
    '/plan',
    '/services',
    '/visa',
    '/insurance',
    '/esim',
    '/transfers',
    '/trains',
    '/support',
    '/travelogues',
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  return entries;
}
