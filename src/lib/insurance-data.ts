import type {
  InsuranceCompanyInfo,
  AssistancePartnerInfo,
  InsuranceCoverageLimitEur,
  TravelInsuranceZone,
  InsuranceAgeBracket,
} from '@/lib/types';

export interface DestinationZoneOption {
  id: TravelInsuranceZone;
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  subtitleEn: string;
  requiresMin30k: boolean;
  isPopular?: boolean;
  sampleCountriesFa: string[];
}

export interface DurationPackageOption {
  id: string; // '1-7', '8-15', '16-23', '24-31', '32-45', '46-62', '63-92', '6m', '1y'
  daysMin: number;
  daysMax: number;
  labelFa: string;
  labelEn: string;
  durationMultiplier: number;
}

export interface AgeBracketOption {
  id: InsuranceAgeBracket;
  labelFa: string;
  labelEn: string;
  multiplier: number;
}

export const INSURANCE_COMPANIES: Record<string, InsuranceCompanyInfo> = {
  kowsar: {
    id: 'kowsar',
    code: 'kowsar',
    nameFa: 'بیمه کوثر',
    nameEn: 'Kowsar Insurance',
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.2,
    reviewsCount: 1122,
    instantIssuance: true,
    schengenApproved: true,
  },
  razi: {
    id: 'razi',
    code: 'razi',
    nameFa: 'بیمه رازی',
    nameEn: 'Razi Insurance',
    logo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.2,
    reviewsCount: 1621,
    instantIssuance: true,
    schengenApproved: true,
  },
  iran: {
    id: 'iran',
    code: 'iran',
    nameFa: 'بیمه ایران',
    nameEn: 'Iran Insurance',
    logo: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.3,
    reviewsCount: 3029,
    instantIssuance: true,
    schengenApproved: true,
  },
  saman: {
    id: 'saman',
    code: 'saman',
    nameFa: 'بیمه سامان',
    nameEn: 'Saman Insurance',
    logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.8,
    reviewsCount: 5420,
    instantIssuance: true,
    schengenApproved: true,
  },
  pasargad: {
    id: 'pasargad',
    code: 'pasargad',
    nameFa: 'بیمه پاسارگاد',
    nameEn: 'Pasargad Insurance',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.6,
    reviewsCount: 2180,
    instantIssuance: true,
    schengenApproved: true,
  },
  asia: {
    id: 'asia',
    code: 'asia',
    nameFa: 'بیمه آسیا',
    nameEn: 'Asia Insurance',
    logo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=120&q=80',
    solvencyLevel: 1,
    rating: 4.4,
    reviewsCount: 1890,
    instantIssuance: true,
    schengenApproved: true,
  },
};

export const ASSISTANCE_PARTNERS: Record<string, AssistancePartnerInfo> = {
  swiss_assist: {
    id: 'swiss_assist',
    code: 'swiss_assist',
    nameFa: 'Swiss Assist (سوئیس)',
    nameEn: 'Swiss Assist',
    logo: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=120&q=80',
    country: 'Switzerland',
    supportPhone24h: '+41 22 518 0244',
    farsiSupport: true,
    directHospitalSettlement: true,
  },
  remed: {
    id: 'remed',
    code: 'remed',
    nameFa: 'Remed Assistance (ترکیه)',
    nameEn: 'Remed Assistance',
    logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=120&q=80',
    country: 'Turkey',
    supportPhone24h: '+90 212 375 5757',
    farsiSupport: true,
    directHospitalSettlement: true,
  },
  mideast: {
    id: 'mideast',
    code: 'mideast',
    nameFa: 'Mideast Assistance (خاورمیانه)',
    nameEn: 'Mideast Assistance',
    logo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=120&q=80',
    country: 'UAE / Lebanon',
    supportPhone24h: '+961 1 511 888',
    farsiSupport: true,
    directHospitalSettlement: true,
  },
  irasist: {
    id: 'irasist',
    code: 'irasist',
    nameFa: 'کمک‌رسان ایران (Irasist)',
    nameEn: 'Irasist Assistance',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=120&q=80',
    country: 'Iran / Global',
    supportPhone24h: '+98 21 8864 8888',
    farsiSupport: true,
    directHospitalSettlement: true,
  },
};

