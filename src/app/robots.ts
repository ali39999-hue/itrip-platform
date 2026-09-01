import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://firuzo.com';
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
        '/api',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}