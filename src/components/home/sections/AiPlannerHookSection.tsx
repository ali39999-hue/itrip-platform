'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight,
  MapPin, 
  Wallet, 
  Plane, 
  BedDouble, 
  CheckCircle2, 
  Zap, 
  Compass, 
  ShieldCheck
} from 'lucide-react';
import { lt } from '@/lib/lt';

type DestinationType = 'iran' | 'turkey' | 'uae' | 'georgia' | 'russia' | 'oman' | 'china';
type WhoType = 'solo' | 'duo' | 'family' | 'friends';
type BudgetType = 'economy' | 'balanced' | 'luxury';

export function AiPlannerHookSection() {
  const t = useTranslations('Home');
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'fa' || locale === 'ar';

  const [prompt, setPrompt] = useState('');
  const [selectedDest, setSelectedDest] = useState<DestinationType>('turkey');
  const [selectedDays, setSelectedDays] = useState(4);
  const [selectedWho, setSelectedWho] = useState<WhoType>('family');
  const [selectedBudget, setSelectedBudget] = useState<BudgetType>('balanced');

  const destinations = [
    { id: 'iran', flag: '🇮🇷', name: lt(locale, { fa: 'ایران', en: 'Iran', ar: 'إيران', zh: '伊朗', ru: 'Иран' }) },
    { id: 'turkey', flag: '🇹🇷', name: lt(locale, { fa: 'ترکیه', en: 'Turkey', ar: 'تركيا', zh: '土耳其', ru: 'Турция' }) },
    { id: 'uae', flag: '🇦🇪', name: lt(locale, { fa: 'امارات', en: 'UAE', ar: 'الإمارات', zh: '阿联酋', ru: 'ОАЭ' }) },
    { id: 'georgia', flag: '🇬🇪', name: lt(locale, { fa: 'گرجستان', en: 'Georgia', ar: 'جورجيا', zh: '格鲁吉亚', ru: 'Грузия' }) },
    { id: 'russia', flag: '🇷🇺', name: lt(locale, { fa: 'روسیه', en: 'Russia', ar: 'روسيا', zh: '俄罗斯', ru: 'Россия' }) },
    { id: 'oman', flag: '🇴🇲', name: lt(locale, { fa: 'عمان', en: 'Oman', ar: 'عُمان', zh: '阿曼', ru: 'Оман' }) },
  ] as const;

  const samplePrompts = [
    {
      title: lt(locale, {
        fa: 'سفر ۴ روزه خانوادگی به استانبول با هتل ۵ ستاره',
        en: '4-day family trip to Istanbul with 5-star hotel',
        ar: 'رحلة عائلية 4 أيام إلى إسطنبول بفندق 5 نجوم',
        zh: '伊斯坦布尔4日家庭游（五星级酒店）',
        ru: '4-дневная семейная поездка в Стамбул в 5* отель',
      }),
      dest: 'turkey',
      days: 4,
      who: 'family',
      budget: 'luxury',
    },
    {
      title: lt(locale, {
        fa: 'تور اقتصادی ۳ روزه به اصفهان و شیراز برای زوج‌ها',
        en: '3-day economy trip to Isfahan & Shiraz for couples',
        ar: 'رحلة اقتصادية 3 أيام إلى أصفهان وشيراز للأزواج',
        zh: '伊斯法罕和设拉子3日经济型情侣游',
        ru: '3-дневный эконом-тур в Исфахан и Шираз для пар',
      }),
      dest: 'iran',
      days: 3,
      who: 'duo',
      budget: 'economy',
    },
    {
      title: lt(locale, {
        fa: 'سفر تفریحی و خرید ۵ روزه به دبی با ترانسفر فرودگاهی',
        en: '5-day leisure & shopping trip to Dubai with airport transfer',
        ar: 'رحلة ترفيهية وتسوق 5 أيام في دبي مع نقل المطار',
        zh: '迪拜5日休闲购物游含接送机',
        ru: '5-дневный шоппинг и отдых в Дубае с трансфером',
      }),
      dest: 'uae',
      days: 5,
      who: 'friends',
      budget: 'balanced',
    },
  ];

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (prompt.trim()) {
      router.push(`/plan?q=${encodeURIComponent(prompt.trim())}`);
    } else {
      router.push(`/plan?dest=${selectedDest}&days=${selectedDays}&who=${selectedWho}&bud=${selectedBudget}`);
    }
  };

  const previewCards: Record<string, { city: string; hotel: string; spots: string[]; price: string }> = {
    turkey: {
      city: lt(locale, { fa: 'استانبول، ترکیه', en: 'Istanbul, Turkey', ar: 'إسطنبول، تركيا', zh: '土耳其伊斯坦布尔', ru: 'Стамбул, Турция' }),
      hotel: lt(locale, { fa: 'هتل ۵ ستاره الیت ورد تقسیم', en: 'Elite World Taksim 5*', ar: 'فندق إيليت وورلد تقسيم 5*', zh: '塔克西姆精英世界五星级酒店', ru: 'Отель Elite World Taksim 5*' }),
      spots: [
        lt(locale, { fa: 'پرواز مستقیم رفت و برگشت با ایرلاین ترکیش', en: 'Round-trip direct flight with Turkish Airlines', ar: 'طيران مباشر ذهاب وعودة مع الخطوط التركية', zh: '土耳其航空直飞往返机票', ru: 'Прямой перелет Turkish Airlines' }),
        lt(locale, { fa: 'گشت تاریخی ایاصوفیه و کاخ توپکاپی', en: 'Hagia Sophia & Topkapi Palace tour', ar: 'جولة آيا صوفيا وقصر توبكابي التاريخي', zh: '圣索菲亚与托普卡帕宫游览', ru: 'Тур по Собору Святой Софии и дворцу Топкапы' }),
        lt(locale, { fa: 'کروز اختصاصی در تنگه بسفر در غروب آفتاب', en: 'Sunset private cruise on the Bosphorus strait', ar: 'رحلة بحرية خاصة في مضيق البوسفور عند الغروب', zh: '博斯普鲁斯海峡日落私人游船', ru: 'Круиз на закате по Босфору' }),
        lt(locale, { fa: 'ترانسفر VIP فرودگاهی رفت و برگشت', en: 'Roundtrip VIP airport transfer', ar: 'توصيل VIP من وإلى المطار', zh: '往返机场 VIP 接送', ru: 'VIP трансфер из/в аэропорт' }),
      ],
      price: lt(locale, { fa: 'از ۱۹,۸۰۰,۰۰۰ تومان', en: 'From 19,800,000 Toman', ar: 'من 19,800,000 تومان', zh: '起价 19,800,000 图曼', ru: 'От 19 800 000 туманов' }),
    },
    iran: {
      city: lt(locale, { fa: 'اصفهان و شیراز، ایران', en: 'Isfahan & Shiraz, Iran', ar: 'أصفهان وشيراز، إيران', zh: '伊朗伊斯法罕与设拉子', ru: 'Исфахан и Шираз, Иран' }),
      hotel: lt(locale, { fa: 'بوتیک هتل سنتی قصر منشی اصفهان', en: 'Ghasr Monshi Traditional Boutique Hotel', ar: 'فندق قصر منشي التراثي في أصفهان', zh: '伊斯法罕卡斯尔蒙希传统精品酒店', ru: 'Традиционный бутик-отель Ghasr Monshi' }),
      spots: [
        lt(locale, { fa: 'بلیط پرواز داخلی یا قطار سریع‌السیر', en: 'Domestic flight or high-speed express train', ar: 'تذكرة طيران داخلي أو قطار سريع', zh: '国内机票或高铁票', ru: 'Внутренний перелет или скоростной поезд' }),
        lt(locale, { fa: 'دیدار از میدان نقش جهان و عمارت عالی‌قاپو', en: 'Naqsh-e Jahan Square & Ali Qapu Palace', ar: 'زيارة ساحة نقش جهان وقصر عالي قابو', zh: '伊玛目广场与阿里卡普宫', ru: 'Площадь Накш-э Джахан и дворец Али-Капу' }),
        lt(locale, { fa: 'گشت تخت جمشید و آرامگاه حافظ با راهنما', en: 'Persepolis & Hafez tomb guided tour', ar: 'جولة برسبوليس وضريح حافظ مع مرشد', zh: '波斯波利斯与哈菲兹墓导览游', ru: 'Экскурсия в Персеполь и мавзолей Хафиза' }),
      ],
      price: lt(locale, { fa: 'از ۷,۴۰۰,۰۰۰ تومان', en: 'From 7,400,000 Toman', ar: 'من 7,400,000 تومان', zh: '起价 7,400,000 图曼', ru: 'От 7 400 000 туманов' }),
    },
    uae: {
      city: lt(locale, { fa: 'دبی، امارات متحده', en: 'Dubai, United Arab Emirates', ar: 'دبي، الإمارات العربية المتحدة', zh: '阿联酋迪拜', ru: 'Дубай, ОАЭ' }),
      hotel: lt(locale, { fa: 'هتل ۵ ستاره ادرس دبی مال', en: 'Address Dubai Mall 5*', ar: 'فندق أدرس دبي مول 5 نجوم', zh: '迪拜购物中心地标五星级酒店', ru: 'Отель Address Dubai Mall 5*' }),
      spots: [
        lt(locale, { fa: 'پرواز رفت و برگشت هواپیمایی امارات یا ماهان', en: 'Round-trip flight via Emirates or Mahan', ar: 'رحلة ذهاب وعودة عبر طيران الإمارات أو ماهان', zh: '阿联酋航空或马汉航空往返机票', ru: 'Перелет туда-обратно Emirates или Mahan' }),
        lt(locale, { fa: 'سافاری بیابانی VIP با شام باربیکیو و شترسواری', en: 'VIP Desert Safari with BBQ dinner & camel ride', ar: 'سفاري صحراوي VIP مع عشاء مشاوي وركوب الجمال', zh: 'VIP 沙漠冲沙含烧烤晚餐与骑骆驼', ru: 'VIP сафари по пустыне с ужином и катанием на верблюдах' }),
        lt(locale, { fa: 'بلیط اختصاصی طبقات بالای برج خلیفه', en: 'Burj Khalifa Top Floors Exclusive Entry', ar: 'تذكرة خاصة للأدوار العليا في برج خليفة', zh: '哈利法塔观景台专属入场券', ru: 'Билет на смотровую площадку Бурдж-Халифа' }),
      ],
      price: lt(locale, { fa: 'از ۲۴,۵۰۰,۰۰۰ تومان', en: 'From 24,500,000 Toman', ar: 'من 24,500,000 تومان', zh: '起价 24,500,000 图曼', ru: 'От 24 500 000 туманов' }),
    },
    georgia: {
      city: lt(locale, { fa: 'تفلیس، گرجستان', en: 'Tbilisi, Georgia', ar: 'تبليسي، جورجيا', zh: '格鲁吉亚第比利斯', ru: 'Тбилиси, Грузия' }),
      hotel: lt(locale, { fa: 'هتل ۴ ستاره بوتیک رادیسون رد تفلیس', en: 'Radisson RED Tbilisi 4*', ar: 'فندق راديسون ريد تبليسي 4 نجوم', zh: '第比利斯丽笙红标四星级酒店', ru: 'Отель Radisson RED Tbilisi 4*' }),
      spots: [
        lt(locale, { fa: 'پرواز مستقیم تهران - تفلیس', en: 'Direct flight Tehran - Tbilisi', ar: 'طيران مباشر طهران - تبليسي', zh: '德黑兰至第比利斯直飞航班', ru: 'Прямой перелет Тегеран - Тбилиси' }),
        lt(locale, { fa: 'تله‌کابین تفلیس و بازدید از قلعه ناریکالا', en: 'Tbilisi Cable Car & Narikala Fortress visit', ar: 'تلفريك تبليسي وزيارة قلعة ناريكالا', zh: '第比利斯缆车与纳里卡拉要塞', ru: 'Канатная дорога Тбилиси и крепость Нарикала' }),
        lt(locale, { fa: 'تور یک‌روزه کوه‌های کازبگی و کلیسای گرگتی', en: 'Kazbegi mountains & Gergeti Trinity church day trip', ar: 'رحلة يوم كامل لجبال كازبيجي وكنيسة جرجيتي', zh: '卡兹别克雪山与格尔盖蒂教堂一日游', ru: 'Однодневный тур в горы Казбеги и храм Гергети' }),
      ],
      price: lt(locale, { fa: 'از ۱۴,۲۰۰,۰۰۰ تومان', en: 'From 14,200,000 Toman', ar: 'من 14,200,000 تومان', zh: '起价 14,200,000 图曼', ru: 'От 14 200 000 туманов' }),
    },
    russia: {
      city: lt(locale, { fa: 'مسکو و سن‌پترزبورگ، روسیه', en: 'Moscow & Saint Petersburg, Russia', ar: 'موسكو وسانت بطرسبرغ، روسيا', zh: '俄罗斯莫斯科与圣彼得堡', ru: 'Москва и Санкт-Петербург, Россия' }),
      hotel: lt(locale, { fa: 'هتل ۵ ستاره هیلتون لنینگرادسکایا مسکو', en: 'Hilton Moscow Leningradskaya 5*', ar: 'فندق هيلتون لينينغرادسكايا موسكو 5 نجوم', zh: '莫斯科列宁格勒希尔顿五星级酒店', ru: 'Hilton Moscow Leningradskaya 5*' }),
      spots: [
        lt(locale, { fa: 'پرواز مستقیم ماهان یا ایرفلوت', en: 'Direct flight via Mahan or Aeroflot', ar: 'طيران مباشر ماهان أو إيروفلوت', zh: '马汉或俄航直飞航线', ru: 'Прямой рейс Mahan или Аэрофлот' }),
        lt(locale, { fa: 'گشت میدان سرخ، کاخ کرملین و متروی تاریخی مسکو', en: 'Red Square, Kremlin & historic Moscow Metro', ar: 'الساحة الحمراء، الكرملين ومترو موسكو التاريخي', zh: '红场、克里姆林宫及历史地铁游览', ru: 'Красная площадь, Кремль и историческое метро' }),
      ],
      price: lt(locale, { fa: 'از ۳۱,۰۰۰,۰۰۰ تومان', en: 'From 31,000,000 Toman', ar: 'من 31,000,000 تومان', zh: '起价 31,000,000 图曼', ru: 'От 31 000 000 туманов' }),
    },
    oman: {
      city: lt(locale, { fa: 'مسقط، سلطنت عمان', en: 'Muscat, Oman', ar: 'مسقط، سلطنة عُمان', zh: '阿曼马斯喀特', ru: 'Маскат, Оман' }),
      hotel: lt(locale, { fa: 'هتل ساحلی کمپینسکی مسقط', en: 'Kempinski Hotel Muscat 5*', ar: 'فندق كمبينسكي مسقط الشاطئي 5 نجوم', zh: '马斯喀特凯宾斯基海滨五星级酒店', ru: 'Отель Kempinski Hotel Muscat 5*' }),
      spots: [
        lt(locale, { fa: 'پرواز مستقیم قشم ایر یا عمان ایر', en: 'Direct flight via Qeshm Air or Oman Air', ar: 'طيران مباشر قشم إير أو الطيران العماني', zh: '阿曼航空或格什姆航空直飞', ru: 'Прямой рейс Oman Air или Qeshm Air' }),
        lt(locale, { fa: 'تور دلفین‌ها در اقیانوس و غواصی در بندر خیران', en: 'Dolphin watching & snorkeling in Bandar Khairan', ar: 'جولة مشاهدة الدلافين والغطس في بندر الخيران', zh: '观海豚与班达尔海兰浮潜游', ru: 'Наблюдение за дельфинами и снорклинг' }),
      ],
      price: lt(locale, { fa: 'از ۲۱,۵۰۰,۰۰۰ تومان', en: 'From 21,500,000 Toman', ar: 'من 21,500,000 تومان', zh: '起价 21,500,000 图曼', ru: 'От 21 500 000 туманов' }),
    },
  };

  const currentPreview = previewCards[selectedDest] || previewCards.turkey;

  return (
    <section 
      aria-label="AI Travel Planner Hero"
      className="w-full relative overflow-hidden py-10 md:py-14 px-3 sm:px-6 md:px-10 bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 text-white rounded-3xl mx-auto max-w-[1440px] shadow-2xl border border-teal-500/20"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 end-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Header Badge & Titles */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-extrabold shadow-sm backdrop-blur-md animate-pulse">
            <Sparkles size={15} className="text-amber-300" />
            <span>{t('aiPlannerBadge')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-[1.25] text-white">
            {t('aiPlannerTitle')}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            {t('aiPlannerSubtitle')}
          </p>
        </div>

        {/* AI Prompt Input Bar */}
        <form onSubmit={handleGenerate} className="max-w-3xl mx-auto relative group">
          <div className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/20 transition-all">
            <div className="flex items-center gap-3 w-full px-3 py-2">
              <Sparkles size={20} className="text-amber-400 shrink-0 animate-bounce" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={lt(locale, {
                  fa: 'مثلاً: سفر ۴ روزه خانوادگی به استانبول با هتل ۵ ستاره و بودجه اقتصادی...',
                  en: 'E.g., 4-day family trip to Istanbul with 5-star hotel & balanced budget...',
                  ar: 'مثلاً: رحلة عائلية 4 أيام إلى إسطنبول بفندق 5 نجوم وبميزانية اقتصادية...',
                  zh: '例如：伊斯坦布尔4日家庭游，五星级酒店，预算适中...',
                  ru: 'Например: 4-дневная поездка в Стамбул с семьей в отель 5*...',
                })}
                className="w-full bg-transparent text-white placeholder:text-slate-400 text-sm md:text-base font-bold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto shrink-0 h-12 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>{t('aiPlannerCta')}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </form>

        {/* Dynamic Quick Prompt Suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          <span className="text-xs font-bold text-slate-400 me-2 flex items-center gap-1">
            <Zap size={13} className="text-amber-400" />
            {lt(locale, { fa: 'پیشنهادهای محبوب:', en: 'Popular Prompts:', ar: 'اقتراحات شائعة:', zh: '热门提示：', ru: 'Популярные запросы:' })}
          </span>
          {samplePrompts.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(sample.title);
                setSelectedDest(sample.dest as DestinationType);
                setSelectedDays(sample.days);
                setSelectedWho(sample.who as WhoType);
                setSelectedBudget(sample.budget as BudgetType);
              }}
              className="px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-teal-400/50 text-xs font-medium text-slate-200 transition-all shadow-xs hover:text-white flex items-center gap-1.5"
            >
              <span>{sample.title}</span>
            </button>
          ))}
        </div>

        {/* Interactive Travel Configurator & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
          {/* Controls column */}
          <div className="lg:col-span-6 space-y-4 bg-slate-900/70 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-black text-white flex items-center gap-2">
                <Compass size={16} className="text-teal-400" />
                {lt(locale, { fa: 'تنظیم سریع پارامترهای سفر', en: 'Quick Trip Customizer', ar: 'تخصيص سريع للرحلة', zh: '快速行程定制', ru: 'Быстрая настройка поездки' })}
              </span>
              <span className="text-[11px] font-bold text-teal-300 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded-md">
                {lt(locale, { fa: 'هماهنگی بلادرنگ', en: 'Real-time Sync', ar: 'مزامنة فورية', zh: '即时同步', ru: 'Синхронизация' })}
              </span>
            </div>

            {/* Destination Selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">
                {lt(locale, { fa: 'انتخاب مقصد:', en: 'Destination:', ar: 'الوجهة:', zh: '目的地：', ru: 'Направление:' })}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {destinations.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDest(d.id as DestinationType)}
                    className={`p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                      selectedDest === d.id
                        ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base block mb-0.5">{d.flag}</span>
                    <span className="block truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Days & Companions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  {lt(locale, { fa: 'مدت سفر:', en: 'Duration:', ar: 'المدة:', zh: '天数：', ru: 'Длительность:' })}
                </label>
                <div className="flex gap-1">
                  {[3, 4, 5, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDays(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border ${
                        selectedDays === d
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {d} {lt(locale, { fa: 'روز', en: 'd', ar: 'أيام', zh: '天', ru: 'дн' })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  {lt(locale, { fa: 'همسفران:', en: 'Travelers:', ar: 'المسافرون:', zh: '同行人：', ru: 'Попутчики:' })}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'solo', label: lt(locale, { fa: 'انفرادی', en: 'Solo', ar: 'فردي', zh: '独自', ru: 'Один' }) },
                    { id: 'duo', label: lt(locale, { fa: 'دونفره', en: 'Duo', ar: 'زوجي', zh: '双人', ru: 'Вдвоем' }) },
                    { id: 'family', label: lt(locale, { fa: 'خانواده', en: 'Family', ar: 'عائلة', zh: '家庭', ru: 'Семья' }) },
                    { id: 'friends', label: lt(locale, { fa: 'دوستان', en: 'Friends', ar: 'أصدقاء', zh: '朋友', ru: 'Друзья' }) },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWho(w.id as WhoType)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border whitespace-nowrap min-h-[44px] ${
                        selectedWho === w.id
                          ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget options */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                {lt(locale, { fa: 'سطح بودجه:', en: 'Budget Level:', ar: 'مستوى الميزانية:', zh: '预算级别：', ru: 'Бюджет:' })}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'economy', label: lt(locale, { fa: 'اقتصادی', en: 'Economy', ar: 'اقتصادي', zh: '经济', ru: 'Эконом' }) },
                  { id: 'balanced', label: lt(locale, { fa: 'متعادل', en: 'Balanced', ar: 'متوازن', zh: '均衡', ru: 'Баланс' }) },
                  { id: 'luxury', label: lt(locale, { fa: 'لوکس و VIP', en: 'Luxury VIP', ar: 'فاخر', zh: '奢华', ru: 'Люкс' }) },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBudget(b.id as BudgetType)}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all border ${
                      selectedBudget === b.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-6 bg-gradient-to-b from-slate-800/90 to-slate-900/90 p-6 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-teal-300">
                  {lt(locale, { fa: 'پیش‌نمایش هوشمند لحظه‌ای', en: 'Live Smart Preview', ar: 'معاينة ذكية مباشرة', zh: '智能即时预览', ru: 'Умный предпросмотр' })}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {selectedDays} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дней' })}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-white">
                <MapPin size={18} className="text-teal-400 shrink-0" />
                <h4 className="text-lg font-black">{currentPreview.city}</h4>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                <BedDouble size={14} />
                <span>{currentPreview.hotel}</span>
              </div>

              <div className="space-y-2 pt-2">
                {currentPreview.spots.map((spot, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                    <CheckCircle2 size={14} className="text-teal-400 shrink-0 mt-0.5" />
                    <span>{spot}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price & Action */}
            <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  {lt(locale, { fa: 'تخمین کل پکیج سفر:', en: 'Estimated Package:', ar: 'تقدير التكلفة الإجمالية:', zh: '预估总价：', ru: 'Ориентировочная стоимость:' })}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-400">
                  {currentPreview.price}
                </span>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all hover:scale-105"
              >
                <span>{lt(locale, { fa: 'مشاهده جزئیات و شخصی‌سازی', en: 'Customize Plan', ar: 'تخصيص الخطة', zh: '查看并定制', ru: 'Настроить маршрут' })}</span>
                {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-center">
          <div className="space-y-1">
            <Zap size={20} className="text-amber-400 mx-auto" />
            <div className="text-xs font-black text-white">{lt(locale, { fa: 'ساخت در ۱۰ ثانیه', en: '10s Generation', ar: 'توليد في 10 ثوان', zh: '10秒生成', ru: 'Генерация за 10 сек' })}</div>
            <div className="text-[11px] text-slate-400">{lt(locale, { fa: 'برنامه روز‌به‌روز دقیق', en: 'Detailed day-by-day', ar: 'خطة يومية دقيقة', zh: '精准每日规划', ru: 'Точный план по дням' })}</div>
          </div>
          <div className="space-y-1">
            <Plane size={20} className="text-teal-400 mx-auto" />
            <div className="text-xs font-black text-white">{lt(locale, { fa: 'هماهنگی خودکار پرواز و هتل', en: 'Auto Sync Flight & Stay', ar: 'تنسيق الطيران والفندق', zh: '机票酒店自动匹配', ru: 'Синхронизация рейсов и отелей' })}</div>
            <div className="text-[11px] text-slate-400">{lt(locale, { fa: 'بدون تداخل زمانی', en: 'Zero schedule conflicts', ar: 'دون تعارض في المواعيد', zh: '零时间冲突', ru: 'Без накладок' })}</div>
          </div>
          <div className="space-y-1">
            <Wallet size={20} className="text-emerald-400 mx-auto" />
            <div className="text-xs font-black text-white">{lt(locale, { fa: 'شفافیت ۱۰۰٪ هزینه‌ها', en: '100% Price Transparency', ar: 'شفافية كاملة في الأسعار', zh: '价格100%透明', ru: '100% прозрачность цен' })}</div>
            <div className="text-[11px] text-slate-400">{lt(locale, { fa: 'بدون هیچ کارمزد مخفی', en: 'No hidden fees', ar: 'بلا رسوم خفية', zh: '无任何隐藏费用', ru: 'Без скрытых комиссий' })}</div>
          </div>
          <div className="space-y-1">
            <ShieldCheck size={20} className="text-sky-400 mx-auto" />
            <div className="text-xs font-black text-white">{lt(locale, { fa: 'صدور فوری و پشتیبانی ۲۴/۷', en: 'Instant Ticketing & 24/7', ar: 'إصدار فوري ودعم 24/7', zh: '即时出票与24/7支持', ru: 'Мгновенные билеты 24/7' })}</div>
            <div className="text-[11px] text-slate-400">{lt(locale, { fa: 'ذخیره در پنل سفرهای من', en: 'Saved to My Trips', ar: 'حفظ في لوحة رحلاتي', zh: '同步至我的行程', ru: 'Сохранение в Мои поездки' })}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
