import { HeroSection } from '@/components/home/HeroSection';
import { 
  SpecialOffersSection, 
  AiPlannerHookSection, 
  DestinationsSection,
  ServicesCatalog, 
  FinancialSection, 
  TrustMarquee, 
  SupportSection 
} from '@/components/home/sections';
import { lt } from '@/lib/lt';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = lt(locale, {
    fa: 'فیروزه - پلتفرم یکپارچه سفر هوشمند',
    en: 'Firuzo - Smart Unified Travel Platform',
    ar: 'فيروزو - منصة السفر الذكية الموحدة',
    zh: 'Firuzo - 智能综合旅游平台',
    ru: 'Firuzo - Интеллектуальная платформа путешествий'
  });
  const description = lt(locale, {
    fa: 'پلتفرم یکپارچه سفر فیروزه - رزرو پرواز، هتل، قطار، تور و خدمات مالی چند ارزی',
    en: 'Firuzo unified travel platform - Book flights, hotels, trains, tours and multi-currency services',
    ar: 'منصة فيروزو الموحدة للسفر - حجز رحلات طيران، فنادق، قطارات، جولات وخدمات مالية',
    zh: 'Firuzo 综合旅游平台 - 预订机票、酒店、火车票、旅游团及多币种支付服务',
    ru: 'Единая платформа путешествий Firuzo - бронирование авиабилетов, отелей, поездов, туров и мультивалютных услуг'
  });

  return {
    // absolute: the root layout template already appends the brand name.
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
      {/* 1. Primary Focus: Hero & Unified Search Engine */}
      <HeroSection />

      {/* 2. Secondary Focus: Smart Planning Hook (Visually connected to Hero) */}
      <div className="-mt-8 relative z-20">
        <AiPlannerHookSection />
      </div>

      <div className="flex flex-col gap-8 md:gap-16 pt-12 pb-24">
        {/* 3. Discovery: Personalized Signature Recommendations */}
        <SpecialOffersSection />

        {/* 4. Exploration: Destination Discovery */}
        <DestinationsSection />

        {/* 5. Utility: Integrated Travel Services */}
        <ServicesCatalog />
      </div>

      <div className="bg-surface border-t border-line/60">
        {/* 6. Trust & Security: Financials & Support */}
        <div className="opacity-90">
          <TrustMarquee />
        </div>
        <FinancialSection />
        <SupportSection />
      </div>
    </div>
  );
}
