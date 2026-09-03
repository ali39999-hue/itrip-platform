import { lt, type LText } from './lt';

export type PlanId = 'flex' | 'bb' | 'saver';

export interface LocalizedRoomDef {
  id: string;
  name: LText;
  size: number;
  bed: LText;
  view: LText;
  capA: number;
  capC: number;
  base: number;
  left: number;
  art: number;
  am: LText[];
  plans: PlanId[];
}

export interface RoomDef {
  id: string;
  name: string;
  size: number;
  bed: string;
  view: string;
  capA: number;
  capC: number;
  base: number;
  left: number;
  art: number;
  am: string[];
  plans: PlanId[];
}

export const ROOMS_LOCALIZED: LocalizedRoomDef[] = [
  {
    id: 'std',
    name: { fa: 'اتاق استاندارد دو تخته', en: 'Standard Double Room', ar: 'غرفة قياسية مزدوجة', zh: '标准双人间', ru: 'Стандартный двухместный номер' },
    size: 24,
    bed: { fa: 'یک تخت دابل', en: '1 Double Bed', ar: 'سرير مزدوج', zh: '1 张双人床', ru: '1 двуспальная кровать' },
    view: { fa: 'رو به حیاط', en: 'Courtyard View', ar: 'إطلالة على الفناء', zh: '庭院景观', ru: 'Вид во внутренний двор' },
    capA: 2,
    capC: 0,
    base: 2050,
    left: 6,
    art: 1,
    am: [
      { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线网络', ru: 'Бесплатный Wi-Fi' },
      { fa: 'تهویه مطبوع', en: 'Air Conditioning', ar: 'تكييف', zh: '空调', ru: 'Кондиционер' },
      { fa: 'گاوصندوق', en: 'In-room Safe', ar: 'خزنة', zh: '保险箱', ru: 'Сейф' },
      { fa: 'حمام با وان دوش', en: 'Bathtub & Shower', ar: 'حمام مع حوض استحمام', zh: '浴缸及淋浴', ru: 'Ванна и душ' },
    ],
    plans: ['bb', 'saver'],
  },
  {
    id: 'dlx',
    name: { fa: 'اتاق دلوکس رو به بسفر', en: 'Deluxe Bosphorus View Room', ar: 'غرفة ديلوکس مطلة على البوسفور', zh: '博斯普鲁斯海景豪华房', ru: 'Номер Делюкс с видом на Босфор' },
    size: 32,
    bed: { fa: 'یک تخت کینگ', en: '1 King Bed', ar: 'سرير كينغ', zh: '1 张特大双人床', ru: '1 большая двуспальная кровать' },
    view: { fa: 'رو به بسفر', en: 'Bosphorus View', ar: 'إطلالة على البوسفور', zh: '博斯普鲁斯海峡全景', ru: 'Вид на Босфор' },
    capA: 2,
    capC: 1,
    base: 2600,
    left: 3,
    art: 0,
    am: [
      { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线网络', ru: 'Бесплатный Wi-Fi' },
      { fa: 'بالکن اختصاصی', en: 'Private Balcony', ar: 'شرفة خاصة', zh: '独立阳台', ru: 'Собственный балкон' },
      { fa: 'مینی‌بار', en: 'Mini-bar', ar: 'ميني بار', zh: '迷你吧', ru: 'Мини-бар' },
      { fa: 'ماشین قهوه‌ساز', en: 'Espresso Machine', ar: 'ماكينة قهوة', zh: '意式浓缩咖啡机', ru: 'Кофемашина' },
    ],
    plans: ['flex', 'bb', 'saver'],
  },
  {
    id: 'fam',
    name: { fa: 'اتاق خانوادگی سه تخته', en: 'Family Triple Room', ar: 'غرفة عائلية ثلاثية', zh: '三人家庭房', ru: 'Семейный трехместный номер' },
    size: 38,
    bed: { fa: 'یک کینگ و یک تک‌نفره', en: '1 King + 1 Single Bed', ar: 'سرير كينغ وسرير مفرد', zh: '1 张大床 + 1 张单人床', ru: '1 большая и 1 односпальная кровать' },
    view: { fa: 'رو به شهر قدیم', en: 'Old Town View', ar: 'إطلالة على المدينة القديمة', zh: '老城景观', ru: 'Вид на старый город' },
    capA: 3,
    capC: 1,
    base: 3150,
    left: 2,
    art: 2,
    am: [
      { fa: 'وای‌فای رایگان', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线网络', ru: 'Бесплатный Wi-Fi' },
      { fa: 'تخت اضافه رایگان', en: 'Free Extra Bed', ar: 'سرير إضافي مجاني', zh: '免费加床', ru: 'Бесплатная доп. кровать' },
      { fa: 'یخچال', en: 'Refrigerator', ar: 'ثلاجة', zh: '冰箱', ru: 'Холодильник' },
      { fa: 'دو سرویس بهداشتی', en: 'Two Bathrooms', ar: 'حمامان', zh: '双卫生间', ru: 'Два санузла' },
    ],
    plans: ['flex', 'bb'],
  },
  {
    id: 'suite',
    name: { fa: 'سوئیت جونیور تراس‌دار', en: 'Junior Suite with Terrace', ar: 'جناح جونيور مع شرفة', zh: '带露台的小型套房', ru: 'Полулюкс с террасой' },
    size: 52,
    bed: { fa: 'کینگ و مبل تختخواب‌شو', en: '1 King Bed + Sofa Bed', ar: 'سرير كينغ وأريكة سرير', zh: '特大床 + 沙发床', ru: 'Большая кровать + диван-кровать' },
    view: { fa: 'تراس رو به ایاصوفیه', en: 'Terrace facing Hagia Sophia', ar: 'شرفة مطلة على آيا صوفيا', zh: '面向圣索菲亚的露台', ru: 'Терраса с видом на Собор Святой Софии' },
    capA: 3,
    capC: 2,
    base: 4400,
    left: 2,
    art: 3,
    am: [
      { fa: 'تراس ۱۲ متری', en: '12 m² Terrace', ar: 'شرفة بمساحة 12 متر مربع', zh: '12平米露台', ru: 'Терраса 12 м²' },
      { fa: 'پذیرایی اختصاصی', en: 'Lounge Area', ar: 'صالة خاصة', zh: '贵宾酒廊待遇', ru: 'Гостиная зона' },
      { fa: 'وان جکوزی', en: 'Hot Tub / Jacuzzi', ar: 'حوض جاكوزي', zh: '按摩浴缸', ru: 'Джакузи' },
      { fa: 'ترانسفر فرودگاه رایگان', en: 'Free Airport Transfer', ar: 'نقل مجاني من المطار', zh: '免费机场接机', ru: 'Бесплатный трансфер' },
    ],
    plans: ['flex', 'bb', 'saver'],
  },
];

/** Backwards-compatible Persian ROOMS export (for existing callers). */
export const ROOMS: RoomDef[] = ROOMS_LOCALIZED.map((r) => ({
  id: r.id,
  name: r.name.fa,
  size: r.size,
  bed: r.bed.fa,
  view: r.view.fa,
  capA: r.capA,
  capC: r.capC,
  base: r.base,
  left: r.left,
  art: r.art,
  am: r.am.map((a) => a.fa),
  plans: r.plans,
}));

export function getRoomsForLocale(locale: string): RoomDef[] {
  return ROOMS_LOCALIZED.map((r) => ({
    id: r.id,
    name: lt(locale, r.name),
    size: r.size,
    bed: lt(locale, r.bed),
    view: lt(locale, r.view),
    capA: r.capA,
    capC: r.capC,
    base: r.base,
    left: r.left,
    art: r.art,
    am: r.am.map((a) => lt(locale, a)),
    plans: r.plans,
  }));
}

export const PLANS_LOCALIZED: Record<
  PlanId,
  { name: LText; meal: LText; factor: number; refund: 'free' | 'partial' | 'none'; pay: LText }
> = {
  flex: {
    name: { fa: 'نرخ انعطاف‌پذیر', en: 'Flexible Rate', ar: 'سعر مرن', zh: '灵活价格', ru: 'Гибкий тариф' },
    meal: { fa: 'صبحانه بوفه', en: 'Buffet Breakfast', ar: 'إفطار بوفيه', zh: '自助早餐', ru: 'Завтрак «шведский стол»' },
    factor: 1.12,
    refund: 'free',
    pay: { fa: 'پرداخت در هتل امکان‌پذیر است', en: 'Pay at hotel available', ar: 'الدفع في الفندق متاح', zh: '支持到店付款', ru: 'Возможна оплата в отеле' },
  },
  bb: {
    name: { fa: 'استاندارد با صبحانه', en: 'Standard Bed & Breakfast', ar: 'إقامة مع إفطار', zh: '含早餐标准价', ru: 'Стандарт с завтраком' },
    meal: { fa: 'صبحانه بوفه', en: 'Buffet Breakfast', ar: 'إفطار بوفيه', zh: '自助早餐', ru: 'Завтрак «шведский стол»' },
    factor: 1.0,
    refund: 'partial',
    pay: { fa: 'پرداخت کامل هنگام رزرو', en: 'Pay in full at booking', ar: 'الدفع كاملاً عند الحجز', zh: '预订时全额支付', ru: 'Полная оплата при бронировании' },
  },
  saver: {
    name: { fa: 'نرخ ویژه غیرقابل استرداد', en: 'Non-refundable Saver Rate', ar: 'سعر اقتصادي غير قابل للاسترداد', zh: '不可退款优惠价', ru: 'Невозвратный тариф' },
    meal: { fa: 'بدون وعده', en: 'Room only', ar: 'إقامة بدون وجبات', zh: '仅客房（无早）', ru: 'Без питания' },
    factor: 0.88,
    refund: 'none',
    pay: { fa: 'پرداخت کامل هنگام رزرو', en: 'Pay in full at booking', ar: 'الدفع كاملاً عند الحجز', zh: '预订时全额支付', ru: 'Полная оплата при бронировании' },
  },
};

export const PLANS: Record<
  PlanId,
  { name: string; meal: string; factor: number; refund: 'free' | 'partial' | 'none'; pay: string }
> = {
  flex: { name: PLANS_LOCALIZED.flex.name.fa, meal: PLANS_LOCALIZED.flex.meal.fa, factor: 1.12, refund: 'free', pay: PLANS_LOCALIZED.flex.pay.fa },
  bb: { name: PLANS_LOCALIZED.bb.name.fa, meal: PLANS_LOCALIZED.bb.meal.fa, factor: 1.0, refund: 'partial', pay: PLANS_LOCALIZED.bb.pay.fa },
  saver: { name: PLANS_LOCALIZED.saver.name.fa, meal: PLANS_LOCALIZED.saver.meal.fa, factor: 0.88, refund: 'none', pay: PLANS_LOCALIZED.saver.pay.fa },
};

export function getPlansForLocale(
  locale: string
): Record<PlanId, { name: string; meal: string; factor: number; refund: 'free' | 'partial' | 'none'; pay: string }> {
  return {
    flex: {
      name: lt(locale, PLANS_LOCALIZED.flex.name),
      meal: lt(locale, PLANS_LOCALIZED.flex.meal),
      factor: PLANS_LOCALIZED.flex.factor,
      refund: PLANS_LOCALIZED.flex.refund,
      pay: lt(locale, PLANS_LOCALIZED.flex.pay),
    },
    bb: {
      name: lt(locale, PLANS_LOCALIZED.bb.name),
      meal: lt(locale, PLANS_LOCALIZED.bb.meal),
      factor: PLANS_LOCALIZED.bb.factor,
      refund: PLANS_LOCALIZED.bb.refund,
      pay: lt(locale, PLANS_LOCALIZED.bb.pay),
    },
    saver: {
      name: lt(locale, PLANS_LOCALIZED.saver.name),
      meal: lt(locale, PLANS_LOCALIZED.saver.meal),
      factor: PLANS_LOCALIZED.saver.factor,
      refund: PLANS_LOCALIZED.saver.refund,
      pay: lt(locale, PLANS_LOCALIZED.saver.pay),
    },
  };
}

/* placeholder gallery */
export const GALLERY = [
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=70&w=1200',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=70&w=800',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=70&w=800',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=70&w=800',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=70&w=800',
];

export const DISTS_LOCALIZED: [LText, string, LText][] = [
  [{ fa: 'ایاصوفیه', en: 'Hagia Sophia', ar: 'آيا صوفيا', zh: '圣索菲亚大教堂', ru: 'Собор Святой Софии' }, 'MapPin', { fa: '۴۰۰ متر · ۵ دقیقه پیاده', en: '400 m · 5 min walk', ar: '400 م · 5 دقائق سيراً', zh: '400 米 · 步行 5 分钟', ru: '400 м · 5 мин пешком' }],
  [{ fa: 'مسجد آبی', en: 'Blue Mosque', ar: 'المسجد الأزرق', zh: '蓝色清真寺', ru: 'Голубая мечеть' }, 'MapPin', { fa: '۶۵۰ متر · ۸ دقیقه پیاده', en: '650 m · 8 min walk', ar: '650 م · 8 دقائق سيراً', zh: '650 米 · 步行 8 分钟', ru: '650 м · 8 мин пешком' }],
  [{ fa: 'ایستگاه تراموا', en: 'Tram Station', ar: 'محطة الترام', zh: '有轨电车站', ru: 'Трамвайная остановка' }, 'TrainFront', { fa: '۴۰۰ متر · ۵ دقیقه پیاده', en: '400 m · 5 min walk', ar: '400 م · 5 دقائق سيراً', zh: '400 米 · 步行 5 分钟', ru: '400 м · 5 мин пешком' }],
  [{ fa: 'بازار بزرگ', en: 'Grand Bazaar', ar: 'البازار الكبير', zh: '大巴扎', ru: 'Гранд-базар' }, 'MapPin', { fa: '۱٫۲ کیلومتر · ۱۵ دقیقه پیاده', en: '1.2 km · 15 min walk', ar: '1.2 كم · 15 دقيقة سيراً', zh: '1.2 公里 · 步行 15 分钟', ru: '1,2 км · 15 мин пешком' }],
  [{ fa: 'فرودگاه استانبول', en: 'Istanbul Airport (IST)', ar: 'مطار إسطنبول', zh: '伊斯坦布尔机场', ru: 'Аэропорт Стамбул' }, 'Building2', { fa: '۵۲ کیلومتر · ۶۰ دقیقه با خودرو', en: '52 km · 60 min by car', ar: '52 كم · 60 دقيقة بالسيارة', zh: '52 公里 · 车程 60 分钟', ru: '52 км · 60 мин на авто' }],
];

export const DISTS: [string, string, string][] = DISTS_LOCALIZED.map(([n, i, d]) => [n.fa, i, d.fa]);

export function getDistsForLocale(locale: string): [string, string, string][] {
  return DISTS_LOCALIZED.map(([n, i, d]) => [lt(locale, n), i, lt(locale, d)]);
}

export const CATS_LOCALIZED: [LText, number][] = [
  [{ fa: 'نظافت', en: 'Cleanliness', ar: 'النظافة', zh: '清洁度', ru: 'Чистота' }, 9.4],
  [{ fa: 'موقعیت', en: 'Location', ar: 'الموقع', zh: '地理位置', ru: 'Расположение' }, 9.7],
  [{ fa: 'کارکنان', en: 'Staff', ar: 'طاقم العمل', zh: '员工服务', ru: 'Персонал' }, 9.3],
  [{ fa: 'امکانات', en: 'Facilities', ar: 'المرافق', zh: '设施', ru: 'Удобства' }, 8.9],
  [{ fa: 'ارزش خرید', en: 'Value for money', ar: 'القيمة مقابل السعر', zh: '性价比', ru: 'Цена/качество' }, 8.6],
  [{ fa: 'وای‌فای', en: 'Free Wi-Fi', ar: 'واي فاي مجاني', zh: '免费无线网', ru: 'Wi-Fi' }, 9.1],
];

export const CATS: [string, number][] = CATS_LOCALIZED.map(([c, s]) => [c.fa, s]);

export function getCatsForLocale(locale: string): [string, number][] {
  return CATS_LOCALIZED.map(([c, s]) => [lt(locale, c), s]);
}

export const REVIEWS_LOCALIZED = [
  {
    n: { fa: 'مریم', en: 'Maryam' },
    t: { fa: 'خانواده', en: 'Family' },
    c: { fa: 'ایران', en: 'Iran' },
    d: { fa: 'مرداد ۱۴۰۵', en: 'August 2026' },
    s: 9.6,
    good: {
      fa: 'موقعیت واقعاً بی‌نظیر بود؛ صبح پیاده تا ایاصوفیه رفتیم. صبحانه تراس با آن منظره ارزش بیدار شدن زود را داشت.',
      en: 'The location was truly unbeatable — we walked to Hagia Sophia in the morning. Breakfast on the terrace with that view was worth waking up early.',
    },
    bad: {
      fa: 'آسانسور برای شش طبقه کم است و صبح‌ها باید صبر کرد.',
      en: 'One elevator for six floors is tight; there is a brief wait in the mornings.',
    },
  },
  {
    n: { fa: 'احمد', en: 'Ahmet' },
    t: { fa: 'کاری', en: 'Business' },
    c: { fa: 'ترکیه', en: 'Turkey' },
    d: { fa: 'مرداد ۱۴۰۵', en: 'August 2026' },
    s: 9.0,
    good: {
      fa: 'اتاق ساکت بود و اینترنت برای جلسات آنلاین پایدار. پذیرش سریع و حرفه‌ای.',
      en: 'Quiet room with reliable Wi-Fi for remote meetings. Fast and professional front desk.',
    },
    bad: {
      fa: 'پارکینگ ندارد و باید از پارکینگ عمومی نزدیک استفاده کنید.',
      en: 'No on-site parking; you have to use a paid garage nearby.',
    },
  },
  {
    n: { fa: 'سعید', en: 'Saeed' },
    t: { fa: 'زوج', en: 'Couple' },
    c: { fa: 'ایران', en: 'Iran' },
    d: { fa: 'تیر ۱۴۰۵', en: 'July 2026' },
    s: 8.8,
    good: {
      fa: 'اتاق دلوکس رو به بسفر دقیقاً همان چیزی بود که در عکس‌ها دیدیم. پرداخت ریالی کار را خیلی راحت کرد.',
      en: 'The Deluxe Bosphorus room was exactly as pictured. Paying in local currency made it effortless.',
    },
    bad: {
      fa: 'قیمت شب‌های آخر هفته محسوس بالاتر است.',
      en: 'Weekend rates are noticeably higher.',
    },
  },
  {
    n: { fa: 'لیلا', en: 'Layla' },
    t: { fa: 'خانواده', en: 'Family' },
    c: { fa: 'امارات', en: 'UAE' },
    d: { fa: 'تیر ۱۴۰۵', en: 'July 2026' },
    s: 9.4,
    good: {
      fa: 'اتاق خانوادگی جادار بود و کارکنان برای بچه‌ها تخت اضافه بدون هزینه گذاشتند.',
      en: 'Spacious family room. The team added an extra bed for the kids at no additional charge.',
    },
    bad: {
      fa: 'استخر کوچک است و بعدازظهرها شلوغ می‌شود.',
      en: 'The pool is on the smaller side and gets lively in the afternoon.',
    },
  },
  {
    n: { fa: 'رضا', en: 'Reza' },
    t: { fa: 'تنها', en: 'Solo' },
    c: { fa: 'ایران', en: 'Iran' },
    d: { fa: 'خرداد ۱۴۰۵', en: 'June 2026' },
    s: 8.2,
    good: {
      fa: 'برای اقامت کوتاه عالی بود، تراموا نزدیک و همه‌جا در دسترس.',
      en: 'Ideal for a short stay. Tram is right next door and everything is reachable.',
    },
    bad: {
      fa: 'اتاق استاندارد رو به حیاط کمی تاریک است.',
      en: 'The courtyard standard room gets modest natural light.',
    },
  },
];

export const REVIEWS = REVIEWS_LOCALIZED.map((r) => ({
  n: r.n.fa,
  t: r.t.fa,
  c: r.c.fa,
  d: r.d.fa,
  s: r.s,
  good: r.good.fa,
  bad: r.bad.fa,
}));

export function getReviewsForLocale(locale: string) {
  return REVIEWS_LOCALIZED.map((r) => ({
    n: lt(locale, r.n),
    t: lt(locale, r.t),
    c: lt(locale, r.c),
    d: lt(locale, r.d),
    s: r.s,
    good: lt(locale, r.good),
    bad: lt(locale, r.bad),
  }));
}

export const FAQS_LOCALIZED: [LText, LText][] = [
  [
    {
      fa: 'آیا می‌توانم از ایران و با کارت بانکی ایرانی پرداخت کنم؟',
      en: 'Can I pay with local cards or multi-currency wallets?',
      ar: 'هل يمكنني الدفع بالبطاقات المحلية أو المحافظ متعددة العملات؟',
      zh: '是否支持多币种钱包或主流借记卡结算？',
      ru: 'Можно ли оплатить местной картой или мультивалютным кошельком?',
    },
    {
      fa: 'بله. مبلغ نهایی به لیر محاسبه و از طریق درگاه ریالی Firuzo دریافت می‌شود. تسویه با هتل بر عهده Firuzo است و نیازی به کارت بین‌المللی ندارید.',
      en: 'Yes. The final amount is settled through the Firuzo gateway or wallet. We handle hotel remittance directly — no foreign bank card required.',
      ar: 'نعم. تتم التسوية عبر بوابة Firuzo أو المحفظة. نقوم بالتحويل للفندق مباشرة دون الحاجة لبطاقة دولية.',
      zh: '是的。结算通过 Firuzo 网关或钱包完成，我们直接向酒店汇款，无需国际信用卡。',
      ru: 'Да. Оплата проходит через шлюз Firuzo или кошелёк. Мы рассчитываемся с отелем напрямую — международная карта не требуется.',
    },
  ],
  [
    {
      fa: 'اگر پروازم تغییر کند و دیر برسم چه می‌شود؟',
      en: 'What happens if my flight is delayed and I arrive late?',
      ar: 'ماذا لو تأخرت رحلتي ووصلت في وقت متأخر؟',
      zh: '如果航班延误导致晚到会怎样？',
      ru: 'Что делать, если рейс задержался и я приеду поздно?',
    },
    {
      fa: 'پذیرش هتل ۲۴ ساعته است. ساعت تقریبی ورود را در مرحله پرداخت ثبت کنید تا اتاق نگه داشته شود.',
      en: 'The front desk is open 24/7. Mention your estimated arrival time during checkout so the room is held.',
      ar: 'مكتب الاستقبال يعمل على مدار 24 ساعة. سجّل موعد وصولك التقريبي عند الحجز لضمان حفظ الغرفة.',
      zh: '前台 24 小时值班。请在结账时注明预计到达时间，酒店将保留房间。',
      ru: 'Стойка регистрации работает круглосуточно. Укажите ориентировочное время заезда при бронировании.',
    },
  ],
  [
    {
      fa: 'هزینه کودک ۷ ساله چگونه حساب می‌شود؟',
      en: 'How are children charged?',
      ar: 'كيف تُحسب رسوم الأطفال؟',
      zh: '儿童如何收费？',
      ru: 'Как рассчитывается стоимость проживания детей?',
    },
    {
      fa: 'در اتاق‌هایی که ظرفیت کودک دارند رایگان است؛ در غیر این صورت شبی ۳۵۰ لیر تخت اضافه به‌صورت خودکار محاسبه می‌شود.',
      en: 'Children within the room capacity stay free of charge. An extra bed can be added during room selection if needed.',
      ar: 'إقامة الأطفال ضمن سعة الغرفة مجانية. يمكن إضافة سرير إضافي عند اختيار الغرفة إذا لزم الأمر.',
      zh: '在房间容纳人数内的儿童免费入住。如需加床，可在选房时一键添加。',
      ru: 'Дети в пределах вместимости номера проживают бесплатно. При необходимости можно добавить доп. кровать.',
    },
  ],
  [
    {
      fa: 'نرخ غیرقابل استرداد چه تفاوتی دارد؟',
      en: 'What is the difference with the non-refundable rate?',
      ar: 'ما هو الفرق في السعر غير القابل للاسترداد؟',
      zh: '不可退款价格有何不同？',
      ru: 'Чем отличается невозвратный тариф?',
    },
    {
      fa: 'حدود ۱۲ درصد ارزان‌تر است اما پس از پرداخت قابل لغو یا تغییر نیست. اگر برنامه سفرتان قطعی نیست، نرخ انعطاف‌پذیر انتخاب بهتری است.',
      en: 'It is roughly 12% cheaper, but cannot be refunded or rescheduled once confirmed. If your plans are tentative, choose the Flexible Rate.',
      ar: 'هو أرخص بنحو 12٪، لكنه غير قابل للإلغاء بعد الدفع. إذا لم تكن خطتك مؤكدة، فالخيار المرن أفضل.',
      zh: '约享 12% 优惠，但确认后不可退款或改期。若行程尚未敲定，建议选择灵活价格。',
      ru: 'Он примерно на 12% дешевле, но после подтверждения не подлежит отмене. Если планы могут измениться, выберите гибкий тариф.',
    },
  ],
];

export const FAQS: [string, string][] = FAQS_LOCALIZED.map(([q, a]) => [q.fa, a.fa]);

export function getFaqsForLocale(locale: string): [string, string][] {
  return FAQS_LOCALIZED.map(([q, a]) => [lt(locale, q), lt(locale, a)]);
}
