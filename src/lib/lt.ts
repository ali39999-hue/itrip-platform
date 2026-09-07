/**
 * Inline localized text resolver for page-local copy.
 * Use for one-off UI strings; shared strings belong in messages/*.json via next-intl.
 * I18N-103: RTL-aware fallback matrix ensuring Persian/Arabic RTL contexts never
 * receive unintended English fallback when RTL translations are available.
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
      return text.fa || text.en;
    case 'ar':
      // I18N-103: RTL fallback: If Arabic is missing, fall back to Persian (RTL) before English
      return text.ar ?? text.fa ?? text.en;
    case 'zh':
      return text.zh ?? text.en;
    case 'ru':
      return text.ru ?? text.en;
    default:
      return text.en;
  }
}
