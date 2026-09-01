import type { CountryId } from './countries';

/* ============================================================
   سرویس مترجم همراه — ۴ سطح با قیمت شفاف
   سطح ۱: همراه تمام‌وقت (روزانه) · سطح ۲: ساعتی/بخشی (add-on)
   سطح ۳: تماس فوری SOS · سطح ۴: کیت خودیاری رایگان
   ============================================================ */

export type InterpreterSpecialty = 'tourism' | 'business' | 'medical' | 'pilgrimage';

export interface InterpreterProfile {
  id: string;
  name: string;
  nameEn: string;
  langs: string[];
  specialty: InterpreterSpecialty;
  rating: number;
  reviews: number;
  baseCity: string;
  baseCityEn: string;
  countries: CountryId[];
}

export const INTERPRETER_PRICING = {
  /** سطح ۱ — همراه تمام‌وقت، به ازای هر مترجم */
  fullDay: 4_800_000,
  /** سطح ۲ — ساعتی (حداقل ۲ ساعت) */
  hourly: 900_000,
  minHours: 2,
  /** سطح ۳ — تماس فوری SOS */
  sosPerCall: 250_000,
  sosMinutes: 10,
  /** اجاره ست ویسپرینگ (میکروفون + تا ۲۰ هدفون) روزانه */
  whisperSetPerDay: 4_500_000,
  whisperMaxGroup: 20,
} as const;

export const INTERPRETERS: InterpreterProfile[] = [
  { id: 'int1', name: 'مریم احمدی', nameEn: 'Maryam Ahmadi', langs: ['فارسی', 'انگلیسی', 'عربی'], specialty: 'tourism', rating: 4.9, reviews: 212, baseCity: 'تهران', baseCityEn: 'Tehran', countries: ['iran', 'turkey', 'uae'] },
  { id: 'int2', name: 'رضا کریمی', nameEn: 'Reza Karimi', langs: ['فارسی', 'انگلیسی', 'ترکی'], specialty: 'business', rating: 4.8, reviews: 164, baseCity: 'استانبول', baseCityEn: 'Istanbul', countries: ['turkey', 'uae'] },
  { id: 'int3', name: 'النا پترووا', nameEn: 'Elena Petrova', langs: ['روسی', 'انگلیسی', 'فارسی'], specialty: 'medical', rating: 4.9, reviews: 301, baseCity: 'مسکو', baseCityEn: 'Moscow', countries: ['russia', 'turkey'] },
  { id: 'int4', name: 'عمر حسن‌اف', nameEn: 'Omar Hasanov', langs: ['ترکی', 'عربی', 'فارسی'], specialty: 'tourism', rating: 4.7, reviews: 98, baseCity: 'استانبول', baseCityEn: 'Istanbul', countries: ['turkey', 'georgia'] },
  { id: 'int5', name: 'نیلوفر رستمی', nameEn: 'Niloufar Rostami', langs: ['فارسی', 'انگلیسی', 'آلمانی'], specialty: 'medical', rating: 4.8, reviews: 143, baseCity: 'استانبول', baseCityEn: 'Istanbul', countries: ['turkey', 'iran'] },
  { id: 'int6', name: 'گئورگی ملادزه', nameEn: 'Giorgi Meladze', langs: ['گرجی', 'انگلیسی', 'فارسی'], specialty: 'tourism', rating: 4.8, reviews: 77, baseCity: 'تفلیس', baseCityEn: 'Tbilisi', countries: ['georgia'] },
  { id: 'int7', name: 'سلیم البلوشی', nameEn: 'Salem Al-Balushi', langs: ['عربی', 'انگلیسی', 'فارسی'], specialty: 'business', rating: 4.9, reviews: 120, baseCity: 'دبی', baseCityEn: 'Dubai', countries: ['uae', 'oman'] },
  { id: 'int8', name: 'فاطمه موسوی', nameEn: 'Fatemeh Mousavi', langs: ['فارسی', 'عربی', 'انگلیسی'], specialty: 'pilgrimage', rating: 5.0, reviews: 340, baseCity: 'مشهد', baseCityEn: 'Mashhad', countries: ['iran'] },
];

export const SPECIALTY_LABEL: Record<InterpreterSpecialty, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
  tourism: { fa: 'گردشگری', en: 'Tourism', ar: 'السياحة', zh: '旅游观光', ru: 'Туризм' },
  business: { fa: 'تجاری', en: 'Business', ar: 'الأعمال والتجارة', zh: '商务考察', ru: 'Бизнес' },
  medical: { fa: 'درمانی', en: 'Medical', ar: 'العلاج والصحة', zh: '医疗看护', ru: 'Медицина' },
  pilgrimage: { fa: 'زیارتی', en: 'Pilgrimage', ar: 'الزيارة الدينية', zh: '朝圣朝拜', ru: 'Паломничество' },
};

/* ------------------------------------------------------------
   استاندارد نسبت مترجم به گروه (بر پایه شوشوتاژ/ویسپرینگ)
   ≤۴ نفر: بدون تجهیزات · ۵–۲۰: ست ویسپرینگ · ۲۰+: مترجم دوم
   ------------------------------------------------------------ */
