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
    <div className="flex flex-col min-h-screen">
      {/* 1. Primary Action: Hero & Unified Search Engine */}
      <HeroSection />

      {/* 2. Personalized Smart Planning Conversational Hook */}
      <AiPlannerHookSection />

      {/* 3. Personalized Signature Recommendations & Experiences */}
      <SpecialOffersSection />

      {/* 4. Destination Discovery & City Exploration */}
      <DestinationsSection />

      {/* 5. Integrated Travel Services Bento Catalog */}
      <ServicesCatalog />

      {/* 6. Financial Security, Settle in Local Currency & Trust */}
      <TrustMarquee />
      <FinancialSection />

      {/* 7. 24/7 Concierge Support & Travel Assistance */}
      <SupportSection />
    </div>
  );
}