export const DESTINATION_ZONES: DestinationZoneOption[] = [
  {
    id: 'ZONE_TURKEY_NEIGHBORS',
    titleFa: 'ترکیه، آذربایجان و کشورهای همسایه',
    titleEn: 'Turkey, Azerbaijan & Neighbors',
    subtitleFa: 'ترکیه، جمهوری آذربایجان، ارمنستان، گرجستان (ارزان‌ترین تعرفه پایه)',
    subtitleEn: 'Turkey, Azerbaijan, Armenia, Georgia (Best Economy Rates)',
    requiresMin30k: false,
    isPopular: true,
    sampleCountriesFa: ['ترکیه', 'جمهوری آذربایجان', 'گرجستان', 'ارمنستان'],
  },
  {
    id: 'ZONE_SCHENGEN_EUROPE',
    titleFa: 'کشورهای حوزه شنگن و اتحادیه اروپا',
    titleEn: 'Schengen Area & Europe',
    subtitleFa: 'فرانسه، آلمان، ایتالیا، اسپانیا، سوئیس و سایر کشورهای اروپایی (الزام حداقل پوشش ۳۰k یا ۵۰k)',
    subtitleEn: 'France, Germany, Italy, Spain, Switzerland (Minimum 30k/50k EUR)',
    requiresMin30k: true,
    isPopular: true,
    sampleCountriesFa: ['آلمان', 'فرانسه', 'ایتالیا', 'اسپانیا', 'سوئیس', 'یونان', 'هلند'],
  },
  {
    id: 'ZONE_GULF_MIDDLE_EAST',
    titleFa: 'کشورهای حوزه خلیج فارس و خاورمیانه',
    titleEn: 'Persian Gulf & Middle East',
    subtitleFa: 'امارات متحده عربی، عمان، قطر، کویت، بحرین و عربستان',
    subtitleEn: 'UAE, Oman, Qatar, Kuwait, Bahrain, Saudi Arabia',
    requiresMin30k: false,
    isPopular: true,
    sampleCountriesFa: ['امارات (دبی)', 'عمان (مسقط)', 'قطر (دوحه)'],
  },
  {
    id: 'ZONE_WORLD_EXCL_US_CA',
    titleFa: 'سراسر جهان به جز آمریکا و کانادا',
    titleEn: 'Worldwide (Excl. USA & Canada)',
    subtitleFa: 'آسیای شرقی (چین، ژاپن، تایلند، مالزی)، آمریکای لاتین و آفریقا',
    subtitleEn: 'East Asia (China, Thailand, Japan), Latin America, Africa',
    requiresMin30k: false,
    sampleCountriesFa: ['چین', 'تایلند', 'روسیه', 'مالزی', 'برزیل'],
  },
  {
    id: 'ZONE_WORLD_ALL',
    titleFa: 'تمام دنیا (شامل آمریکا و کانادا)',
    titleEn: 'Worldwide (Including USA & Canada)',
    subtitleFa: 'پوشش بدون مرز کلیه کشورهای جهان با حداکثر سقف خسارت ۵۰ هزار یورو',
    subtitleEn: 'Full global coverage including United States and Canada (50,000 EUR)',
    requiresMin30k: true,
    sampleCountriesFa: ['آمریکا', 'کانادا', 'استرالیا', 'انگلستان'],
  },
];

export const DURATION_PACKAGES: DurationPackageOption[] = [
  { id: '1-7', daysMin: 1, daysMax: 7, labelFa: '۱ تا ۷ روز', labelEn: '1 to 7 Days', durationMultiplier: 1.0 },
  { id: '8-15', daysMin: 8, daysMax: 15, labelFa: '۸ تا ۱۵ روز', labelEn: '8 to 15 Days', durationMultiplier: 1.35 },
  { id: '16-23', daysMin: 16, daysMax: 23, labelFa: '۱۶ تا ۲۳ روز', labelEn: '16 to 23 Days', durationMultiplier: 1.75 },
  { id: '24-31', daysMin: 24, daysMax: 31, labelFa: '۲۴ تا ۳۱ روز', labelEn: '24 to 31 Days', durationMultiplier: 2.15 },
  { id: '32-45', daysMin: 32, daysMax: 45, labelFa: '۳۲ تا ۴۵ روز', labelEn: '32 to 45 Days', durationMultiplier: 2.80 },
  { id: '46-62', daysMin: 46, daysMax: 62, labelFa: '۴۶ تا ۶۲ روز', labelEn: '46 to 62 Days', durationMultiplier: 3.55 },
  { id: '63-92', daysMin: 63, daysMax: 92, labelFa: '۶۳ تا ۹۲ روز', labelEn: '63 to 92 Days', durationMultiplier: 4.60 },
  { id: '6m', daysMin: 93, daysMax: 180, labelFa: '۶ ماهه مولتی (Multiple)', labelEn: '6 Months Multi', durationMultiplier: 8.80 },
  { id: '1y', daysMin: 181, daysMax: 365, labelFa: 'یک ساله مولتی (Multiple)', labelEn: '1 Year Multi', durationMultiplier: 13.90 },
];

