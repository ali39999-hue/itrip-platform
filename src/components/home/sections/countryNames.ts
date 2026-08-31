import type { CountryId } from '@/lib/countries';
import { lt, type LText } from '@/lib/lt';

/** Localized country names — lib/countries only carries fa/en, pages need all 5 locales. */
export const COUNTRY_NAME: Record<CountryId, LText> = {
  iran: { fa: 'ایران', en: 'Iran', ar: 'إيران', zh: '伊朗', ru: 'Иран' },
  turkey: { fa: 'ترکیه', en: 'Turkey', ar: 'تركيا', zh: '土耳其', ru: 'Турция' },
  uae: { fa: 'امارات', en: 'UAE', ar: 'الإمارات', zh: '阿联酋', ru: 'ОАЭ' },
  georgia: { fa: 'گرجستان', en: 'Georgia', ar: 'جورجيا', zh: '格鲁吉亚', ru: 'Грузия' },
  russia: { fa: 'روسیه', en: 'Russia', ar: 'روسيا', zh: '俄罗斯', ru: 'Россия' },
  oman: { fa: 'عمان', en: 'Oman', ar: 'عُمان', zh: '阿曼', ru: 'Оман' },
  china: { fa: 'چین', en: 'China', ar: 'الصين', zh: '中国', ru: 'Китай' },
};

export function countryNameL(id: CountryId, locale: string): string {
  return lt(locale, COUNTRY_NAME[id] ?? { fa: id, en: id });
}
