/**
 * CMS-103: SEO Metadata Service for CMS and content entities.
 * Generates canonical URLs, hreflang alternate tags for all 5 locales (fa, en, ar, zh, ru, x-default),
 * OpenGraph tags, Twitter Card tags, and Schema.org JSON-LD structured data.
 */

import {
  type SupportedLocale,
  type LocalizedContent,
  SUPPORTED_LOCALES,
} from './ContentTranslation';

export interface SeoGenerateParams {
  content: LocalizedContent;
  locale: SupportedLocale;
  pathPrefix: string; // e.g., 'tours', 'guide', 'travelogues'
  slug?: string;
  baseUrl?: string;
  imageUrl?: string;
  authorName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  ogType?: 'article' | 'website' | 'product';
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

export interface SeoMetadataResult {
  title: string;
  description: string;
  canonicalUrl: string;
  hreflang: HreflangEntry[];
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    alternateLocales: string[];
    type: string;
    images?: Array<{ url: string; alt?: string; width?: number; height?: number }>;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
  twitter: {
    card: 'summary_large_image' | 'summary';
    title: string;
    description: string;
    images?: string[];
  };
}

export const LOCALE_OG_MAP: Record<SupportedLocale, string> = {
  fa: 'fa_IR',
  en: 'en_US',
  ar: 'ar_SA',
  zh: 'zh_CN',
  ru: 'ru_RU',
};

export const DEFAULT_BASE_URL = 'https://itrip.ir';

export class SeoMetadataService {
  /**
   * Generates full SEO metadata package for a localized content piece.
   */
  static generateSeo(params: SeoGenerateParams): SeoMetadataResult {
    const baseUrl = (params.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const prefix = params.pathPrefix.replace(/^\/+|\/+$/g, '');
    const slug = (params.slug || params.content.slug).replace(/^\/+|\/+$/g, '');

    const currentUrl = `${baseUrl}/${params.locale}/${prefix}/${slug}`;
    const canonicalUrl = currentUrl;

    // Build hreflang alternates across all 5 locales + x-default
    const hreflang: HreflangEntry[] = SUPPORTED_LOCALES.map((loc) => ({
      lang: loc,
      url: `${baseUrl}/${loc}/${prefix}/${slug}`,
    }));

    // Canonical x-default pointing to international English
    hreflang.push({
      lang: 'x-default',
      url: `${baseUrl}/en/${prefix}/${slug}`,
    });

    const title = params.content.metaTitle || params.content.title;
    const description =
      params.content.metaDescription ||
      params.content.excerpt ||
      params.content.body.slice(0, 160).trim();

    const openGraph = {
      title,
      description,
      url: currentUrl,
      siteName: 'iTrip / Firuzo',
      locale: LOCALE_OG_MAP[params.locale] || 'en_US',
      alternateLocales: SUPPORTED_LOCALES.filter((l) => l !== params.locale).map((l) => LOCALE_OG_MAP[l]),
      type: params.ogType || 'article',
      images: params.imageUrl
        ? [{ url: params.imageUrl, alt: title, width: 1200, height: 630 }]
        : undefined,
      publishedTime: params.publishedTime,
      modifiedTime: params.modifiedTime,
      authors: params.authorName ? [params.authorName] : undefined,
      tags: params.tags,
    };

    const twitter = {
      card: 'summary_large_image' as const,
      title,
      description,
      images: params.imageUrl ? [params.imageUrl] : undefined,
    };

    return {
      title,
      description,
      canonicalUrl,
      hreflang,
      openGraph,
      twitter,
    };
  }

  /**
   * JSON-LD: Schema.org/Article
   */
  static generateArticleJsonLd(params: {
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    authorName?: string;
    publishedTime?: string;
    modifiedTime?: string;
    locale: SupportedLocale;
  }): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: params.title,
      description: params.description,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': params.url,
      },
      inLanguage: params.locale,
      image: params.imageUrl || undefined,
      datePublished: params.publishedTime,
      dateModified: params.modifiedTime || params.publishedTime,
      author: {
        '@type': 'Person',
        name: params.authorName || 'iTrip Editorial',
      },
      publisher: {
        '@type': 'Organization',
        name: 'iTrip / Firuzo',
        url: DEFAULT_BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${DEFAULT_BASE_URL}/logo.png`,
        },
      },
    };
  }

  /**
   * JSON-LD: Schema.org/TouristTrip
   */
  static generateTouristTripJsonLd(params: {
    name: string;
    description: string;
    url: string;
    imageUrl?: string;
    destinationCity: string;
    durationDays?: number;
    price?: number;
    currency?: string;
    itineraryDays?: Array<{ day: number; title: string; description: string }>;
  }): Record<string, unknown> {
    const itinerary = (params.itineraryDays || []).map((day) => ({
      '@type': 'Day',
      dayNumber: day.day,
      name: day.title,
      description: day.description,
    }));

    return {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: params.name,
      description: params.description,
      url: params.url,
      image: params.imageUrl,
      touristType: ['Cultural', 'Adventure', 'Leisure'],
      itinerary: itinerary.length > 0 ? itinerary : undefined,
      offers: params.price
        ? {
            '@type': 'Offer',
            price: params.price,
            priceCurrency: params.currency || 'IRR',
            availability: 'https://schema.org/InStock',
            url: params.url,
          }
        : undefined,
      provider: {
        '@type': 'TravelAgency',
        name: 'iTrip / Firuzo',
        url: DEFAULT_BASE_URL,
      },
    };
  }

  /**
   * JSON-LD: Schema.org/BreadcrumbList
   */
  static generateBreadcrumbJsonLd(
    items: Array<{ name: string; url: string }>
  ): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * JSON-LD: Schema.org/TravelAgency
   */
  static generateTravelAgencyJsonLd(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: 'iTrip / Firuzo',
      url: DEFAULT_BASE_URL,
      logo: `${DEFAULT_BASE_URL}/logo.png`,
      sameAs: [
        'https://instagram.com/firuzo',
        'https://twitter.com/firuzo_travel',
      ],
      priceRange: '$$$',
      areaServed: ['IR', 'AE', 'TR', 'GE', 'RU', 'OM', 'CN'],
    };
  }
}
