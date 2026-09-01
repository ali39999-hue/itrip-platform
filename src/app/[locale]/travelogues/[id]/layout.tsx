import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  return {
    title: `${locale === 'fa' ? 'سفرنامه' : 'Travelogue'} #${id} | Firuzo`,
    description: 'Authentic traveler journeys, tips, and visual itineraries on Firuzo.',
  };
}

export default function TravelogueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
