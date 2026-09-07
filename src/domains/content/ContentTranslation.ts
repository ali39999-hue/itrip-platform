/**
 * CMS-101: Translation-first content domain model supporting all 5 locales uniformly.
 * Canonical locales: fa (Persian), en (English), ar (Arabic), zh (Chinese), ru (Russian).
 */

export type SupportedLocale = 'fa' | 'en' | 'ar' | 'zh' | 'ru';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['fa', 'en', 'ar', 'zh', 'ru'] as const;

export const RTL_LOCALES: readonly SupportedLocale[] = ['fa', 'ar'] as const;

export interface LocalizedContent {
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  summary?: string;
  keywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export type ContentTranslationMap = Partial<Record<SupportedLocale, LocalizedContent>>;

export interface TranslationCompleteness {
  isComplete: boolean;
  completionPercentage: number;
  completedLocales: SupportedLocale[];
  missingLocales: SupportedLocale[];
  hasBaseLocale: boolean;
}

/**
 * Validates completeness of translations across the 5 canonical locales.
 */
export function validateContentTranslation(
  translations: ContentTranslationMap,
  baseLocale: SupportedLocale = 'fa'
): TranslationCompleteness {
  const completedLocales: SupportedLocale[] = [];
  const missingLocales: SupportedLocale[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const entry = translations[locale];
    if (entry && entry.title && entry.title.trim().length > 0 && entry.body && entry.body.trim().length > 0) {
      completedLocales.push(locale);
    } else {
      missingLocales.push(locale);
    }
  }

  const completionPercentage = Math.round((completedLocales.length / SUPPORTED_LOCALES.length) * 100);
  const hasBaseLocale = completedLocales.includes(baseLocale);

  return {
    isComplete: missingLocales.length === 0,
    completionPercentage,
    completedLocales,
    missingLocales,
    hasBaseLocale,
  };
}

export interface FallbackOptions {
  baseLocale?: SupportedLocale;
  fallbackRtlToBase?: boolean;
}

/**
 * Resolves content translation for a requested locale with audited RTL-aware fallback.
 * Prevents unintentional English fallback for Persian/Arabic RTL contexts.
 */
export function resolveTranslation(
  translations: ContentTranslationMap,
  targetLocale: SupportedLocale,
  options: FallbackOptions = {}
): LocalizedContent {
  const baseLocale = options.baseLocale || 'fa';
  const fallbackRtl = options.fallbackRtlToBase ?? true;

  // 1. Direct hit
  if (translations[targetLocale] && translations[targetLocale]?.title) {
    return translations[targetLocale]!;
  }

  // 2. RTL-aware fallback: Arabic falls back to Persian (RTL) before English
  if (targetLocale === 'ar' && fallbackRtl && translations[baseLocale] && translations[baseLocale]?.title) {
    return translations[baseLocale]!;
  }

  // 3. Persian (base) fallback
  if (translations[baseLocale] && translations[baseLocale]?.title) {
    return translations[baseLocale]!;
  }

  // 4. English fallback
  if (translations['en'] && translations['en']?.title) {
    return translations['en']!;
  }

  // 5. First available
  for (const loc of SUPPORTED_LOCALES) {
    if (translations[loc] && translations[loc]?.title) {
      return translations[loc]!;
    }
  }

  throw new Error(`No available translation found for locale '${targetLocale}'`);
}

/**
 * Generates an SEO-safe slug for a given string and locale.
 */
export function generateLocaleSlug(text: string, locale: SupportedLocale): string {
  if (!text || !text.trim()) return 'item';
  const trimmed = text.trim();

  // For Latin-based or generic
  if (locale === 'en' || /^[a-zA-Z0-9\s-_]+$/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'item';
  }

  // For Persian / Arabic / Cyrillic / Chinese:
  // Clean whitespace and punctuation while keeping unicode letters and numbers
  return trimmed
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}