export const AGE_BRACKETS: AgeBracketOption[] = [
  { id: '0-12', labelFa: 'کودک (۰ تا ۱۲ سال تمام)', labelEn: 'Child (0-12)', multiplier: 0.85 },
  { id: '13-65', labelFa: 'بزرگسال (۱۳ تا ۶۵ سال تمام - پایه)', labelEn: 'Adult (13-65)', multiplier: 1.00 },
  { id: '66-70', labelFa: 'سالمند (۶۶ تا ۷۰ سال تمام)', labelEn: 'Senior (66-70)', multiplier: 1.50 },
  { id: '71-75', labelFa: 'سالمند (۷۱ تا ۷۵ سال تمام)', labelEn: 'Senior (71-75)', multiplier: 2.00 },
  { id: '76-80', labelFa: 'کهنسال (۷۶ تا ۸۰ سال تمام)', labelEn: 'Elderly (76-80)', multiplier: 2.80 },
  { id: '81+', labelFa: 'کهنسال (۸۱ سال به بالا)', labelEn: 'Elderly (81+)', multiplier: 4.00 },
];

export const COVERAGE_LIMIT_OPTIONS: { id: InsuranceCoverageLimitEur; labelFa: string; labelEn: string }[] = [
  { id: 10000, labelFa: '۱۰ هزار یورو', labelEn: '10,000 EUR' },
  { id: 30000, labelFa: '۳۰ هزار یورو', labelEn: '30,000 EUR' },
  { id: 50000, labelFa: '۵۰ هزار یورو', labelEn: '50,000 EUR' },
];

/**
 * Base Plan Rates Matrix for 1-7 Days, Zone 1 (Turkey/Neighbors), Single Adult 13-65.
 * Calibrated against real Iranian insurance tariffs (Azki / Bimeh.com as in user screenshots):
 * - Kowsar 50k: ~174,240 Toman (exact match with user Screenshot 1 & 2!)
 * - Razi 50k: ~181,433 Toman (exact match with user Screenshot 2!)
 * - Iran 10k: ~57,191 Toman (exact match with user Screenshot 2!)
 * - Iran 30k: ~69,930 Toman (exact match with user Screenshot 3!)
 */
export interface BaseInsurancePlanDefinition {
  id: string;
  companyId: string;
  assistanceId: string;
  coverageEur: InsuranceCoverageLimitEur;
  basePriceToman1to7Days: number;
  topPerksFa: string[];
  topPerksEn: string[];
}

