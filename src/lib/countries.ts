export type CountryId = 'iran' | 'russia' | 'turkey' | 'uae' | 'georgia' | 'oman' | 'china';

export interface CountryService {
  key: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  href: string;
}

export type ExperienceCategory =
  | 'yacht'
  | 'festival'
  | 'culture'
  | 'nature'
  | 'wellness'
  | 'nightlife'
  | 'adventure'
  | 'theater'
  | 'exhibition';

export interface SignatureExperience {
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  category: ExperienceCategory;
  /** محل برگزاری — شهر / مکان دقیق */
  where: string;
  whereEn: string;
  /** فصل یا تاریخ تقویمی واقعی */
  when: string;
  whenEn: string;
  /** قیمت شروع به تومان (نمایشی) */
  fromPrice: number;
}

export interface CountryConfig {
  id: CountryId;
  code: string;
  flag: string;
  currency: string;
  currencyFa: string;
  theme: string;
  themeEn: string;
  nameFa: string;
  nameEn: string;
  gateway: string;
  gatewayEn: string;
  exchangeNote: string;
  exchangeNoteEn: string;
  cities: { fa: string; en: string; href: string; gradient: string }[];
  services: CountryService[];
  journeys: { title: string; titleEn: string; desc: string; descEn: string }[];
  signatureExperiences: SignatureExperience[];
}

const GRADS = [
  'from-teal-500 to-emerald-700',
  'from-blue-500 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-fuchsia-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-sky-700',
];

function city(fa: string, en: string, i: number) {
  return { fa, en, href: `/hotels/search?city=${en}`, gradient: GRADS[i % GRADS.length] };
}

const S = (key: string, title: string, titleEn: string, desc: string, descEn: string, href: string): CountryService =>
  ({ key, title, titleEn, desc, descEn, href });

const J = (title: string, titleEn: string, desc: string, descEn: string) =>
  ({ title, titleEn, desc, descEn });

const X = (
  title: string,
  titleEn: string,
  desc: string,
  descEn: string,
  category: ExperienceCategory,
  where: string,
  whereEn: string,
  when: string,
  whenEn: string,
  fromPrice: number
): SignatureExperience => ({ title, titleEn, desc, descEn, category, where, whereEn, when, whenEn, fromPrice });

