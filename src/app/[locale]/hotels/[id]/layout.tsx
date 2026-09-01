import { Metadata } from 'next';
import { HOTELS } from '@/lib/data';

export async function generateStaticParams() {
  return HOTELS.map((hotel) => ({
    id: hotel.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const hotel = HOTELS.find((h) => h.id === id);

  if (!hotel) {
    return {
      title: 'Hotel Not Found | Firuzo',
    };
  }

  const title = `${hotel.name} | ${locale === 'fa' ? 'رزرو هتل لوکس در فیروزه' : 'Luxury Hotel Booking | Firuzo'}`;
  const description = `${hotel.name} - ${hotel.stars} Stars, ${hotel.city}. Verified by Firuzo with instant voucher issuing.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.jpg'],
    },
  };
}

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
