import { HeroSection } from '@/components/home/HeroSection';
import {
  QuickServicesBar,
  PromotionalBanners,
  PopularFlightsSection,
  SpecialOffersSection,
  DestinationsSection,
  AiPlannerHookSection,
  AppDownloadSection,
  WhyFiruzoSection,
  FaqSection,
  TrustMarquee,
  SupportSection
} from '@/components/home/sections';
import { lt } from '@/lib/lt';
import { getLocale } from 'next-intl/server';
import { DestinationComparator } from '@/components/destinations/DestinationComparator';
import {
  SiteContentService,
  type HeroOverride,
  type PromoBannerOverride,
  type PopularRouteOverride,
  type FaqItemOverride,
  type AnnouncementOverride,
  type SupportOverride,
} from '@/domains/content/SiteContentService';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = lt(locale, {
    fa: 'فیروزو - پلتفرم یکپارچه سفر هوشمند | خرید بلیط هواپیما، هتل و تور',
    en: 'Firuzo - Smart Unified Travel Platform | Flights, Hotels & Tours',
    ar: 'فيروزو - منصة السفر الذكية الموحدة | حجز طيران، فنادق وجولات',
    zh: 'Firuzo - 智能综合旅游平台 | 机票、酒店与旅游预订',
    ru: 'Firuzo - Платформа путешествий | Авиабилеты, отели и туры'
  });
  const description = lt(locale, {
    fa: 'خرید آنلاین بلیط هواپیما، رزرو هتل، قطار، تورهای مسافرتی و خدمات سفر با قیمت شفاف و استرداد طبق قوانین در فیروزو.',
    en: 'Book flight tickets, hotels, trains, travel packages and concierge services with transparent pricing and standard refund policies on Firuzo.',
    ar: 'حجز تذاكر الطيران والفنادق والقطارات والجولات السياحية مع شفافية الأسعار وسياسات الاسترداد المعتمدة.',
    zh: '在 Firuzo 在线预订机票、酒店、火车票及旅游套餐，尊享透明价格与规范退改保障。',
    ru: 'Онлайн бронирование авиабилетов, отелей, поездов и туров с прозрачными ценами.'
  });

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// CMS overrides are optional: every block falls back to its shipped defaults
// when the admin has not customized (or has reset) the corresponding key.
export default async function HomePage() {
  const locale = await getLocale();
  const [hero, promos, routes, faq, announcement, support] = await Promise.all([
    SiteContentService.get<HeroOverride>('home.hero'),
    SiteContentService.get<PromoBannerOverride[]>('home.promos'),
    SiteContentService.get<PopularRouteOverride[]>('home.routes'),
    SiteContentService.get<FaqItemOverride[]>('home.faq'),
    SiteContentService.get<AnnouncementOverride>('site.announcement'),
    SiteContentService.get<SupportOverride>('home.support'),
  ]);

  const activeAnnouncement = announcement?.active ? announcement : null;

  return (
    <div className="flex flex-col min-h-screen bg-soft/20">
      {/* 0. Global announcement banner (ERP → Quick Actions) */}
      {activeAnnouncement && (
        <div
          role="status"
          className={`mx-4 md:mx-8 mt-3 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 ${
            activeAnnouncement.tone === 'critical'
              ? 'border-destructive/30 bg-destructive/10'
              : activeAnnouncement.tone === 'info'
                ? 'border-brand/30 bg-brand/10'
                : 'border-gold/40 bg-gold-soft/50'
          }`}
        >
          <span className="text-xs font-black text-ink">{lt(locale, activeAnnouncement.title)}</span>
          <span className="text-xs font-bold text-sub leading-relaxed">{lt(locale, activeAnnouncement.message)}</span>
        </div>
      )}

      {/* On Mobile: Quick Access Service Icons Grid right at top (Snapp/Alibaba Super-App Pattern) */}
      <div className="md:hidden">
        <QuickServicesBar />
      </div>

      {/* 1. Hero & Unified Flight/Hotel/Tour Search Engine */}
      <HeroSection override={hero ?? undefined} />

      {/* On Desktop: Sleek Quick Access Service Bar below Hero */}
      <div className="hidden md:block">
        <QuickServicesBar />
      </div>

      <div className="flex flex-col gap-8 md:gap-14 pt-4 md:pt-8 pb-16">
        {/* 3. High-Impact Promotional Banners */}
        <PromotionalBanners override={promos ?? undefined} />

        {/* 4. Trending & Best-Selling Flight Routes with Real Prices */}
        <PopularFlightsSection override={routes ?? undefined} />

        {/* 5. Personalized Signature Experiences & Offers */}
        <SpecialOffersSection />

        {/* 6. Top Destination Cities & Stays */}
        <DestinationsSection />

        {/* 6.5. Interactive Destination Comparison Matrix (VoyageAI pattern) */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 w-full">
          <DestinationComparator locale={locale} />
        </section>

        {/* 7. Conversational AI Assistant & Custom Trip Builder */}
        <AiPlannerHookSection />

        {/* 8. Mobile App Download Banner */}
        <AppDownloadSection />

        {/* 9. Why Firuzo? Trust & Guarantees */}
        <WhyFiruzoSection />

        {/* 10. Frequently Asked Questions Accordion */}
        <FaqSection override={faq ?? undefined} />
      </div>

      <div className="bg-surface border-t border-line/60">
        {/* 11. Trust Marquee & 24/7 Concierge Support */}
        <div className="opacity-90">
          <TrustMarquee />
        </div>
        <SupportSection override={support ?? undefined} />
      </div>
    </div>
  );
}
