import type { CountryId } from './countries';
import { lt, LText } from './lt';

export const CURRENCY_TO_TOMAN: Record<string, number> = {
  IRR: 1,
  TRY: 2900,
  AED: 27000,
  GEL: 37000,
  RUB: 1200,
  OMR: 260000,
  CNY: 14000,
};

export const CURRENCY_LABEL: Record<string, LText> = {
  IRR: { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' },
  TRY: { fa: 'لیر', en: 'Lira', ar: 'ليرة', zh: '里拉', ru: 'лир' },
  AED: { fa: 'درهم', en: 'Dirham', ar: 'درهم', zh: '迪拉姆', ru: 'дирхам' },
  GEL: { fa: 'لاری', en: 'Lari', ar: 'لاري', zh: '拉里', ru: 'лари' },
  RUB: { fa: 'روبل', en: 'Ruble', ar: 'روبل', zh: '卢布', ru: 'рубль' },
  OMR: { fa: 'ریال عمان', en: 'Omani Rial', ar: 'ريال عماني', zh: '阿曼里亚尔', ru: 'оманский риал' },
  CNY: { fa: 'یوان', en: 'Yuan', ar: 'يوان', zh: '元', ru: 'юань' },
};

/** @deprecated use CURRENCY_LABEL with lt() */
export const CURRENCY_FA: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_LABEL).map(([k, v]) => [k, v.fa])
);

export function toLocalCurrency(amountToman: number, currency: string): number {
  const rate = CURRENCY_TO_TOMAN[currency] ?? 1;
  const v = amountToman / rate;
  return currency === 'IRR' ? Math.round(v) : Math.round(v * 10) / 10;
}

export function formatMoney(amountToman: number, currency: string, locale = 'fa'): string {
  const v = toLocalCurrency(amountToman, currency);
  const localeMap: Record<string, string> = {
    fa: 'fa-IR',
    en: 'en-US',
    ar: 'ar-EG',
    zh: 'zh-CN',
    ru: 'ru-RU',
  };
  const digits = v.toLocaleString(localeMap[locale] || locale);
  const label = CURRENCY_LABEL[currency] ? lt(locale, CURRENCY_LABEL[currency]) : currency;
  return `${digits} ${label}`;
}

export function chargeContext(countryId: CountryId): {
  currency: string;
  label: LText;
  gateway: LText;
  isHome: boolean;
} {
  const map: Record<CountryId, { currency: string; label: LText; gateway: LText }> = {
    iran: { currency: 'IRR', label: CURRENCY_LABEL.IRR, gateway: { fa: 'درگاه ریالی شتاب', en: 'Shetab Rial Gateway', ar: 'بوابة شتاب بالريال', zh: 'Shetab 里亚尔网关', ru: 'Шлюз Shetab (риал)' } },
    turkey: { currency: 'TRY', label: { fa: 'لیر ترکیه', en: 'Turkish Lira', ar: 'ليرة تركية', zh: '土耳其里拉', ru: 'турецкая лира' }, gateway: { fa: 'درگاه TRY', en: 'TRY Gateway', ar: 'بوابة TRY', zh: 'TRY 网关', ru: 'Шлюз TRY' } },
    uae: { currency: 'AED', label: { fa: 'درهم امارات', en: 'UAE Dirham', ar: 'درهم إماراتي', zh: '阿联酋迪拉姆', ru: 'дирхам ОАЭ' }, gateway: { fa: 'درگاه AED بین‌المللی', en: 'International AED Gateway', ar: 'بوابة AED دولية', zh: 'AED 国际网关', ru: 'Международный шлюз AED' } },
    georgia: { currency: 'GEL', label: { fa: 'لاری گرجستان', en: 'Georgian Lari', ar: 'لاري جورجي', zh: '格鲁吉亚拉里', ru: 'грузинский лари' }, gateway: { fa: 'درگاه GEL محلی', en: 'Local GEL Gateway', ar: 'بوابة GEL محلية', zh: 'GEL 本地网关', ru: 'Локальный шлюз GEL' } },
    russia: { currency: 'RUB', label: { fa: 'روبل روسیه', en: 'Russian Ruble', ar: 'روبل روسي', zh: '俄罗斯卢布', ru: 'российский рубль' }, gateway: { fa: 'درگاه RUB', en: 'RUB Gateway', ar: 'بوابة RUB', zh: 'RUB 网关', ru: 'Шлюз RUB' } },
    oman: { currency: 'OMR', label: CURRENCY_LABEL.OMR, gateway: { fa: 'درگاه OMR', en: 'OMR Gateway', ar: 'بوابة OMR', zh: 'OMR 网关', ru: 'Шлюз OMR' } },
    china: { currency: 'CNY', label: { fa: 'یوان چین', en: 'Chinese Yuan', ar: 'يوان صيني', zh: '人民币', ru: 'китайский юань' }, gateway: { fa: 'درگاه CNY', en: 'CNY Gateway', ar: 'بوابة CNY', zh: 'CNY 网关', ru: 'Шлюз CNY' } },
  };
  const m = map[countryId];
  return { ...m, isHome: countryId === 'iran' };
}
