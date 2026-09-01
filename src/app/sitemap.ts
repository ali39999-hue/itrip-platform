import { MetadataRoute } from 'next';
import { HOTELS } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['fa', 'en', 'ar', 'zh', 'ru'];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://firuzo.com';

  const staticRoutes = [
    '',
    '/hotels/search',
    '/flights/search',
    '/tours',
    '/guide',
    '/visa',
    '/insurance',
    '/esim',
    '/destinations',
    '/services',
    '/support',
    '/travelogues',
    '/city-pass',
    '/trains',
    '/transfers',
    '/interpreter',
    '/snapp',
    '/plan',
  ];

  const hotelRoutes = HOTELS.map((h) => `/hotels/${h.id}`);
  const travelogueRoutes = ['/travelogues/1', '/travelogues/2', '/travelogues/3'];

  const allRoutes = [...staticRoutes, ...hotelRoutes, ...travelogueRoutes];

  return locales.flatMap((locale) =>
    allRoutes.map((route) => ({
      url: `${siteUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1.0 : route.startsWith('/hotels/') ? 0.8 : 0.7,
    }))
  );
}