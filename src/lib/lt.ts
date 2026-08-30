/**
 * Inline localized text resolver for page-local copy.
 * Use for one-off UI strings; shared strings belong in messages/*.json via next-intl.
 * Falls back to English when a locale is missing a value.
 */
export type Locale = 'fa' | 'en' | 'ar' | 'zh' | 'ru';

export interface LText {
  fa: string;
  en: string;
  ar?: string;
  zh?: string;
  ru?: string;
}

export function lt(locale: string, text: LText): string {
  switch (locale) {
    case 'fa':
      return text.fa;
    case 'ar':
      return text.ar ?? text.en;
    case 'zh':
      return text.zh ?? text.en;
    case 'ru':
      return text.ru ?? text.en;
    default:
      return text.en;
  }
}
