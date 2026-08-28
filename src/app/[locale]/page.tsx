import { HeroSection } from '@/components/home/HeroSection';
import { 
  SpecialOffersSection, 
  AiPlannerHookSection, 
  ServicesCatalog, 
  DestinationsSection, 
  FinancialSection, 
  TrustMarquee, 
  SupportSection 
} from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Primary Action: Hero & Unified Search Widget */}
      <HeroSection />

      {/* 2. Personalized Smart Planning Hook */}
      <AiPlannerHookSection />

      {/* 3. Curated Signature Experiences (Country-Specific) */}
      <SpecialOffersSection />

      {/* 4. Core Travel Services Bento Catalog */}
      <ServicesCatalog />

      {/* 5. Destination City Discovery */}
      <DestinationsSection />

      {/* 6. Financial Security, Settle in Local Currency & Trust */}
      <TrustMarquee />
      <FinancialSection />

      {/* 7. 24/7 Concierge Support & Travel Assistance */}
      <SupportSection />
    </div>
  );
}