export const BASE_INSURANCE_PLANS: BaseInsurancePlanDefinition[] = [
  {
    id: 'kowsar-50k-swiss',
    companyId: 'kowsar',
    assistanceId: 'swiss_assist',
    coverageEur: 50000,
    basePriceToman1to7Days: 174240, // 174,240 Toman (Matches Screenshot 1 & 2)
    topPerksFa: [
      'سقف خسارت پرداختی ۵۰,۰۰۰ یورو',
      'جبران خسارت گم شدن چمدان و مدارک',
      'پرداخت مستقیم هزینه‌های بستری بیمارستانی',
      'پوشش تاخیر پرواز بیش از ۶ ساعت',
    ],
    topPerksEn: [
      'Coverage limit 50,000 EUR',
      'Lost luggage & passport compensation',
      'Direct cashless hospital billing in Europe',
      'Flight delay compensation over 6h',
    ],
  },
  {
    id: 'razi-50k-remed',
    companyId: 'razi',
    assistanceId: 'remed',
    coverageEur: 50000,
    basePriceToman1to7Days: 181433, // 181,433 Toman (Matches Screenshot 2)
    topPerksFa: [
      'سقف خسارت پرداختی ۵۰,۰۰۰ یورو',
      'جبران خسارت گم شدن چمدان و مدارک',
      'پوشش فوریت‌های دندانپزشکی تا ۳۵۰ یورو',
      'بازگرداندن اضطراری مسافر به کشور',
    ],
    topPerksEn: [
      'Coverage limit 50,000 EUR',
      'Lost luggage & passport compensation',
      'Emergency dental care up to 350 EUR',
      'Emergency medical repatriation',
    ],
  },
  {
    id: 'iran-10k-swiss',
    companyId: 'iran',
    assistanceId: 'swiss_assist',
    coverageEur: 10000,
    basePriceToman1to7Days: 57191, // 57,191 Toman (Matches Screenshot 2)
    topPerksFa: [
      'سقف خسارت پرداختی ۱۰,۰۰۰ یورو',
      'اقتصادی‌ترین نرخ با پشتیبانی بیمه دولتی ایران',
      'جبران هزینه‌های پزشکی و اورژانسی',
    ],
    topPerksEn: [
      'Coverage limit 10,000 EUR',
      'Most economical state-backed plan',
      'Emergency medical & hospitalization',
    ],
  },
  {
    id: 'iran-30k-swiss',
    companyId: 'iran',
    assistanceId: 'swiss_assist',
    coverageEur: 30000,
    basePriceToman1to7Days: 69930, // 69,930 Toman (Matches Screenshot 3)
    topPerksFa: [
      'سقف خسارت پرداختی ۳۰,۰۰۰ یورو',
      'مورد تایید سفارتخانه‌های شنگن',
      'جبران خسارت گم شدن چمدان و مدارک',
      'پشتیبانی ۲۴ ساعته اپراتور فارسی‌زبان',
    ],
    topPerksEn: [
      'Coverage limit 30,000 EUR',
      'Schengen embassy approved',
      'Lost baggage & documents compensation',
      '24/7 Farsi speaking hotline',
    ],
  },
  {
    id: 'saman-50k-swiss',
    companyId: 'saman',
    assistanceId: 'swiss_assist',
    coverageEur: 50000,
    basePriceToman1to7Days: 198000,
    topPerksFa: [
      'پرفروش‌ترین بیمه مسافرتی شنگن و کانادا در ایران',
      'پذیرش ۱۰۰٪ و قطعی در باجه‌های VFS و کنسولگری‌ها',
      'سقف خسارت ۵۰,۰۰۰ یورو بدون فرانشیز',
      'پوشش جامع سرقت وسایل و فوریت دندانپزشکی',
    ],
    topPerksEn: [
      'Best-selling travel insurance in Iran',
      '100% accepted by VFS Global and embassies',
      '50,000 EUR coverage without deductible',
      'Full theft & emergency dental coverage',
    ],
  },
  {
    id: 'pasargad-30k-mideast',
    companyId: 'pasargad',
    assistanceId: 'mideast',
    coverageEur: 30000,
    basePriceToman1to7Days: 88000,
    topPerksFa: [
      'سقف خسارت ۳۰,۰۰۰ یورو با کارت کمک‌رسان میدایست',
      'سطح توانگری مالی ۱ و پرداخت مطمئن خسارت',
      'پوشش کامل بیماری‌های حاد و مفقودی چمدان',
    ],
    topPerksEn: [
      '30,000 EUR coverage with Mideast card',
      'Financial solvency level 1',
      'Acute illness and lost luggage coverage',
    ],
  },
  {
    id: 'asia-50k-irasist',
    companyId: 'asia',
    assistanceId: 'irasist',
    coverageEur: 50000,
    basePriceToman1to7Days: 165000,
    topPerksFa: [
      'سقف ۵۰,۰۰۰ یورو با پشتیبانی کمک‌رسان ایران',
      'صدور در لحظه با کد استعلام سنهاب بیمه مرکزی',
      'تامین هزینه همراه بیمار و ارسال دارو',
    ],
    topPerksEn: [
      '50,000 EUR coverage with Irasist backing',
      'Instant policy issuance with Bimeh Markazi verification',
      'Companion travel & emergency medicine dispatch',
    ],
  },
];
