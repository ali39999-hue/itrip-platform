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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = lt(locale, {
    fa: 'فیروزه - پلتفرم یکپارچه سفر هوشمند | خرید بلیط هواپیما، هتل و تور',
    en: 'Firuzo - Smart Unified Travel Platform | Flights, Hotels & Tours',
    ar: 'فيروزو - منصة السفر الذكية الموحدة | حجز طيران، فنادق وجولات',
    zh: 'Firuzo - 智能综合旅游平台 | 机票、酒店与旅游预订',
    ru: 'Firuzo - Платформа путешествий | Авиабилеты, отели и туры'
  });
  const description = lt(locale, {
    fa: 'خرید آنلاین بلیط هواپیما، رزرو هتل، قطار، تورهای مسافرتی و بیمه سامان با تضمین کمترین قیمت و استرداد آنی در فیروزه.',
    en: 'Book flight tickets, hotels, trains, travel packages and insurance with lowest price guarantee and instant refund on Firuzo.',
    ar: 'حجز تذاكر الطيران والفنادق والقطارات والجولات السياحية مع ضمان أقل سعر.',
    zh: '在 Firuzo 在线预订机票、酒店、火车票及旅游套餐，尊享全网低价与极速退改保障。',
    ru: 'Онлайн бронирование авиабилетов, отелей, поездов и туров с гарантией лучшей цены.'
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

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-soft/20">
      {/* 1. Hero & Unified Flight/Hotel/Tour Search Engine */}
      <HeroSection />

      {/* 2. Sleek Quick Access Service Bar (FlyToday / Alibaba pattern) */}
      <QuickServicesBar />

      <div className="flex flex-col gap-12 md:gap-20 pt-10 pb-20">
        {/* 3. High-Impact Promotional Banners */}
        <PromotionalBanners />

        {/* 4. Trending & Best-Selling Flight Routes with Real Prices */}
        <PopularFlightsSection />

        {/* 5. Personalized Signature Experiences & Offers */}
        <SpecialOffersSection />

        {/* 6. Top Destination Cities & Stays */}
        <DestinationsSection />

        {/* 7. Conversational AI Assistant & Custom Trip Builder */}
        <AiPlannerHookSection />

        {/* 8. Mobile App Download Banner */}
        <AppDownloadSection />

        {/* 9. Why Firuzo? Trust & Guarantees */}
        <WhyFiruzoSection />

        {/* 10. Frequently Asked Questions Accordion */}
        <FaqSection />
      </div>

      <div className="bg-surface border-t border-line/60">
        {/* 11. Trust Marquee & 24/7 Concierge Support */}
        <div className="opacity-90">
          <TrustMarquee />
        </div>
        <SupportSection />
      </div>
    </div>
  );
}
