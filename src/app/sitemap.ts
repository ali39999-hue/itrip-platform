import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['fa', 'en', 'ar', 'zh', 'ru'];
  const routes = ['', '/hotels/search', '/flights/search', '/tours', '/guide'];
  
  return locales.flatMap(locale => 
    routes.map(route => ({
      url: `https://firuzo.com/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: route === '' ? 1 : 0.8,
    }))
  );
}