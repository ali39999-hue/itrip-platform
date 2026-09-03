import type { Metadata } from 'next';
import { lt, type LText } from './lt';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export interface PageMetaDefinition {
  title: LText;
  description: LText;
  /** Route path without locale prefix, e.g. '/flights' */
  path?: string;
  noindex?: boolean;
}

/**
 * Builds locale-aware page metadata. Designed for small server-side
 * layout.tsx files placed next to 'use client' pages (which cannot export
 * metadata themselves).
 */
export function buildPageMetadata(locale: string, def: PageMetaDefinition): Metadata {
  const title = lt(locale, def.title);
  const description = lt(locale, def.description);
  const canonical = def.path ? `${SITE}/${locale}${def.path}` : undefined;

  return {
    // absolute bypasses the root layout template (which already appends the
    // brand) so segment titles never render as "فیروزه | فیروزه".
    title: { absolute: title },
    description,
    ...(canonical ? { alternates: { canonical, languages: { fa: 'fa', en: 'en', ar: 'ar', zh: 'zh', ru: 'ru' } } } : {}),
    ...(def.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      locale,
      ...(canonical ? { url: canonical } : {}),
    },
  };
}

/** Standard generateMetadata wrapper for [locale] route segment layouts. */
export function localizedMetadata(
  def: PageMetaDefinition
): (args: { params: Promise<{ locale: string }> }) => Promise<Metadata> {
  return async ({ params }) => {
    const { locale } = await params;
    return buildPageMetadata(locale, def);
  };
}
