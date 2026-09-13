import { NextRequest, NextResponse } from 'next/server';
import { getTourById } from '@/services/tours-service';
import { prisma } from '@/lib/prisma';
import type { Tour } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Tour ID is required' }, { status: 400 });
    }

    // DB tour is authoritative (seed.ts mirrors static tours into the DB with
    // the same ids): serve the DB copy when it exists, hide it when
    // unpublished, and only fall back to static tours for ids absent from DB.
    const dbTour = await prisma.tour.findUnique({
      where: { id },
      include: {
        departureDates: true,
        itineraryDays: true,
      },
    }).catch(() => null);

    let tour: Tour | null = null;

    if (dbTour) {
      if (!dbTour.isPublished) {
        return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
      }
      tour = {
          id: dbTour.id,
          title: dbTour.title,
          titleEn: dbTour.titleEn,
          city: dbTour.city,
          cityEn: dbTour.cityEn || dbTour.city,
          country: dbTour.country,
          countryEn: dbTour.countryEn || undefined,
          durationDays: dbTour.durationDays,
          durationNights: dbTour.durationNights,
          price: Number(dbTour.price),
          childPrice: dbTour.childPrice ? Number(dbTour.childPrice) : undefined,
          rating: dbTour.rating,
          reviewsCount: dbTour.reviewsCount,
          imageQuery: 'custom-tour',
          category: dbTour.category as Tour['category'],
          heroImage: dbTour.heroImage || undefined,
          gallery: Array.isArray(dbTour.gallery) ? (dbTour.gallery as string[]) : undefined,
          summary: dbTour.summary || undefined,
          summaryEn: dbTour.summaryEn || undefined,
          description: dbTour.description || undefined,
          descriptionEn: dbTour.descriptionEn || undefined,
          highlights: Array.isArray(dbTour.highlights) ? (dbTour.highlights as string[]) : undefined,
          includes: Array.isArray(dbTour.includes) ? (dbTour.includes as string[]) : [],
          excludes: Array.isArray(dbTour.excludes) ? (dbTour.excludes as string[]) : undefined,
          hotelName: dbTour.hotelName || undefined,
          hotelStars: dbTour.hotelStars || undefined,
          transportType: dbTour.transportType || undefined,
          transportTypeEn: dbTour.transportTypeEn || undefined,
          groupSize: dbTour.groupSize || undefined,
          guideLanguages: Array.isArray(dbTour.guideLanguages) ? (dbTour.guideLanguages as string[]) : undefined,
          departureDates: dbTour.departureDates.map((d) => ({
            id: d.id,
            startDate: d.startDate,
            endDate: d.endDate,
            price: Number(d.price),
            childPrice: d.childPrice ? Number(d.childPrice) : undefined,
            availableSeats: d.availableSeats,
            guaranteed: d.guaranteed,
          })),
          itinerary: dbTour.itineraryDays.map((day) => ({
            day: day.day,
            title: day.title,
            titleEn: day.titleEn || undefined,
            description: day.description,
            activities: Array.isArray(day.activities) ? (day.activities as string[]) : [],
            meals: {
              breakfast: day.breakfast,
              lunch: day.lunch,
              dinner: day.dinner,
            },
            accommodation: day.accommodation || undefined,
          })),
        };
    }

    // Static seed fallback for ids that were never mirrored into the DB
    if (!tour) {
      tour = getTourById(id) || null;
    }

    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: tour },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/tours/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
