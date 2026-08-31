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
