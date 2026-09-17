import { MetadataRoute } from 'next';
import { getAppBaseUrl } from '@/lib/runtime-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getAppBaseUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/*/admin',
        '/checkout',
        '/*/checkout',
        '/account',
        '/*/account',
        '/wallet',
        '/*/wallet',
        '/payment-status',
        '/*/payment-status',
        '/my-trips',
        '/*/my-trips',
        '/book',
        '/*/book',
        '/api',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}