export interface InterpreterGroupPlan {
  interpreters: number;
  whisperSet: boolean;
  bigGroup: boolean;
  /** توضیح فارسی برای نمایش */
  noteFa: string;
  noteEn: string;
  /** هزینه روزانه کل (مترجم‌ها + تجهیزات) */
  dailyTotal: number;
}

export function interpreterGroupPlan(groupSize: number): InterpreterGroupPlan {
  const { fullDay, whisperSetPerDay, whisperMaxGroup } = INTERPRETER_PRICING;
  const interpreters = Math.max(1, Math.ceil(groupSize / whisperMaxGroup));
  const whisperSet = groupSize >= 5;
  const bigGroup = groupSize > whisperMaxGroup;
  let noteFa: string;
  let noteEn: string;
  if (groupSize <= 4) {
    noteFa = 'مترجم خصوصی کنار شما — بدون تجهیزات، مکالمه مستقیم (ایده‌آل تا ۴ نفر)';
    noteEn = 'Private interpreter beside you — no equipment, direct conversation (ideal up to 4)';
  } else if (groupSize <= whisperMaxGroup) {
    noteFa = `۱ مترجم + ست ویسپرینگ (میکروفون بی‌سیم + هدفون برای هر نفر) — استاندارد تورهای تا ${whisperMaxGroup} نفر`;
    noteEn = `1 interpreter + whisper system (wireless mic + headset each) — standard for groups up to ${whisperMaxGroup}`;
  } else {
    noteFa = `${interpreters} مترجم هم‌زمان + ست ویسپرینگ — برای گروه‌های بزرگ‌تر از ${whisperMaxGroup} نفر، یک گاید محلی بومی‌زبان هم پیشنهاد می‌شود`;
    noteEn = `${interpreters} interpreters + whisper system — for groups over ${whisperMaxGroup}, a local native guide is also recommended`;
  }
  return {
    interpreters,
    whisperSet,
    bigGroup,
    noteFa,
    noteEn,
    dailyTotal: interpreters * fullDay + (whisperSet ? whisperSetPerDay : 0),
  };
}

/* ------------------------------------------------------------
   کیت خودیاری (سطح ۴) — عبارات پرکاربرد
   ------------------------------------------------------------ */
export interface Phrase {
  fa: string;
  local: string;
  translit: string;
}

export const PHRASEBOOK: Record<'ar' | 'ru' | 'tr' | 'ka', { label: string; labelEn: string; flag: string; phrases: Phrase[] }> = {
  ar: {
    label: 'عربی', labelEn: 'Arabic', flag: '🇦🇪',
    phrases: [
      { fa: 'سلام', local: 'مرحبا', translit: 'marhaban' },
      { fa: 'چقدر است؟', local: 'بكم هذا؟', translit: 'bikam hadha?' },
      { fa: 'کمک!', local: 'مساعدة!', translit: 'musāʿada!' },
      { fa: 'بیمارستان کجاست؟', local: 'أين المستشفى؟', translit: 'ayna al-mustashfā?' },
      { fa: 'پلیس', local: 'الشرطة', translit: 'al-shurṭa' },
      { fa: 'متشکرم', local: 'شكراً', translit: 'shukran' },
    ],
  },
  ru: {
    label: 'روسی', labelEn: 'Russian', flag: '🇷🇺',
    phrases: [
      { fa: 'سلام', local: 'Здравствуйте', translit: 'zdravstvuyte' },
      { fa: 'چقدر است؟', local: 'Сколько стоит?', translit: 'skol’ko stoit?' },
      { fa: 'کمک!', local: 'Помогите!', translit: 'pomogite!' },
      { fa: 'بیمارستان کجاست؟', local: 'Где больница?', translit: 'gde bol’nitsa?' },
      { fa: 'پلیس', local: 'Полиция', translit: 'politsiya' },
      { fa: 'متشکرم', local: 'Спасибо', translit: 'spasibo' },
    ],
  },
  tr: {
    label: 'ترکی', labelEn: 'Turkish', flag: '🇹🇷',
    phrases: [
      { fa: 'سلام', local: 'Merhaba', translit: 'merhaba' },
      { fa: 'چقدر است؟', local: 'Ne kadar?', translit: 'ne kadar?' },
      { fa: 'کمک!', local: 'İmdat!', translit: 'imdat!' },
      { fa: 'بیمارستان کجاست؟', local: 'Hastane nerede?', translit: 'hastane nerede?' },
      { fa: 'پلیس', local: 'Polis', translit: 'polis' },
      { fa: 'متشکرم', local: 'Teşekkürler', translit: 'teşekkürler' },
    ],
  },
  ka: {
    label: 'گرجی', labelEn: 'Georgian', flag: '🇬🇪',
    phrases: [
      { fa: 'سلام', local: 'გამარჯობა', translit: 'gamarjoba' },
      { fa: 'چقدر است؟', local: 'რამდენი ღირს?', translit: 'ramdeni ghirs?' },
      { fa: 'کمک!', local: 'დამეხმარეთ!', translit: 'damekhmareth!' },
      { fa: 'بیمارستان کجاست؟', local: 'საავადმყოფო სად არის?', translit: 'saavadmqopo sad aris?' },
      { fa: 'پلیس', local: 'პოლიცია', translit: 'politsia' },
      { fa: 'متشکرم', local: 'მადლობა', translit: 'madloba' },
    ],
  },
};
