import type { Metadata } from 'next';
import { getTourById } from '@/services/tours-service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TourMeta = {
  title: string;
  titleEn?: string | null;
  durationDays?: number;
  city?: string;
  summary?: string;
  summaryEn?: string | null;
  heroImage?: string;
  gallery?: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  let tour: TourMeta | undefined = getTourById(id);

  if (!tour) {
    const dbTour = await prisma.tour.findUnique({ where: { id } }).catch(() => null);
    if (dbTour) {
      tour = {
        title: dbTour.title,
        titleEn: dbTour.titleEn,
        durationDays: dbTour.durationDays,
        city: dbTour.city,
        summary: dbTour.summary || undefined,
        summaryEn: dbTour.summaryEn,
        heroImage: dbTour.heroImage || undefined,
        gallery: dbTour.gallery,
      };
    }
  }

  if (!tour) {
    return {
      title: 'Tour Not Found | Firuzo',
    };
  }

  const title = locale === 'fa'
    ? `${tour.title} | تور مسافرتی فیروزه`
    : `${tour.titleEn || tour.title} | Firuzo Travel Tours`;

  const description = locale === 'fa'
    ? (tour.summary || `${tour.title} - ${tour.durationDays} روزه در ${tour.city}. با برنامه سفر کامل، هتل ۵ ستاره و پشتیبانی ۲۴ ساعته.`)
    : (tour.summaryEn || `${tour.titleEn || tour.title} - ${tour.durationDays} days in ${tour.city}. Curated itinerary, luxury accommodation, and 24/7 support.`);

  const ogImage = tour.heroImage || (tour.gallery && tour.gallery[0]) || '/og-image.jpg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function TourDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
