'use client';

import { useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { useBookingStore } from '@/stores/booking-store';
import { COUNTRIES, EXPERIENCE_CATEGORY_META, countryName } from '@/lib/countries';
import { daysFromNow } from '@/lib/utils';
import { num } from '@/lib/format';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import {
  ArrowLeft, Wallet, ShieldCheck, RefreshCcw, CheckCircle2, Headset, Sparkles,
  Plane, BedDouble, Compass, CarTaxiFront, TrainFront, Wifi, Languages, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';

/* پیشنهادهای ویژه — برای هر کشور از تجربه‌های اصیل همان مقصد ساخته می‌شود */
export function SpecialOffersSection() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Home');
  const t2 = useTranslations('Plan');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (offset: number) => scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });

  const offers = (() => {
    const ex = c.signatureExperiences;
    const picked: typeof ex = [];
    const push = (cat?: string) => {
      const found = ex.find((e) => (!cat || e.category === cat) && !picked.includes(e));
      if (found) picked.push(found);
    };
    push('yacht');
    push('festival');
    push();
    return picked.slice(0, 3);
  })();

  function book(title: string, where: string, amount: number) {
    useBookingStore.getState().setBookingContext({
      type: 'tours',
      title,
      subtitle: `${where} • ${countryName(country, locale)}`,
      amount,
      travelDate: daysFromNow(21),
    });
    router.push('/checkout');
  }

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/30">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-brand-dark font-black tracking-wide text-[11px]">{c.flag} {t('offersKicker')}</p>
            <h2 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">
              {t('offersTitle', { country: countryName(country, locale) })}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => scroll(locale === 'en' ? -300 : 300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <ChevronRight size={18} className="ltr:-scale-x-100" />
            </button>
            <button onClick={() => scroll(locale === 'en' ? 300 : -300)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <ChevronLeft size={18} className="ltr:-scale-x-100" />
            </button>
            <button
              onClick={() => router.push('/plan')}
              className="hidden md:inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-brand text-surface text-[13px] font-black whitespace-nowrap hover:bg-brand-2 transition shadow-sm shadow-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles size={14} /> {t2('plannerCta')}
            </button>
            <button
              onClick={() => router.push('/tours?category=signature')}
              className="hidden md:inline-flex items-center gap-1.5 text-brand-dark text-[13px] font-bold whitespace-nowrap hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('offersAll')} <ArrowLeft size={15} className="ltr:-scale-x-100" />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-6 hide-scrollbar">
          {offers.map((offer) => {
            const Icon = CATEGORY_ICONS[offer.category];
            const catLabel = locale === 'en'
              ? EXPERIENCE_CATEGORY_META[offer.category].en
              : EXPERIENCE_CATEGORY_META[offer.category].fa;
            const title = locale === 'en' ? offer.titleEn : offer.title;
            const desc = locale === 'en' ? offer.descEn : offer.desc;
            const when = locale === 'en' ? offer.whenEn : offer.when;
            return (
              <button
                key={offer.titleEn}
                onClick={() => book(locale === 'en' ? offer.titleEn : offer.title, locale === 'en' ? offer.whereEn : offer.where, offer.fromPrice)}
                className="shrink-0 w-[280px] md:w-auto snap-start bg-surface rounded-xl shadow-sm overflow-hidden hover:shadow-elev-1 transition-shadow group cursor-pointer border border-line/40 text-start focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className={`h-[150px] relative overflow-hidden bg-gradient-to-br ${
                  offer.category === 'yacht' ? 'from-brand/90 to-brand-dark/90'
                  : offer.category === 'festival' ? 'from-brand to-action'
                  : offer.category === 'nightlife' ? 'from-action/90 to-action'
                  : offer.category === 'wellness' ? 'from-teal-500 to-emerald-700'
                  : offer.category === 'theater' ? 'from-amber-500 to-orange-600'
                  : offer.category === 'exhibition' ? 'from-blue-500 to-indigo-700'
                  : 'from-brand to-brand-dark'
                } ph-texture`}>
                  <span className="absolute inset-0 grid place-items-center text-surface/90">
                    <Icon size={54} strokeWidth={1.4} />
                  </span>
                  <span className="absolute top-4 end-4 inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur px-2.5 py-1 rounded-full text-[10.5px] font-black text-brand-dark">
                    <Icon size={12} /> {catLabel}
                  </span>
                  <span className="absolute bottom-4 end-5 text-xl font-black text-surface drop-shadow">{title}</span>
                </div>
                <div className="p-5 flex flex-col gap-2">
                  <p className="text-[12.5px] font-bold text-sub leading-relaxed line-clamp-2 m-0">{desc}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-extrabold text-sub inline-flex items-center gap-1">
                      <Icon size={13} className="text-brand-dark" /> {when}
                    </span>
                    <span className="text-[14px] font-black text-brand-dark num">
                      {t('fromPrice', { price: num(offer.fromPrice, locale) })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TrustMarquee() {
  const t = useTranslations('Home');
  const items = t.raw('trust') as string[];
  const row = [...items, ...items];
  return (
    <div className="border-y border-line/60 bg-surface py-3 overflow-hidden" dir="ltr">
      <div className="marquee-track gap-8">
        {row.map((txt, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[12px] font-extrabold text-sub whitespace-nowrap">
            <CheckCircle2 size={14} className="text-success" /> {txt}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---- Bento services (mockup firuzo_page_1) ---- */
const BENTO = [
  {
    key: 'flights',
    href: '/flights/search',
    labelKey: 'bentoFlightsLabel',
    titleKey: 'bentoFlightsTitle',
    descKey: 'bentoFlightsDesc',
    ctaKey: 'bentoFlightsCta',
    Icon: Plane,
    img: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&q=70&w=1400',
  },
  {
    key: 'hotels',
    href: '/hotels/search',
    labelKey: 'bentoHotelsLabel',
    titleKey: 'bentoHotelsTitle',
    Icon: BedDouble,
    img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=70&w=900',
  },
  {
    key: 'tours',
    href: '/tours',
    labelKey: 'bentoToursLabel',
    titleKey: 'bentoToursTitle',
    Icon: Compass,
    img: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=70&w=900',
  },
] as const;

const SERVICE_ICONS: Record<string, LucideIcon> = {
  stays: BedDouble,
  flights: Plane,
  tours: Compass,
  transfer: CarTaxiFront,
  transport: TrainFront,
  visa: ShieldCheck,
  money: Wallet,
  esim: Wifi,
  insurance: ShieldCheck,
  signature: Sparkles,
  interpreter: Languages,
};

export function ServicesCatalog() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];
  const [main, hotels, tours] = BENTO;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (offset: number) => scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });

  return (
    <section id="services" className="relative pt-6 md:pt-8 pb-12 md:pb-16">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:h-[500px]">
          {/* Main feature card — flights */}
          <button
            onClick={() => router.push(main.href)}
            className="md:col-span-8 min-h-[300px] md:min-h-0 rounded-2xl overflow-hidden relative group text-start shadow-elev-1 bg-surface focus-visible:ring-2 focus-visible:ring-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={main.img}
              alt={t(main.labelKey)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 flex flex-col justify-end h-full">
              <div className="flex items-center gap-3 text-mint-bright mb-2">
                <span className="p-2.5 bg-surface/20 rounded-full backdrop-blur-sm">
                  <main.Icon size={18} />
                </span>
                <span className="font-bold text-[13px] tracking-wide">{t(main.labelKey)}</span>
              </div>
              <h3 className="text-surface mb-2.5 text-2xl md:text-[32px] leading-[1.35] font-black">{t(main.titleKey)}</h3>
              <p className="text-surface/80 max-w-md text-sm leading-relaxed line-clamp-2">{t(main.descKey)}</p>
              <span className="mt-5 inline-flex w-fit items-center gap-2 bg-surface/20 hover:bg-surface/30 backdrop-blur-md text-surface px-5 py-2 rounded-full font-bold text-[13px] transition-all">
                {t(main.ctaKey)}
                <ArrowLeft size={15} className="ltr:-scale-x-100" />
              </span>
            </div>
          </button>

          {/* Secondary stack — hotels + tours */}
          <div className="md:col-span-4 flex flex-col gap-5">
            {[hotels, tours].map((card) => (
              <button
                key={card.key}
                onClick={() => router.push(card.href)}
                className="flex-1 min-h-[180px] rounded-2xl overflow-hidden relative group text-start shadow-elev-1 bg-surface focus-visible:ring-2 focus-visible:ring-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.img}
                  alt={t(card.labelKey)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <div className="flex items-center gap-2 text-mint-bright mb-1">
                    <card.Icon size={16} />
                    <span className="font-bold text-[12px]">{t(card.labelKey)}</span>
                  </div>
                  <h4 className="text-surface text-xl md:text-2xl font-black">{t(card.titleKey)}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Country service catalog — Large Grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <p className="mb-0 text-brand-dark font-black tracking-wide text-[13px]">
              {t('catalogKicker', { country: countryName(country, locale) })}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => scroll(locale === 'en' ? -300 : 300)} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <ChevronRight size={16} className="ltr:-scale-x-100" />
              </button>
              <button onClick={() => scroll(locale === 'en' ? 300 : -300)} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-line text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <ChevronLeft size={16} className="ltr:-scale-x-100" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 hide-scrollbar">
            {c.services.map((s) => {
              const Icon = SERVICE_ICONS[s.key] || Compass;
              return (
                <button
                  key={s.key}
                  onClick={() => router.push(s.href)}
                  title={locale === 'en' ? s.descEn : s.desc}
                  className="shrink-0 w-[260px] sm:w-auto snap-start group flex flex-col items-start text-start p-5 rounded-xl bg-surface border border-line shadow-sm hover:border-brand/40 hover:bg-mint/30 hover:shadow-elev-1 transition-all duration-300 card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="w-10 h-10 mb-3 grid place-items-center rounded-full bg-soft text-brand-dark group-hover:bg-brand group-hover:text-surface transition-colors">
                    <Icon size={20} />
                  </span>
                  <h4 className="text-[15px] font-black text-ink mb-1 group-hover:text-brand-dark transition-colors">
                    {locale === 'en' ? s.titleEn : s.title}
                  </h4>
                  <p className="text-[12px] font-bold text-sub leading-relaxed line-clamp-2">
                    {locale === 'en' ? s.descEn : s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinancialSection() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  return (
    <section className="pb-12 md:pb-16 bg-paper">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-6 p-6 md:p-8 rounded-xl bg-surface border border-line shadow-elev-1">
          <div>
            <p className="mb-2.5 text-brand-dark font-black tracking-wide text-[11px]">
              {t('finKicker', { country: countryName(country, locale) })}
            </p>
            <h2 className="m-0 mb-3 text-2xl md:text-[30px] font-black leading-snug tracking-tight">
              {t('finTitle', { currency: c.currency })}
            </h2>
            <p className="m-0 max-w-[610px] text-sub text-sm leading-relaxed">
              {t('finDesc')}
            </p>
            <button
              onClick={() => router.push('/wallet')}
              className="mt-5 min-h-11 px-6 rounded-full bg-brand hover:bg-brand-2 text-surface font-bold text-sm transition inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('finCta')} <ArrowLeft size={15} className="ltr:-scale-x-100" />
            </button>
            <p className="mt-3 mb-0 text-sub text-[10px] font-bold">
              {t('finNote')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-center">
            {([
              [Wallet, t('finSettle'), `${c.currency} · ${c.currencyFa}`],
              [ShieldCheck, t('finGateway'), locale === 'en' ? c.gatewayEn : c.gateway],
              [RefreshCcw, t('finExchange'), locale === 'en' ? c.exchangeNoteEn : c.exchangeNote],
            ] as [LucideIcon, string, string][]).map(([Icon, txt, d], i) => (
              <div key={txt} className={`min-h-[100px] p-3.5 border border-line/80 rounded-xl bg-soft/60 ${i === 2 ? 'sm:col-span-2' : ''}`}>
                <Icon size={19} className="text-brand-dark mb-2" />
                <b className="block text-xs font-black">{txt}</b>
                <span className="block mt-1 text-[10px] leading-relaxed text-sub" dir="auto">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const CITY_HEIGHTS = ['h-[240px]', 'h-[320px]', 'h-[280px]', 'h-[340px]', 'h-[250px]', 'h-[300px]'];

export function DestinationsSection() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();
  const c = COUNTRIES[country];

  // فقط URL های HEAD-تست‌شده (200). جای خالی = placeholder زمردی (لیست جایگزینی در HANDOFF.md)
  const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=700`;
  const IMGS: Record<string, string[]> = {
    iran: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Azadi_Tower_in_the_spring.jpg/960px-Azadi_Tower_in_the_spring.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Imam_Reza_shrine.jpg/960px-Imam_Reza_shrine.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Si-o-se-Pol.jpg/960px-Si-o-se-Pol.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Tomb_of_Hafez_%28HG75481%29.jpg/960px-Tomb_of_Hafez_%28HG75481%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/El-Goli_Park.jpg/960px-El-Goli_Park.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Kish_-_panoramio_-_Farid_Atar_%282%29.jpg/960px-Kish_-_panoramio_-_Farid_Atar_%282%29.jpg',
    ],
    turkey: [
      U('photo-1524231757912-21f4fe3a7200'),
      U('photo-1520250497591-112f2f40a3f4'),
      U('photo-1641128324972-af3212f0f6bd'),
      U('photo-1533105079780-92b9be482077'),
      U('photo-1544986581-efac024faf62'),
      U('photo-1629807469792-b430638ce2de'),
    ],
    uae: [
      U('photo-1512453979798-5ea266f8880c'),
      U('photo-1518684079-3c830dcef090'),
      U('photo-1579564032596-f3089d71decf'),
      U('photo-1582650517303-b42616d56fba'),
      U('photo-1578508933454-07ec8293962b'),
      U('photo-1581451528655-1f95d1bd2906'),
    ],
    georgia: [
      U('photo-1565008447742-97f6f38c985c'),
      U('photo-1621350616196-a1c1d4a0f441'),
      U('photo-1598379654157-5e6fa9a826d9'),
      U('photo-1542456429-0cbce3674b88'),
      U('photo-1563212882-d2780e909282'),
      U('photo-1601625463688-661ff977b311'),
    ],
    russia: [
      U('photo-1513326738677-b964603b136d'),
      U('photo-1547448415-e9f5b28e570d'),
      U('photo-1555026725-b82bf9798547'),
      U('photo-1574384950338-7bb73dc50cfa'),
      U('photo-1586523927632-6ba12c3f5a25'),
      U('photo-1608678663809-5481d6db0d36'),
    ],
    oman: [
      U('photo-1512632578888-169bbbc64f33'),
      U('photo-1591873998964-b0d6948d89e7'),
      U('photo-1638202353133-c23fbeeb4554'),
      U('photo-1592659762303-90081d34b277'),
      U('photo-1610486001258-0d12e8316fc1'),
      U('photo-1607593235650-8b17a02cfa6c'),
    ],
    china: [
      U('photo-1508804185872-d7badad00f7d'),
      U('photo-1505318625907-9e735e5d3c8c'),
      U('photo-1583248369069-9d91f1640fe6'),
      U('photo-1517511620701-4828114a8040'),
      U('photo-1549421255-a4b518ea91eb'),
      U('photo-1553531607-bb2cc62908f9'),
    ]
  };

  return (
    <>
      <section id="destinations" className="py-12 md:py-16 bg-soft/60">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10">
          <div className="flex items-end justify-between gap-5 mb-7">
            <div>
              <p className="mb-2 text-brand-dark font-black tracking-wide text-[11px]">{t('destKicker')}</p>
              <h2 className="m-0 text-2xl md:text-[32px] font-black tracking-tight">
                {t('destTitle', { country: countryName(country, locale) })}
              </h2>
            </div>
            <button onClick={() => router.push('/destinations')} className="hidden md:inline-flex items-center gap-1.5 text-brand-dark text-[13px] font-bold whitespace-nowrap hover:gap-2.5 transition-all focus-visible:ring-2 focus-visible:ring-brand">
              {t('allDestinations')} <ArrowLeft size={15} className="ltr:-scale-x-100" />
            </button>
          </div>

          <div className="masonry-grid">
            {c.cities.map((cityItem, i) => {
              const img = (IMGS[country] ?? IMGS.iran)[i % 6];
              const cityName = locale === 'en' ? cityItem.en : cityItem.fa;
              return (
                <button
                  key={cityItem.en}
                  onClick={() => router.push(cityItem.href)}
                  className={`masonry-item group img-overlay relative ${CITY_HEIGHTS[i % CITY_HEIGHTS.length]} w-full flex items-end overflow-hidden p-5 rounded-2xl text-surface text-end bg-brand-dark ph-texture focus-visible:ring-2 focus-visible:ring-brand`}
                >
                  {img && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={img}
                      alt={cityName}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      loading="lazy"
                    />
                  )}
                  <div className="relative w-full">
                    <h3 className="m-0 text-xl md:text-2xl font-black tracking-tight">{cityName}</h3>
                    <p className="mt-1 mb-0 text-surface/75 text-[11px] font-bold" dir="ltr">{cityItem.en}</p>
                  </div>
                  <span className="absolute bottom-4 start-4 w-8 h-8 grid place-items-center rounded-full bg-surface/90 text-brand-dark transition group-hover:bg-mint-bright group-hover:text-ink">
                    <ArrowLeft size={14} className="ltr:-scale-x-100" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}


export function AiPlannerHookSection() {
  const router = useRouter();
  const locale = useLocale();
  const isEn = locale === 'en';
  const { country } = useCountryStore();
  const c = COUNTRIES[country];
  const cName = countryName(country, locale);

  const presets = [
    { label: isEn ? `3 Days Solo in ${c.nameEn}` : `۳ روزه انفرادی در ${cName}`, href: `/plan?dest=${country}&who=solo&days=3&bud=balanced` },
    { label: isEn ? `5 Days Family in ${c.nameEn}` : `۵ روزه خانوادگی در ${cName}`, href: `/plan?dest=${country}&who=family&days=5&bud=balanced` },
    { label: isEn ? `7 Days Leisure & Luxury` : `۷ روزه لوکس و تفریحی`, href: `/plan?dest=${country}&who=duo&days=7&bud=luxury` },
  ];

  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-mint/40 via-surface to-surface border-y border-line/60">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="p-6 md:p-8 rounded-2xl bg-surface border-2 border-brand/20 shadow-elev-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -end-10 -bottom-10 w-48 h-48 rounded-full bg-mint/50 pointer-events-none blur-2xl" />
          
          <div className="max-w-2xl relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark font-black text-xs mb-3 shadow-xs">
              <Sparkles size={14} className="animate-pulse" /> {isEn ? 'AI Smart Travel Planner' : 'برنامه‌ریز هوشمند سفر iTrip'}
            </span>
            <h2 className="text-2xl md:text-[28px] font-black text-ink m-0 tracking-tight leading-snug">
              {isEn ? `Design your personalized trip to ${c.nameEn} in seconds` : `برنامه سفر اختصاصی خود به ${cName} را در چند ثانیه بسازید`}
            </h2>
            <p className="text-sub text-xs md:text-sm leading-relaxed m-0 mt-2">
              {isEn 
                ? 'Tell us your duration, budget, and travel style. iTrip instantly packages the best flights, verified hotels, and signature activities with guaranteed pricing.'
                : 'تعداد روز، بودجه و علایق خود را مشخص کنید؛ سیستم هوشمند iTrip پرواز، هتل و تجربیات اصیل روزانه را به همراه قیمت قطعی می‌چیند.'}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => router.push(p.href)}
                  className="min-h-8 px-3.5 rounded-full text-xs font-bold bg-soft border border-line hover:border-brand hover:text-brand-dark hover:bg-mint/40 transition-all text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {p.label} →
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0 relative">
            <button
              onClick={() => router.push('/plan')}
              className="min-h-12 px-7 rounded-full bg-action hover:bg-action-hover text-[#14201f] font-black text-sm transition shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles size={16} />
              {isEn ? 'Start Smart Planning' : 'شروع چیدمان هوشمند'}
            </button>
            <button
              onClick={() => router.push('/tours')}
              className="min-h-12 px-6 rounded-full bg-surface border border-line hover:border-brand text-sub hover:text-ink font-bold text-xs transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {isEn ? 'Browse Fixed Tour Packages' : 'مشاهده پکیج‌های آماده'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


export function SupportSection() {
  const router = useRouter();
  const t = useTranslations('Home');
  return (
    <section className="py-12 md:py-16">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10">
          <div className="flex flex-col md:flex-row md:items-center gap-5 p-6 md:p-8 rounded-2xl text-surface bg-gradient-to-l from-brand to-brand-dark relative overflow-hidden shadow-elev-2">
            <span className="absolute -start-20 -top-28 w-56 h-56 rounded-full border-[32px] border-surface/20 pointer-events-none" />
            <div className="relative flex-1">
              <h2 className="m-0 mb-1.5 text-2xl font-black tracking-tight">{t('supportTitle')}</h2>
              <p className="m-0 text-mint-bright/90 text-[13px]">
                {t('supportDesc')}
              </p>
            </div>
            <div className="relative flex gap-2 shrink-0">
              <button onClick={() => router.push('/support')} className="inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-surface text-brand-dark font-bold text-sm hover:bg-mint transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <Headset size={15} /> {t('supportCta')}
              </button>
              <button onClick={() => router.push('/guide')} className="inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full border border-surface/50 text-surface font-bold text-sm hover:bg-surface/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {t('guideCta')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {([
              [t('usp1Title'), t('usp1Desc')],
              [t('usp2Title'), t('usp2Desc')],
              [t('usp3Title'), t('usp3Desc')],
            ] as [string, string][]).map(([title, d]) => (
              <div key={title} className="flex gap-3 pb-3.5 border-b border-line last:border-0">
                <span className="w-9 h-9 grid place-items-center rounded-full bg-mint text-brand-dark shrink-0"><CheckCircle2 size={17} /></span>
                <div>
                  <h3 className="m-0 mb-0.5 text-sm font-black">{title}</h3>
                  <p className="m-0 text-sub text-xs leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
