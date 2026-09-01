import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  return {
    title: `${locale === 'fa' ? 'جزئیات سفر و واچر' : 'Trip Details & Voucher'} #${id} | Firuzo`,
    description: 'View your verified booking confirmation, flight details, and itinerary voucher on Firuzo.',
  };
}

export default function MyTripLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
