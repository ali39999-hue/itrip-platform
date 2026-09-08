/**
 * Canonical Brand Dictionary for Firuzo Platform (BRAND-001)
 *
 * Strict Rule:
 * The official Persian brand name is strictly "فیروزو" (Firuzo).
 * Conflicting variations such as "فیروزه" or "فیروز" must not be used for platform branding.
 */

export const BRAND = {
  name: 'Firuzo',
  nameEn: 'Firuzo',
  nameFa: 'فیروزو',
  nameAr: 'فيروزو',
  nameZh: 'Firuzo',
  nameRu: 'Firuzo',

  tagline: {
    fa: 'پلتفرم اختصاصی سفر هوشمند',
    en: 'Next-Gen Intelligent Travel Platform',
    ar: 'منصة السفر الذكي الرائدة',
    zh: '智能旅游首选平台',
    ru: 'Умная туристическая платформа',
  },

  domains: {
    primary: 'firuzo.com',
    staging: 'itrip-platform.vercel.app',
    api: 'api.firuzo.com',
  },

  support: {
    email: 'support@firuzo.com',
    phone: '+98 21 9100 0000',
    telegram: 'https://t.me/firuzo_support',
    workingHours: '24/7 Concierge',
  },

  legal: {
    companyNameFa: 'شرکت خدمات مسافرتی و گردشگری هوشمند فیروزو',
    companyNameEn: 'Firuzo Smart Travel Technologies Ltd.',
    registrationNumber: '612489',
    nationalId: '14012345678',
  },

  getCopyrightYear(): number {
    return new Date().getFullYear();
  },
} as const;

export function getBrandName(locale: string): string {
  switch (locale) {
    case 'fa':
      return BRAND.nameFa;
    case 'ar':
      return BRAND.nameAr;
    default:
      return BRAND.nameEn;
  }
}