export const COUNTRIES: Record<CountryId, CountryConfig> = {
  iran: {
    id: 'iran', code: 'IR', flag: '🇮🇷', currency: 'IRR', currencyFa: 'تومان', nameFa: 'ایران', nameEn: 'Iran',
    theme: 'فرهنگ، زیارت و آمادگی مالی سفر',
    themeEn: 'Culture, pilgrimage and travel readiness',
    gateway: 'درگاه ریالی شتاب · فعال',
    gatewayEn: 'Shetab rial gateway · Active',
    exchangeNote: 'کیف پول چندارزی ریال/تتر با تبدیل لحظه‌ای',
    exchangeNoteEn: 'Multi-currency Rial/USDT wallet with instant swap',
    cities: [city('تهران', 'Tehran', 0), city('مشهد', 'Mashhad', 1), city('اصفهان', 'Isfahan', 2), city('شیراز', 'Shiraz', 3), city('تبریز', 'Tabriz', 4), city('کیش', 'Kish', 5)],
    services: [
      S('stays', 'هتل و اقامتگاه', 'Hotels & stays', 'اقامت سنتی و مدرن با قوانین شفاف', 'Traditional and modern stays with transparent policies', '/hotels/search'),
      S('flights', 'پرواز داخلی', 'Domestic flights', 'مسیرهای داخلی با قفل وجه Saga', 'Domestic routes with Saga fund lock', '/flights/search'),
      S('tours', 'تور و فعالیت', 'Tours & activities', 'تورهای فرهنگی، زیارتی و درمانی', 'Cultural, pilgrimage and medical tours', '/tours'),
      S('transfer', 'ترانسفر فرودگاهی', 'Airport transfer', 'تحویل در محل پرواز در شهرهای اصلی', 'Meet & greet in major cities', '/transfers'),
      S('transport', 'قطار و اتوبوس', 'Train & bus', 'حمل‌ونقل بین‌شهری مقرون‌به‌صرفه', 'Affordable intercity transport', '/trains'),
      S('visa', 'خدمات ویزا', 'Visa services', 'اطلاعات ورود و مسیر کمکی', 'Entry info and assisted route', '/visa'),
      S('money', 'کیف پول چندارزی', 'Multi-currency wallet', 'ریال، تتر و تبدیل لحظه‌ای', 'Rial, USDT and instant exchange', '/wallet'),
      S('esim', 'سیم‌کارت و اینترنت', 'SIM & internet', 'eSIM فعال آنی در مقصد', 'Instant eSIM at the destination', '/esim'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'جشن‌های تقویمی، بوم‌گردی و فرهنگ', 'Calendar festivals, village stays and culture', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('برنامه‌ریزی زیارتی', 'Pilgrimage planning', 'هماهنگی اقامت نزدیک حرم، نیاز گروه و ورود.', 'Coordinated stays near the shrine, group needs and entry.'),
      J('سفر درمانی', 'Medical travel', 'مسیر کمکی محافظت‌شده با رضایت آگاهانه.', 'An assisted, safeguarded route with informed consent.'),
      J('مسیر فرهنگی', 'Cultural route', 'شهرها، اقامت و تجربه‌ها با حرکت منعطف.', 'Cities, stays and experiences with flexible movement.'),
    ],
    signatureExperiences: [
      X('تور قایقی جنگل حرا', 'Hara Mangrove Boat Tour', 'گشت قایق محلی میان جنگل حرا و دلفین‌بینی جزیره هنگام', 'Local boat through the mangrove forest with Hengam dolphin watching', 'yacht', 'قشم، خلیج فارس', 'Qeshm, Persian Gulf', 'تمام سال', 'Year-round', 850000),
      X('کروز غروب هنگام', 'Hengam Sunset Cruise', 'کروز غروب دور جزیره هنگام با حرکت ساعتی از قشم', 'Sunset cruise around Hengam Island, hourly departures from Qeshm', 'yacht', 'قشم → هنگام', 'Qeshm → Hengam', 'تمام سال', 'Year-round', 1200000),
      X('نوروز و چهارشنبه‌سوری', 'Nowruz & Chaharshanbe Soori', 'بزرگ‌ترین جشن ایرانی و آتش‌افروزی آخرین سه‌شنبه سال', 'The grandest Persian new year and the fire-jumping festival', 'festival', 'سراسر ایران', 'Nationwide', '۲۰–۲۱ مارس', 'March 20–21', 4900000),
      X('شب یلدا', 'Yalda Night', 'بلندترین شب سال با شعرخوانی حافظ، هندوانه و انار', 'The longest night with Hafez poetry, watermelon and pomegranate', 'festival', 'تهران و شمال', 'Tehran & north', '۲۰–۲۱ دسامبر', 'December 20–21', 2400000),
      X('جشن سده زرتشتی', 'Sadeh Festival', 'جشن آتش هزارساله زرتشتیان پنجاه روز مانده به نوروز', 'Zoroastrian fire festival, fifty days before Nowruz', 'festival', 'یزد و کرمان', 'Yazd & Kerman', '۳۰ ژانویه', 'January 30', 1800000),
      X('تعزیه محرم', 'Taziyeh of Muharram', 'نمایش آیینی تعزیه — تئاتر اصیل و ثبت‌شده یونسکو', 'Ritual passion play — Iran\u2019s UNESCO-listed indigenous theatre', 'theater', 'تکیه‌های یزد و تهران', 'Tekyehs of Yazd & Tehran', 'ماه محرم', 'Muharram', 950000),
      X('غار نمکدان و چاهکوه', 'Namakdan Salt Cave & Chahkooh', 'طولانی‌ترین غار نمکی جهان، دره ستاره‌ها و کوه‌های رنگین‌کمانی هرمز', 'World\u2019s longest salt cave, Valley of Stars and Hormuz rainbow mountains', 'nature', 'قشم و هرمز', 'Qeshm & Hormuz', 'اکتبر تا آوریل', 'Oct–Apr', 1100000),
      X('کارگاه فرش‌بافی و بازار صنایع‌دستی', 'Carpet Weaving Workshop', 'بافت فرش کنار استادکاران کاشان و اصفهان؛ بازارهای سنتی به‌عنوان نمایشگاه دائمی', 'Weave alongside master artisans in Kashan & Isfahan; traditional bazaars as living craft expos', 'exhibition', 'کاشان و اصفهان', 'Kashan & Isfahan', 'تمام سال', 'Year-round', 1500000),
      X('کویرگردی و کاروانسرا', 'Desert Safari & Caravanserai', 'کویرمرنجاب و یزد با اقامت شبانه در کاروانسراهای بازسازی‌شده', 'Maranjab & Yazd desert with an overnight in restored caravanserais', 'adventure', 'یزد و مرنجاب', 'Yazd & Maranjab', 'پاییز و زمستان', 'Autumn & winter', 3200000),
      X('چشمه‌های آبگرم سرعین', 'Sarein Hot Springs', 'آب‌های گرم طبیعی گنداب در دامنه سبلان', 'Natural thermal waters of Gendab on the slopes of Sabalan', 'wellness', 'سرعین، اردبیل', 'Sarein, Ardabil', 'تمام سال', 'Year-round', 800000),
    ],
  },
  turkey: {
    id: 'turkey', code: 'TR', flag: '🇹🇷', currency: 'TRY', currencyFa: 'لیر', nameFa: 'ترکیه', nameEn: 'Turkey',
    theme: 'ساحل، شهر و جابه‌جایی منطقه‌ای',
    themeEn: 'Coast, city and regional movement',
    gateway: 'درگاه لیر TRY · بررسی Eligibility',
    gatewayEn: 'TRY gateway · Eligibility check',
    exchangeNote: 'تبدیل تومان به لیر با نرخ نمایشی و تسویه محلی',
    exchangeNoteEn: 'Toman→Lira conversion at display rate, local settlement',
    cities: [city('استانبول', 'Istanbul', 0), city('آنتالیا', 'Antalya', 1), city('کاپادوکیه', 'Cappadocia', 2), city('ازمیر', 'Izmir', 3), city('بدروم', 'Bodrum', 4), city('ترابزون', 'Trabzon', 5)],
    services: [
      S('stays', 'هتل و اقامتگاه', 'Hotels & stays', 'از بوتیک تا رزورت ساحلی', 'From boutique to beach resorts', '/hotels/search'),
      S('flights', 'پرواز', 'Flights', 'مسیرهای داخلی و ورودی ترکیه', 'Domestic and inbound routes', '/flights/search'),
      S('tours', 'تور و فعالیت', 'Tours & activities', 'تجربه‌های شهری و ساحلی', 'Urban and coastal experiences', '/tours'),
      S('transfer', 'ترانسفر فرودگاهی', 'Airport transfer', 'IST و SAW با خودرو VIP', 'IST & SAW with VIP cars', '/transfers'),
      S('visa', 'ویزای ترکیه', 'Turkey visa', 'صدور ~۵ روز کاری، نرخ موفقیت بالا', '~5 business days, high success rate', '/visa'),
      S('esim', 'سیم‌کارت eSIM', 'Travel eSIM', 'اینترنت فعال از لحظه ورود', 'Internet active on arrival', '/esim'),
      S('insurance', 'بیمه مسافرتی', 'Travel insurance', 'پوشش موردنیاز ورود', 'Entry-required coverage', '/insurance'),
      S('money', 'پشتیبانی مالی محلی', 'Local money support', 'ارز، پرداخت و اکسچنج', 'Currency, payment and exchange', '/wallet'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'بالن‌سواری، بلو کروز و حمام ترکی', 'Balloon rides, Blue Cruise and hammam', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('مسیر ساحل و شهر', 'Coast & city route', 'تعادل ورود، اقامت ساحلی و جابه‌جایی محلی.', 'Balance arrival, coastal stays and local movement.'),
      J('سفر سلامت', 'Wellness travel', 'مرز Provider و حریم خصوصی شفاف است.', 'Provider boundaries and privacy are transparent.'),
      J('مسیر فرهنگی', 'Cultural route', 'شهر قدیم، بازار و تجربه‌های محلی.', 'Old town, bazaars and local experiences.'),
    ],
    signatureExperiences: [
      X('بلو کروز (گولت چارتر)', 'Blue Cruise Gulet Charter', 'کشتی چوبی سنتی از بدروم، مارماریس، گوجک و فتحیه', 'Traditional wooden gulet from Bodrum, Marmaris, Göcek & Fethiye', 'yacht', 'بدروم و مارماریس', 'Bodrum & Marmaris', 'مه تا اکتبر', 'May–Oct', 45000000),
      X('کروز بسفور', 'Bosphorus Cruise', 'گشت کشتی میان دو قاره با توقف در اورتاکوی', 'Ferry cruise between two continents with an Ortaköy stop', 'yacht', 'استانبول', 'Istanbul', 'تمام سال', 'Year-round', 2800000),
      X('پارتی یات و بیچ‌کلاب بدروم', 'Bodrum Beach Club & Boat Party', 'بیچ‌کلاب‌های لوکس و پارتی یات — پایتخت پارتی مدیترانه', 'Luxury beach clubs and boat parties — the Med\u2019s party capital', 'nightlife', 'بدروم', 'Bodrum', 'ژوئن تا سپتامبر', 'Jun–Sep', 6500000),
      X('شب استانبول: تاکسیم و گالاتا', 'Istanbul Nights: Taksim & Galata', 'بارهای پشت‌بامی، کلوپ‌های رقص کاراکوی و اورتاکوی', 'Rooftop bars and dance clubs of Karaköy & Ortaköy', 'nightlife', 'استانبول', 'Istanbul', 'تمام سال', 'Year-round', 4800000),
      X('جشنواره بادکنک کاپادوکیه', 'Cappadocia Balloon Festival', 'حدود ۲۰۰ بالون رنگی هم‌زمان بر فراز دره‌ها', 'Some 200 hot-air balloons filling the valley at once', 'festival', 'کاپادوکیه', 'Cappadocia', 'تابستان', 'Summer', 3500000),
      X('Calibre Fest بدروم', 'Calibre Fest Bodrum', 'جشنواره الکترونیک در آرنای کشتی‌کج‌شتری بدروم', 'Electronic music festival at Bodrum\u2019s camel-wrestling arena', 'festival', 'بدروم', 'Bodrum', 'تابستان', 'Summer', 12000000),
      X('اپرا و باله آسپندوس', 'Aspendos Opera & Ballet', 'اجرای زنده در آمفی‌تئاتر رومی ۲۰۰۰ ساله', 'Live performances inside the 2,000-year-old Roman amphitheatre', 'theater', 'آسپندوس، آنتالیا', 'Aspendos, Antalya', 'ژوئن تا سپتامبر', 'Jun–Sep', 5200000),
      X('مراسم سماع مولانا', 'Mevlana Whirling Dervishes', 'مراسم ذکر و رقص دراویش در شهر مولانا', 'Sema ceremony of the whirling dervishes in Rumi\u2019s city', 'culture', 'قونیه', 'Konya', 'به‌ویژه دسامبر', 'Especially December', 2200000),
      X('حمام سنتی ترکی', 'Turkish Hammam Ritual', 'سونا، لایه‌برداری کف صابون و ماسک گِل کنار موزه گورمه', 'Steam, foam scrub and clay mask beside the Göreme open-air museum', 'wellness', 'کاپادوکیه و استانبول', 'Cappadocia & Istanbul', 'تمام سال', 'Year-round', 3800000),
      X('جشنواره فیلم آنتالیا', 'Antalya Golden Orange Film Festival', 'قدیمی‌ترین جشنواره فیلم ترکیه در اکتبر', 'Turkey\u2019s oldest international film festival each October', 'festival', 'آنتالیا', 'Antalya', 'اکتبر', 'October', 2000000),
      X('پاراگلایدر اولودنیز و غواصی کاش', 'Ölüdeniz Paragliding & Kaş Diving', 'پرتاب از باباداغ و غواصی در آب‌های شفاف مدیترانه', 'Launch from Babadağ and dive the crystal Mediterranean', 'adventure', 'فتحیه و کاش', 'Fethiye & Kaş', 'آوریل تا اکتبر', 'Apr–Oct', 6200000),
    ],
  },
  uae: {
    id: 'uae', code: 'AE', flag: '🇦🇪', currency: 'AED', currencyFa: 'درهم', nameFa: 'امارات', nameEn: 'UAE',
    theme: 'سفر لوکس، تجاری و خانوادگی',
    themeEn: 'Premium, business and family travel',
    gateway: 'درگاه AED · پرداخت امن بین‌المللی',
    gatewayEn: 'AED gateway · Secure international payment',
    exchangeNote: 'درهم در کیف پول Firuzo قابل نگهداری و تبدیل',
    exchangeNoteEn: 'Hold and convert AED in the Firuzo wallet',
    cities: [city('دبی', 'Dubai', 0), city('ابوظبی', 'Abu Dhabi', 1), city('شارجه', 'Sharjah', 2), city('راس‌الخیمه', 'Ras Al Khaimah', 3), city('عجمان', 'Ajman', 4), city('فجیره', 'Fujairah', 5)],
    services: [
      S('stays', 'هتل لوکس', 'Luxury hotels', 'اقامت premium با شرایط شفاف', 'Premium stays with clear terms', '/hotels/search'),
      S('flights', 'پرواز', 'Flights', 'DXB و مسیرهای منطقه‌ای', 'DXB and regional routes', '/flights/search'),
      S('transfer', 'ترانسفر بین‌شیخ‌نشین‌ها', 'Inter-emirate transfer', 'دبی به ابوظبی و برعکس', 'Dubai ↔ Abu Dhabi and back', '/transfers'),
      S('tours', 'جاذبه و رویداد', 'Attractions & events', 'فعالیت‌های شهری date-aware', 'Date-aware city activities', '/tours'),
      S('visa', 'ویزای امارات', 'UAE visa', 'صدور ~۳ روز کاری', '~3 business days', '/visa'),
      S('esim', 'سیم‌کارت eSIM', 'Travel eSIM', '۲۰ گیگ با اعتبار ۳۰ روزه', '20GB with 30-day validity', '/esim'),
      S('insurance', 'بیمه مسافرتی', 'Travel insurance', 'پوشش کامل خانوادگی', 'Full family coverage', '/insurance'),
      S('money', 'کیف پول درهم', 'AED wallet', 'نگهداری و تبدیل AED', 'Hold and exchange AED', '/wallet'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'یات‌رانی، فالکونری و F1', 'Yachting, falconry and F1', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('سفر لوکس و تجاری', 'Luxury & business', 'ترانسفر خصوصی، رویداد و اقامت premium.', 'Private transfers, events and premium stays.'),
      J('سفر خانوادگی', 'Family travel', 'اتاق، کودک و فعالیت پیش از قیمت.', 'Room, child and activities before pricing.'),
      J('مسیر شهری', 'Urban route', 'arrival سریع و دسترسی رویدادها.', 'Fast arrival and event access.'),
    ],
    signatureExperiences: [
      X('اجاره یات دبی مارینا', 'Dubai Marina Yacht Charter', 'یات خصوصی یا اشتراکی با کاپیتان از مارینا و دبی هاربر', 'Private or shared charter with captain from Marina & Dubai Harbour', 'yacht', 'دبی مارینا', 'Dubai Marina', 'تمام سال', 'Year-round', 38000000),
      X('کروز داو با شام', 'Dhow Dinner Cruise', 'شمع‌افروزى سنتی با شام بوفه روی خلیج', 'Traditional lantern-lit dhow with buffet dinner on the creek', 'yacht', 'خور دبی', 'Dubai Creek', 'تمام سال', 'Year-round', 9500000),
      X('آتش‌بازی سال نو ابوظبی', 'Abu Dhabi NYE Fireworks Cruise', 'کروز یات برای تماشای آتش‌بازی یاس و کورنیش', 'Yacht cruise for the Yas Island & Corniche fireworks', 'yacht', 'ابوظبی', 'Abu Dhabi', '۳۱ دسامبر', 'December 31', 28000000),
      X('گلوبال ویلج دبی', 'Global Village Dubai', 'غرفه‌های فرهنگی، خرید و غذا از بیش از ۹۰ کشور', 'Culture pavilions, shopping and street food from 90+ countries', 'festival', 'دبی', 'Dubai', 'اکتبر تا آوریل', 'Oct–Apr', 2500000),
      X('جشنواره خرید دبی (DSF)', 'Dubai Shopping Festival', 'ماه حراج‌ها، قرعه‌کشی‌ها و آتش‌بازی‌های شهر', 'A month of sales, raffles and citywide fireworks', 'festival', 'دبی', 'Dubai', 'دسامبر تا ژانویه', 'Dec–Jan', 3200000),
      X('گرندپری فرمول ۱ ابوظبی', 'Abu Dhabi F1 Grand Prix', 'مسابقه پایانی فصل در جزیره یاس با کنسرت‌های بزرگ', 'Season finale at Yas Island with headline concerts', 'festival', 'جزیره یاس', 'Yas Island', 'دسامبر', 'December', 85000000),
      X('نمایشگاه قایق دبی', 'Dubai Int\u2019l Boat Show', 'بزرگ‌ترین نمایشگاه دریایی منطقه در دبی هاربر', 'The region\u2019s largest maritime show at Dubai Harbour', 'exhibition', 'دبی هاربر', 'Dubai Harbour', 'فوریه/مارس', 'Feb–Mar', 4500000),
      X('GITEX و هفته طراحی دبی', 'GITEX & Dubai Design Week', 'رویداد فناوری و طراحی خلاق — همراه ISEA 2026 هنر دیجیتال', 'Tech and design weeks — with ISEA 2026 digital art', 'exhibition', 'داون‌تاون دبی', 'Dubai Downtown', 'اکتبر', 'October', 6800000),
      X('بازشکاری در محیط زیست بیابانی', 'Falconry in the Desert Reserve', 'سنت ۲۰۰۰ ساله یونسکو با فالکون و سگ سلوقی (رویال شاهین)', 'UNESCO-listed 2,000-year-old sport with falcons & Saluki hounds', 'culture', 'ذخیره‌گاه دبی', 'DDCR, Dubai', 'اکتبر تا آوریل', 'Oct–Apr', 14000000),
      X('شب‌های یاس و داون‌تاون', 'Yas & Downtown Nights', 'کلوپ‌های رسمی و رزروپذیر هتل‌های دبی و ابوظبی', 'Bookable hotel clubs across Dubai & Abu Dhabi', 'nightlife', 'دبی و ابوظبی', 'Dubai & Abu Dhabi', 'تمام سال', 'Year-round', 18000000),
      X('سافاری، گلمپینگ و بالون صبحگاهی', 'Desert Safari, Glamping & Balloon', 'دون‌بشینگ، کمپ لوکس زیر ستاره و پرواز بر فراز غزال‌های عربی', 'Dune bashing, star-lit luxury camp and a dawn flight over Arabian oryx', 'adventure', 'کویر دبی', 'Dubai Desert', 'نوامبر تا مارس', 'Nov–Mar', 22000000),
      X('لوور ابوظبی و کمیک‌کان ADNEC', 'Louvre Abu Dhabi & Comic Con', 'موزه هنر جزیره سعدیات و بزرگ‌ترین رویداد پاپ‌کالچر خاورمیانه', 'Saadiyat art museum and the region\u2019s biggest pop-culture con', 'exhibition', 'ابوظبی', 'Abu Dhabi', 'تمام سال', 'Year-round', 3500000),
    ],
  },
  georgia: {
    id: 'georgia', code: 'GE', flag: '🇬🇪', currency: 'GEL', currencyFa: 'لاری', nameFa: 'گرجستان', nameEn: 'Georgia',
    theme: 'کوهستان، شراب و مسیرهای جاده‌ای',
    themeEn: 'Mountain, wine and road routes',
    gateway: 'درگاه GEL · تسویه محلی',
    gatewayEn: 'GEL gateway · Local settlement',
    exchangeNote: 'لاری با نرخ لحظه‌ای در کیف پول',
    exchangeNoteEn: 'Lari at live rates in the wallet',
    cities: [city('تفلیس', 'Tbilisi', 0), city('باتومی', 'Batumi', 1), city('کوتائیسی', 'Kutaisi', 2), city('گودائوری', 'Gudauri', 3), city('کازبگی', 'Kazbegi', 4), city('کاختی', 'Kakheti', 5)],
    services: [
      S('stays', 'هتل و اقامتگاه', 'Hotels & stays', 'بوتیک شهر قدیم و اقامت کوهستان', 'Old-town boutique and mountain lodges', '/hotels/search'),
      S('flights', 'پرواز', 'Flights', 'تفلیس و باتومی', 'Tbilisi and Batumi', '/flights/search'),
      S('transfer', 'ترانسفر کوهستانی', 'Mountain transfer', 'جاده‌های گودائوری و کازبگی', 'Gudauri and Kazbegi roads', '/transfers'),
      S('tours', 'تور طبیعت', 'Nature tours', 'ماجراجویی و مسیر شراب', 'Adventure and wine routes', '/tours'),
      S('visa', 'ویزای گرجستان', 'Georgia visa', '~۷ روز کاری', '~7 business days', '/visa'),
      S('esim', 'سیم‌کارت eSIM', 'Travel eSIM', '۸ گیگ ۱۴ روزه', '8GB for 14 days', '/esim'),
      S('insurance', 'بیمه مسافرتی', 'Travel insurance', 'پوشش ارتفاع و اسکی', 'Altitude and ski coverage', '/insurance'),
      S('money', 'کیف پول لاری', 'GEL wallet', 'تبدیل و نگهداری GEL', 'Hold and exchange GEL', '/wallet'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'جشن برداشت، برج‌های سوانتی', 'Harvest festival, Svan towers', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('مسیر کوهستان', 'Mountain route', 'جاده، آب‌وهوا و ترانسفر برنامه‌ریزی‌شده.', 'Roads, weather and planned transfers.'),
      J('شراب و سفر آرام', 'Wine & slow travel', 'اقامت منطقه‌ای، راننده و تجربه محلی.', 'Regional stays, driver and local experiences.'),
      J('مسیر فرهنگی', 'Cultural route', 'تفلیس، کوتائیسی و میراث تاریخی.', 'Tbilisi, Kutaisi and historic heritage.'),
    ],
    signatureExperiences: [
      X('رتولی — جشن برداشت انگور', 'Rtveli Grape Harvest', 'چیدن انگور، له‌کردن با پا و سوپرای سنتی در خانواده میزبان (Eat This! Tours، Rostomaant Marani)', 'Hand-picking, foot-stomping and a traditional supra with host families', 'festival', 'کاختی', 'Kakheti', 'سپتامبر تا اکتبر', 'Sep–Oct', 18000000),
      X('جشنواره تسیناندالی', 'Tsinandali Festival', 'موسیقی کلاسیک جهانی در املاک شاوچاواتزه', 'World-class classical music at the Chavchavadze estate', 'festival', 'کاختی', 'Kakheti', '۳ تا ۱۳ سپتامبر', 'Sep 3–13', 12000000),
      X('تفلیسوبا', 'Tbilisoba', 'بزرگ‌ترین جشن سالانه تفلیس: بازار غذا، شراب و کارناوال', 'Tbilisi\u2019s biggest street festival: food, wine and carnival', 'festival', 'تفلیس', 'Tbilisi', '۳–۴ اکتبر', 'Oct 3–4', 4000000),
      X('جشنواره شراب جوان', 'New Wine Festival', 'رونمایی شراب‌های تازه در پارک متاتسمیندا', 'New-season wine unveiling at Mtatsminda Park', 'festival', 'تفلیس', 'Tbilisi', 'دومین آخر هفته مه', '2nd weekend of May', 3500000),
      X('جاز دریای سیاه', 'Black Sea Jazz Festival', 'کنسرت‌های بین‌المللی جاز تابستانه باتومی', 'Batumi\u2019s summer line-up of international jazz', 'festival', 'باتومی', 'Batumi', 'جولای', 'July', 14000000),
      X('تئاتر بین‌المللی تفلیس', 'Tbilisi Int\u2019l Theatre Festival', 'اجرای تئاترهای اروپایی و آسیایی در سالن‌های شهر', 'European and Asian productions across city venues', 'theater', 'تفلیس', 'Tbilisi', 'سپتامبر', 'September', 6000000),
      X('برج‌های سوانتی و اوشگولی', 'Svan Towers & Ushguli', '۱۷۵ برج سنگی قرن ۹–۱۳ و مرتفع‌ترین روستای دائمی اروپا (یونسکو)', '175 medieval stone towers and Europe\u2019s highest inhabited village', 'culture', 'سوانتی', 'Svaneti', 'ژوئن تا اکتبر', 'Jun–Oct', 16000000),
      X('تِرک مستیا تا اوشگولی', 'Mestia–Ushguli Trek', 'پیاده‌روی ۵۴ کیلومتری معروف‌ترین مسیر گرجستان از میان یخچال‌ها', 'The famous 54km trek through Svan villages and glaciers', 'adventure', 'سوانتی', 'Svaneti', 'ژوئن تا سپتامبر', 'Jun–Sep', 28000000),
      X('تور قایقی باتومی', 'Batumi Boat Tour', 'گشت دریای سیاه — فعالیت فرعی صادقانه، نه یات‌رانی بزرگ', 'Black Sea boat trip — an honest side activity, not a yacht scene', 'yacht', 'باتومی', 'Batumi', 'مه تا اکتبر', 'May–Oct', 3800000),
      X('تکنوی فابریکا', 'Fabrika Techno Nights', 'صحنه کلاب تفلیس در محله فابریکا', 'Tbilisi\u2019s club scene around the Fabrika courtyard', 'nightlife', 'تفلیس', 'Tbilisi', 'پنجشنبه تا شنبه', 'Thu–Sat', 2800000),
      X('اسکی گودائوری و کازبگی', 'Gudauri Ski & Kazbegi', 'پیست‌های بلند زمستانی و تور رقص گرجی با بازدید جوواری', 'Long winter slopes plus a Georgian dance class with Jvari visit', 'adventure', 'گودائوری', 'Gudauri', 'دسامبر تا مارس', 'Dec–Mar', 24000000),
    ],
  },
  russia: {
    id: 'russia', code: 'RU', flag: '🇷🇺', currency: 'RUB', currencyFa: 'روبل', nameFa: 'روسیه', nameEn: 'Russia',
    theme: 'ریلی، شهری و مسیرهای زمستانی',
    themeEn: 'Rail, city and seasonal winter routes',
    gateway: 'درگاه RUB · Eligibility بررسی می‌شود',
    gatewayEn: 'RUB gateway · Eligibility checked',
    exchangeNote: 'اکسچنج روبل با تایید Provider',
    exchangeNoteEn: 'Ruble exchange with provider approval',
    cities: [city('مسکو', 'Moscow', 0), city('سن‌پترزبورگ', 'St Petersburg', 1), city('کازان', 'Kazan', 2), city('سوچی', 'Sochi', 3), city('یکاترینبورگ', 'Yekaterinburg', 4), city('بایکال', 'Baikal', 5)],
    services: [
      S('stays', 'هتل', 'Hotels', 'اقامت شهری با policy مشخص', 'City stays with clear policies', '/hotels/search'),
      S('flights', 'پرواز', 'Flights', 'THR به MOW و داخلی', 'THR to MOW and domestic', '/flights/search'),
      S('transfer', 'ترانسفر فرودگاهی', 'Airport transfer', 'SVO و Pulkovo', 'SVO and Pulkovo', '/transfers'),
      S('visa', 'ویزای روسیه', 'Russia visa', '~۱۰ روز کاری با مدارک کامل', '~10 business days with full documents', '/visa'),
      S('esim', 'سیم‌کارت eSIM', 'Travel eSIM', 'اتصال در مسکو و پترزبورگ', 'Coverage in Moscow & St Petersburg', '/esim'),
      S('insurance', 'بیمه مسافرتی', 'Travel insurance', 'الزامی برای ویزا', 'Required for the visa', '/insurance'),
      S('tours', 'تور و فعالیت', 'Tours & activities', 'مسیرهای شهری و زمستانی', 'Urban and winter routes', '/tours'),
      S('money', 'پشتیبانی مالی', 'Money support', 'RUB context و اکسچنج', 'RUB context and exchange', '/wallet'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'شب‌های سفید، باله و بانیا', 'White Nights, ballet and banya', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('سفر ریلی', 'Rail journey', 'مسافت طولانی و نیازهای مدرک.', 'Long distances and document needs.'),
      J('سفر فصلی زمستان', 'Winter seasonal', 'آب‌وهوا، ترانسفر و شرایط اقامت.', 'Weather, transfers and stay conditions.'),
      J('مسیر فرهنگی', 'Cultural route', 'مسکو و سن‌پترزبورگ در یک مسیر.', 'Moscow and St Petersburg in one route.'),
    ],
    signatureExperiences: [
      X('کروز رود مسکوا', 'Moskva River Cruise', 'گشت شهری روی آب از بندر کی‌یفسکی', 'City sightseeing from the water, Kyivsky pier departures', 'yacht', 'مسکو', 'Moscow', 'مه تا اکتبر', 'May–Oct', 8500000),
      X('کشتی شب‌های سفید نوا', 'White Nights Neva Boat', 'کروز شب‌بیداری روی نوا در اوج شب‌های سفید', 'Late-night cruise on the Neva at the White Nights peak', 'yacht', 'سن‌پترزبورگ', 'St Petersburg', 'ژوئن تا جولای', 'Jun–Jul', 12000000),
      X('جشنواره شب‌های سفید و بادبان‌های سرخ', 'White Nights Festival & Scarlet Sails', 'باله، اپرا و آتش‌بازی افسانه‌ای بادبان‌های سرخ + ماراتن ۵۰۰۰ نفری', 'Ballet, opera and the legendary Scarlet Sails fireworks + 5,000-runner marathon', 'festival', 'سن‌پترزبورگ', 'St Petersburg', '۲۲ آوریل تا ۲۱ اوت', 'Apr 22–Aug 21', 9000000),
      X('ستاره‌های شب‌های سفید ماریینسکی', 'Mariinsky Stars of the White Nights', 'فستیوال تابستانی تئاتر ماریینسکی', 'The Mariinsky Theatre\u2019s summer star festival', 'festival', 'سن‌پترزبورگ', 'St Petersburg', '۲۹ مه تا ۲۴ جولای', 'May 29–Jul 24', 11000000),
      X('باله بولشوی', 'Bolshoi Ballet', 'دریاچه قو و فندق‌شکن در صحنه تاریخی مسکو — بلیط آنلاین', 'Swan Lake & The Nutcracker on Moscow\u2019s historic stage — bookable online', 'theater', 'مسکو', 'Moscow', 'فصل کامل؛ فندق‌شکن کریسمس', 'Full season; Nutcracker at Christmas', 18000000),
      X('اپرای ماریینسکی', 'Mariinsky Opera & Ballet', 'اجرای کلاسیک در تئاتر تاریخی سن‌پترزبورگ', 'Classical productions at St Petersburg\u2019s historic theatre', 'theater', 'سن‌پترزبورگ', 'St Petersburg', 'تمام سال', 'Year-round', 15000000),
      X('بانیای سندونی', 'Sanduny Russian Banya', 'حمام بخار ۱۸۰۸ با مراسم venik و استخر یخ — پذیرای تولستوی و پوشکین', 'The 1808 steam baths with venik ritual & ice plunge — Tolstoy and Pushkin were regulars', 'wellness', 'مسکو', 'Moscow', 'تمام سال', 'Year-round', 4200000),
      X('یخ‌شکن قطبی و شفق مورمانسک', 'Arctic Icebreaker & Aurora', 'سفر یخ‌شکن و شکار شفق قطبی در آسمان قطب', 'Icebreaker voyage and northern-lights hunting under polar skies', 'nature', 'مورمانسک', 'Murmansk', 'نوامبر تا مارس', 'Nov–Mar', 95000000),
      X('ترانس‌سیبیری', 'Trans-Siberian Railway', 'سفر ریلی چندروزه از مسکو به بایکال', 'Multi-day rail epic from Moscow to Baikal', 'adventure', 'مسکو → بایکال', 'Moscow → Baikal', 'تمام سال', 'Year-round', 120000000),
      X('ماهیگیری یخی بایکال', 'Baikal Ice Fishing', 'روی یخ عمیق‌ترین دریاچه جهان', 'On the ice of the world\u2019s deepest lake', 'adventure', 'دریاچه بایکال', 'Lake Baikal', 'فوریه تا مارس', 'Feb–Mar', 7500000),
    ],
  },
  oman: {
    id: 'oman', code: 'OM', flag: '🇴🇲', currency: 'OMR', currencyFa: 'ریال عمان', nameFa: 'عمان', nameEn: 'Oman',
    theme: 'کویر، ساحل و ماجراجویی',
    themeEn: 'Desert, coast and adventure travel',
    gateway: 'درگاه OMR · تسویه محلی',
    gatewayEn: 'OMR gateway · Local settlement',
    exchangeNote: 'اکسچنج OMR طبق تنظیم کشور',
    exchangeNoteEn: 'OMR exchange per country regulation',
    cities: [city('مسقط', 'Muscat', 0), city('صلاله', 'Salalah', 1), city('نزوی', 'Nizwa', 2), city('جبل اخضر', 'Jebel Akhdar', 3), city('صور', 'Sur', 4), city('واحبه سندز', 'Wahiba Sands', 5)],
    services: [
      S('stays', 'هتل', 'Hotels', 'اقامت ساحلی و کویری', 'Coastal and desert stays', '/hotels/search'),
      S('flights', 'پرواز', 'Flights', 'MCT از دبی و استانبول', 'MCT via Dubai and Istanbul', '/flights/search'),
      S('transfer', 'راننده خصوصی ۴×۴', 'Private 4×4 driver', 'مسیرهای کویر و کوهستان', 'Desert and mountain routes', '/transfers'),
      S('tours', 'ماجراجویی', 'Adventure tours', 'Wahiba و Jebel Akhdar', 'Wahiba and Jebel Akhdar', '/tours'),
      S('visa', 'ویزای عمان', 'Oman visa', 'eVisa با مدارک ساده', 'eVisa with simple documents', '/visa'),
      S('esim', 'سیم‌کارت eSIM', 'Travel eSIM', 'پوشش مسقط و صلاله', 'Muscat and Salalah coverage', '/esim'),
      S('insurance', 'بیمه مسافرتی', 'Travel insurance', 'پوشش سفر فعال', 'Active-travel coverage', '/insurance'),
      S('money', 'پشتیبانی مالی', 'Money support', 'OMR context', 'OMR context', '/wallet'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'خریف ظفار و کروز مسندم', 'Khareef Dhofar and Musandam cruise', '/tours?category=signature'),
      S('interpreter', 'مترجم همراه', 'Interpreter', '۴ سطح: همراه روزانه، ساعتی، SOS و کیت رایگان', '4 tiers: full-day, hourly, SOS and free kit', '/interpreter'),
    ],
    journeys: [
      J('مسیر کویر', 'Desert route', 'ورود، جاده، شب‌مانی و فعالیت.', 'Entry, road, overnight and activities.'),
      J('سفر ماجراجویی', 'Adventure travel', 'نیاز فعالیت و لجستیک مختص کشور.', 'Activity needs and country-specific logistics.'),
      J('مسیر ساحلی', 'Coastal route', 'مسقط تا صلاله با توقف‌های منتخب.', 'Muscat to Salalah with selected stops.'),
    ],
    signatureExperiences: [
      X('کروز داو مسندم', 'Musandam Dhow Cruise', 'فیوردهای مسندم از خصب با دلفین‌های خاکستری — بهترین زمان قبل ۹ صبح', 'Musandam fjords from Khasab with grey dolphins — best before 9am', 'yacht', 'مسندم، خصب', 'Musandam, Khasab', 'اکتبر تا آوریل', 'Oct–Apr', 11000000),
      X('تور قایقی سواحل صلاله', 'Salalah Coast Boat Tour', 'قایق تا مغسیل و فزایه در فصل خریف', 'Boat to Mugsail and Fazayah beaches in Khareef season', 'yacht', 'صلاله', 'Salalah', 'ژوئن تا سپتامبر', 'Jun–Sep', 8000000),
      X('جشنواره خریف ظفار', 'Khareef Dhofar Festival', '۱۲۵ رویداد فرهنگی، هنری و ورزشی در صلاله مه‌آلود', '125 cultural, art and sport events in misty green Salalah', 'festival', 'صلاله و طاقه', 'Salalah & Taqah', '۲۱ ژوئن تا ۲۱ سپتامبر', 'Jun 21–Sep 21', 5000000),
      X('تئاتر بین‌المللی ظفار', 'Dhofar Int\u2019l Theater Festival', 'دوره دوم با جوایز تا ۵۰,۰۰۰ دلار', 'Second edition with prizes up to $50,000', 'theater', 'صلاله', 'Salalah', '۱۴–۲۲ سپتامبر', 'Sep 14–22', 6500000),
      X('مجسمه‌سازی بین‌المللی ظفار', 'Dhofar Int\u2019l Sculpture Symposium', 'اولین دوره با هنرمندان بین‌المللی در میدان اتین', 'First edition with international artists at Ittin Square', 'exhibition', 'صلاله', 'Salalah', 'خریف ۲۰۲۶', 'Khareef 2026', 3000000),
      X('لاک‌پشت‌های راس الجنز', 'Ras al Jinz Turtle Reserve', 'تخم‌گذاری لاک‌پشت‌های سبز با تور شبانه از مسقط', 'Green turtle nesting on a night tour from Muscat', 'nature', 'راس الجنز', 'Ras al Jinz', 'اوج: مه تا سپتامبر', 'Peak: May–Sep', 7800000),
      X('شنا در وادی شاب', 'Wadi Shab Swim', 'کانیون فیروزه‌ای تا آبشار پنهان غاری', 'Turquoise canyon swim to a hidden cave waterfall', 'nature', 'وادی شاب', 'Wadi Shab', 'تمام سال', 'Year-round', 9000000),
      X('اردوی ربع‌الخالی', 'Empty Quarter Camp', 'شب زیر ستاره در بزرگ‌ترین دریای شنی پیوسته جهان', 'A night under the stars in the largest continuous sand sea on Earth', 'adventure', 'ربع‌الخالی', 'Rub al Khali', 'اکتبر تا مارس', 'Oct–Mar', 32000000),
      X('کوهستان حجر', 'Hajar Mountains', 'طبیعت‌گردی و مقابر عسل‌مانند ۵۰۰۰ ساله', 'Hiking past 5,000-year-old beehive tombs', 'nature', 'جبل اخضر', 'Jebel Akhdar', 'اکتبر تا آوریل', 'Oct–Apr', 14000000),
      X('قلعه و بازار نزوی', 'Nizwa Fort & Souq', 'قلعه تاریخی و بازار جمعه صنایع‌دستی و نقره', 'Historic fort and Friday crafts & silver souq', 'culture', 'نزوی', 'Nizwa', 'به‌ویژه جمعه‌ها', 'Especially Fridays', 4200000),
    ],
  },
  china: {
    id: 'china', code: 'CN', flag: '🇨🇳', currency: 'CNY', currencyFa: 'یوان', nameFa: 'چین', nameEn: 'China',
    theme: 'تکنولوژی، تاریخ و خرید',
    themeEn: 'Tech, history and shopping',
    gateway: 'درگاه CNY · ویزا و احراز هویت الزامی',
    gatewayEn: 'CNY gateway · Visa & KYC required',
    exchangeNote: 'درگاه‌های علی‌پی و وی‌چت از طریق کیف پول',
    exchangeNoteEn: 'Alipay and WeChat via wallet',
    cities: [city('پکن', 'Beijing', 0), city('شانگهای', 'Shanghai', 1), city('گوانگژو', 'Guangzhou', 2), city('شنژن', 'Shenzhen', 3), city('هانگژو', 'Hangzhou', 4), city('شی‌آن', 'Xi\'an', 5)],
    services: [
      S('stays', 'هتل‌های تجاری', 'Business hotels', 'اقامت نزدیک مراکز نمایشگاهی', 'Stays near exhibition centers', '/hotels/search'),
      S('flights', 'پرواز مستقیم', 'Direct flights', 'تهران به پکن و گوانگژو', 'THR to PEK and CAN', '/flights/search'),
      S('transport', 'قطار سریع‌السیر', 'Bullet train', 'شبکه ریلی با سرعت 350km/h', 'High-speed rail network', '/trains'),
      S('visa', 'ویزای تجاری و توریستی', 'China visa', 'گروهی و انفرادی ~۱۴ روز', 'Group & single ~14 days', '/visa'),
      S('esim', 'سیم‌کارت eSIM بدون فیلتر', 'VPN-ready eSIM', 'دسترسی آزاد به اینترنت', 'Unrestricted internet access', '/esim'),
      S('interpreter', 'مترجم تجاری', 'Business Interpreter', 'مترجم مسلط به مذاکرات در گوانگژو', 'Negotiation experts in Guangzhou', '/interpreter'),
      S('money', 'شارژ علی‌پی', 'Alipay Top-up', 'پرداخت با QR در چین', 'QR payments across China', '/wallet'),
      S('transfer', 'ترانسفر فرودگاهی', 'Airport transfer', 'با خودروهای برقی لوکس', 'Premium EV transfers', '/transfers'),
      S('signature', 'تجربه اصیل', 'Signature experiences', 'دیوار چین، نمایش‌های شبانه', 'Great Wall, night shows', '/tours?category=signature'),
      S('tours', 'تورهای تجاری', 'Business tours', 'کانتون‌فیر و بازدید کارخانه', 'Canton Fair & factory visits', '/tours'),
    ],
    journeys: [
      J('سفر تجاری گوانگژو', 'Guangzhou business trip', 'بازدید کارخانه، مترجم و ارسال بار.', 'Factory visit, interpreter and shipping.'),
      J('مسیر طلایی', 'Golden route', 'پکن، شی‌آن و شانگهای در ۱۰ روز.', 'Beijing, Xi\'an and Shanghai in 10 days.'),
      J('سفر تکنولوژی شنژن', 'Shenzhen tech tour', 'بازارهای الکترونیک و مراکز نوآوری.', 'Electronics markets and innovation hubs.'),
    ],
    signatureExperiences: [
      X('دیوار بزرگ موتیانیو', 'Mutianyu Great Wall', 'بخش خلوت‌تر با تله‌کابین و سورتمه', 'Less crowded section with cable car and toboggan', 'culture', 'پکن', 'Beijing', 'بهار و پاییز', 'Spring & Autumn', 3500000),
      X('نمایشگاه کانتون', 'Canton Fair', 'بزرگترین نمایشگاه واردات و صادرات جهان', 'The world\'s largest import and export exhibition', 'exhibition', 'گوانگژو', 'Guangzhou', 'آوریل و اکتبر', 'April & October', 4000000),
      X('کروز رودخانه هوانگ‌پو', 'Huangpu River Cruise', 'تماشای خط آسمان مدرن پودونگ در شب', 'Night view of the futuristic Pudong skyline', 'yacht', 'شانگهای', 'Shanghai', 'تمام سال', 'Year-round', 1800000),
      X('لشکر سفالین', 'Terracotta Army', 'گارد پادشاهی ۸۰۰۰ نفره زیرزمینی', '8,000-strong underground imperial guard', 'culture', 'شی‌آن', 'Xi\'an', 'تمام سال', 'Year-round', 4200000),
      X('دیزنی‌لند شانگهای', 'Shanghai Disneyland', 'بزرگترین قلعه دیزنی با تم پارک ترون', 'Largest Disney castle with TRON lightcycle', 'adventure', 'شانگهای', 'Shanghai', 'تمام سال', 'Year-round', 6500000),
      X('مراسم چای سنتی', 'Traditional Tea Ceremony', 'تجربه مراقبه و تست چای در باغ یویوان', 'Meditation and tea tasting in Yuyuan Garden', 'wellness', 'شانگهای', 'Shanghai', 'تمام سال', 'Year-round', 1200000),
      X('جشنواره یخ هاربین', 'Harbin Ice Festival', 'شهری از یخ با نورپردازی‌های رنگارنگ', 'A city of ice with colorful illuminations', 'festival', 'هاربین', 'Harbin', 'ژانویه تا فوریه', 'Jan–Feb', 5500000),
      X('جنگل آواتار ژانگجیاجی', 'Zhangjiajie Avatar Mountains', 'ستون‌های شنی معلق و پل شیشه‌ای ترسناک', 'Floating sandstone pillars and terrifying glass bridge', 'nature', 'ژانگجیاجی', 'Zhangjiajie', 'سپتامبر تا نوامبر', 'Sep–Nov', 7000000),
      X('تئاتر آکروباتیک', 'Acrobatic Show', 'نمایش خیره‌کننده انعطاف و تعادل در تئاتر چائویانگ', 'Mind-blowing flexibility and balance at Chaoyang', 'theater', 'پکن', 'Beijing', 'تمام سال', 'Year-round', 2200000),
    ],
  },
};

export const COUNTRY_ORDER: CountryId[] = ['iran', 'turkey', 'uae', 'georgia', 'russia', 'oman', 'china'];

export const EXPERIENCE_CATEGORY_META: Record<ExperienceCategory, { fa: string; en: string }> = {
  yacht: { fa: 'یات و قایق', en: 'Yacht & Boat' },
  festival: { fa: 'جشنواره', en: 'Festival' },
  culture: { fa: 'فرهنگ', en: 'Culture' },
  nature: { fa: 'طبیعت', en: 'Nature' },
  wellness: { fa: 'سلامت و اسپا', en: 'Wellness & Spa' },
  nightlife: { fa: 'شبانه', en: 'Nightlife' },
  adventure: { fa: 'ماجراجویی', en: 'Adventure' },
  theater: { fa: 'تئاتر و باله', en: 'Theatre & Ballet' },
  exhibition: { fa: 'نمایشگاه', en: 'Exhibition' },
};

/** انتخاب فیلد دوزبانه بر اساس لوکال */
export function pick(locale: string, fa: string, en: string) {
  return locale === 'en' ? en : fa;
}

/** نام کشور بر اساس لوکال */
export function countryName(id: CountryId, locale: string) {
  const c = COUNTRIES[id];
  if (!c) return id;
  return locale === 'en' ? c.nameEn : c.nameFa;
}
