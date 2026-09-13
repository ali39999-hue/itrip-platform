import { NextRequest, NextResponse } from 'next/server';
import { getAllTours } from '@/services/tours-service';
import { prisma } from '@/lib/prisma';
import type { Tour } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('q')?.toLowerCase();

    // DB tours are authoritative: seed.ts mirrors the static tours into the
    // Tour table with the same ids, so static copies sharing a DB id must be
    // dropped (even when the DB copy is unpublished) or the API would return
    // duplicate ids and React would render duplicate keys.
    const dbTours = await prisma.tour.findMany({
      include: {
        departureDates: true,
        itineraryDays: true,
      },
    }).catch(() => []);

    const dbIds = new Set(dbTours.map((t) => t.id));

    // 1. Static seed tours not mirrored in DB
    const staticTours = getAllTours().filter((t) => !dbIds.has(t.id));

    // 2. Published custom tours from database
    const publishedDbTours = dbTours.filter((t) => t.isPublished);

    const formattedDbTours = publishedDbTours.map((t) => ({
      id: t.id,
      title: t.title,
      titleEn: t.titleEn,
      city: t.city,
      cityEn: t.cityEn || t.city,
      country: t.country,
      countryEn: t.countryEn,
      durationDays: t.durationDays,
      durationNights: t.durationNights,
      price: Number(t.price),
      childPrice: t.childPrice ? Number(t.childPrice) : undefined,
      rating: t.rating,
      reviewsCount: t.reviewsCount,
      imageQuery: 'custom-tour',
      category: t.category as Tour['category'],
      heroImage: t.heroImage || undefined,
      gallery: t.gallery,
      summary: t.summary || undefined,
      summaryEn: t.summaryEn || undefined,
      description: t.description || undefined,
      descriptionEn: t.descriptionEn || undefined,
      highlights: t.highlights,
      includes: t.includes,
      excludes: t.excludes,
      hotelName: t.hotelName || undefined,
      hotelStars: t.hotelStars || undefined,
      transportType: t.transportType || undefined,
      transportTypeEn: t.transportTypeEn || undefined,
      groupSize: t.groupSize || undefined,
      guideLanguages: t.guideLanguages,
      departureDates: t.departureDates.map((d) => ({
        id: d.id,
        startDate: d.startDate,
        endDate: d.endDate,
        price: Number(d.price),
        childPrice: d.childPrice ? Number(d.childPrice) : undefined,
        availableSeats: d.availableSeats,
        guaranteed: d.guaranteed,
      })),
      itinerary: t.itineraryDays.map((day) => ({
        day: day.day,
        title: day.title,
        titleEn: day.titleEn || undefined,
        description: day.description,
        activities: day.activities,
        meals: {
          breakfast: day.breakfast,
          lunch: day.lunch,
          dinner: day.dinner,
        },
        accommodation: day.accommodation || undefined,
      })),
    }));

    let list = [...staticTours, ...formattedDbTours];

    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }

    if (query) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.titleEn.toLowerCase().includes(query) ||
          t.city.toLowerCase().includes(query) ||
          (t.cityEn && t.cityEn.toLowerCase().includes(query))
      );
    }

    return NextResponse.json(
      { success: true, count: list.length, data: list },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/tours:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
