import type { Metadata } from 'next';
import { ContentDomainService } from '@/domains/content/ContentDomainService';

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
  let tour: TourMeta | undefined;

  const resolvedTour = await ContentDomainService.getTourById(id);
  if (resolvedTour) {
    tour = {
      title: String(resolvedTour.title || ''),
      titleEn: resolvedTour.titleEn ? String(resolvedTour.titleEn) : null,
      durationDays: typeof resolvedTour.durationDays === 'number' ? resolvedTour.durationDays : undefined,
      city: resolvedTour.city ? String(resolvedTour.city) : undefined,
      summary: resolvedTour.summary ? String(resolvedTour.summary) : undefined,
      summaryEn: resolvedTour.summaryEn ? String(resolvedTour.summaryEn) : null,
      heroImage: resolvedTour.heroImage ? String(resolvedTour.heroImage) : undefined,
      gallery: Array.isArray(resolvedTour.gallery) ? (resolvedTour.gallery as string[]) : undefined,
    };
  }

  if (!tour) {
    return {
      title: 'Tour Not Found | Firuzo',
    };
  }

  const title = locale === 'fa'
    ? `${tour.title} | تور مسافرتی فیروزو`
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
