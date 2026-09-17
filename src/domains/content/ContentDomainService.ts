import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ensureDatabaseSchemaHealed } from '@/lib/db-schema-guard';

export const DELETED_STATIC_KIND_TOUR = 'tour' as const;

/**
 * Pure merge helper (unit-testable, no I/O): DB rows win by id; static seed
 * copies fill the gaps EXCEPT ids the CMS explicitly deleted (tombstones).
 * A tombstone never hides an existing DB row (e.g. restored by seed).
 */
export function mergeStaticTours<T extends { id: string }>(
  staticTours: T[],
  dbIds: Set<string> | string[],
  tombstonedIds: Set<string> | string[],
): T[] {
  const db = dbIds instanceof Set ? dbIds : new Set(dbIds);
  const tomb = tombstonedIds instanceof Set ? tombstonedIds : new Set(tombstonedIds);
  return staticTours.filter((t) => !db.has(t.id) && !tomb.has(t.id));
}

export let isSchemaHealed = false;
export async function ensureContentSchemaHealed(): Promise<void> {
  await ensureDatabaseSchemaHealed();
  isSchemaHealed = true;
}

export class ContentDomainService {
  /** Ids the CMS explicitly deleted (suppresses static fallbacks only). */
  static async getDeletedStaticIds(kind: string): Promise<string[]> {
    try {
      const rows = await prisma.deletedStaticRef.findMany({
        where: { kind },
        select: { refId: true },
      });
      return rows.map((r) => r.refId);
    } catch {
      return [];
    }
  }

  /** Records a CMS deletion so the static twin can't resurrect (best-effort). */
  static async tombstoneStaticRef(kind: string, refId: string, reason = 'cms_delete'): Promise<void> {
    try {
      await prisma.deletedStaticRef.upsert({
        where: { kind_refId: { kind, refId } },
        update: {},
        create: { kind, refId, reason },
      });
    } catch {
      // Tombstone is advisory — the row delete above already succeeded.
    }
  }

  /** Clears tombstones for ids that exist again (e.g. canonical seed restore). */
  static async untombstoneStaticRefs(kind: string, refIds: string[]): Promise<void> {
    if (refIds.length === 0) return;
    try {
      await prisma.deletedStaticRef.deleteMany({
        where: { kind, refId: { in: refIds } },
      });
    } catch {
      // Advisory only.
    }
  }
  private static serializeTour<T extends Record<string, unknown>>(t: T): T {
    if (!t) return t;
    const priceVal = t.price;
    const childVal = t.childPrice;
    const origVal = t.originalPrice;
    const discVal = t.discountPercent;
    const depDates = t.departureDates;
    return {
      ...t,
      currency: t.currency ? String(t.currency) : 'TOMAN',
      price: priceVal != null ? Number(priceVal) : 0,
      childPrice: childVal != null ? Number(childVal) : null,
      originalPrice: origVal != null ? Number(origVal) : null,
      discountPercent: discVal != null ? Number(discVal) : null,
      departureDates: Array.isArray(depDates)
        ? depDates.map((d: Record<string, unknown>) => ({
            ...d,
            currency: d.currency ? String(d.currency) : (t.currency ? String(t.currency) : 'TOMAN'),
            price: d.price != null ? Number(d.price) : 0,
            childPrice: d.childPrice != null ? Number(d.childPrice) : null,
          }))
        : [],
    };
  }

  // 1. Tours
  static async getTours() {
    await ensureContentSchemaHealed();
    let dbTours: Record<string, unknown>[] = [];
    try {
      const tours = await prisma.tour.findMany({
        include: {
          departureDates: { orderBy: { startDate: 'asc' } },
          itineraryDays: { orderBy: { day: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (tours) {
        dbTours = tours.map((t) => ContentDomainService.serializeTour(t));
      }
    } catch (err) {
      console.warn('[ContentDomainService.getTours] Database query notice:', err);
    }

    try {
      const { DETAILED_TOURS } = await import('@/services/tours-service');
      const tombstoned = new Set(await ContentDomainService.getDeletedStaticIds(DELETED_STATIC_KIND_TOUR));
      const dbIds = new Set(dbTours.map((t) => String(t.id)));
      const missingStatic = mergeStaticTours(DETAILED_TOURS, dbIds, tombstoned);

      const staticToursSerialized = missingStatic.map((t) => ContentDomainService.serializeTour({
        ...t,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
        hotelName: t.hotelName || null,
        hotelStars: t.hotelStars || 5,
        transportType: t.transportType || null,
        transportTypeEn: t.transportTypeEn || null,
        departureDates: t.departureDates || [],
        itineraryDays: (t.itinerary || []).map((item) => ({
          id: `itin_${item.day}`,
          day: item.day,
          title: item.title,
          titleEn: item.titleEn,
          description: item.description,
          activities: item.activities || [],
          breakfast: item.meals?.breakfast ?? true,
          lunch: item.meals?.lunch ?? false,
          dinner: item.meals?.dinner ?? false,
          accommodation: item.accommodation || null,
          tourId: t.id,
        })),
      }));

      return [...dbTours, ...staticToursSerialized];
    } catch {
      return dbTours;
    }
  }

  static async getTourById(id: string): Promise<Record<string, unknown> | null> {
    await ensureContentSchemaHealed();
    try {
      const dbTour = await prisma.tour.findUnique({
        where: { id },
        include: {
          departureDates: { orderBy: { startDate: 'asc' } },
          itineraryDays: { orderBy: { day: 'asc' } },
        },
      });
      if (dbTour && dbTour.isPublished) {
        return ContentDomainService.serializeTour(dbTour);
      }
    } catch (err) {
      console.warn('[ContentDomainService.getTourById] Database query notice:', err);
    }

    try {
      const tombstoned = new Set(await ContentDomainService.getDeletedStaticIds(DELETED_STATIC_KIND_TOUR));
      if (tombstoned.has(id)) return null;

      const { getTourById: getStaticTour } = await import('@/services/tours-service');
      const staticTour = getStaticTour(id);
      if (staticTour) {
        return ContentDomainService.serializeTour({
          ...staticTour,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublished: true,
          hotelName: staticTour.hotelName || null,
          hotelStars: staticTour.hotelStars || 5,
          transportType: staticTour.transportType || null,
          transportTypeEn: staticTour.transportTypeEn || null,
          departureDates: staticTour.departureDates || [],
          itineraryDays: (staticTour.itinerary || []).map((item) => ({
            id: `itin_${item.day}`,
            day: item.day,
            title: item.title,
            titleEn: item.titleEn,
            description: item.description,
            activities: item.activities || [],
            breakfast: item.meals?.breakfast ?? true,
            lunch: item.meals?.lunch ?? false,
            dinner: item.meals?.dinner ?? false,
            accommodation: item.accommodation || null,
            tourId: staticTour.id,
          })),
        });
      }
    } catch {}

    return null;
  }

  static async createTour(data: {
    title: string;
    titleEn?: string;
    city: string;
    cityEn?: string;
    country?: string;
    countryEn?: string;
    durationDays?: number;
    durationNights?: number;
    currency?: string;
    price: number;
    childPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    category?: string;
    heroImage?: string | null;
    gallery?: string[];
    summary?: string;
    summaryEn?: string;
    description?: string | null;
    descriptionEn?: string;
    highlights?: string[];
    includes?: string[];
    excludes?: string[];
    hotelName?: string | null;
    hotelStars?: number;
    transportType?: string | null;
    transportTypeEn?: string;
    groupSize?: string;
    guideLanguages?: string[];
    departureDates?: Array<{
      startDate: string;
      endDate: string;
      currency?: string;
      price: number;
      childPrice?: number | null;
      availableSeats?: number;
      guaranteed?: boolean;
    }>;
    itineraryDays?: Array<{
      day: number;
      title: string;
      titleEn?: string;
      description: string;
      activities?: string[];
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
      accommodation?: string;
    }>;
  }) {
    if (!data.title?.trim()) throw new Error('Title is required');
    if (!data.city?.trim()) throw new Error('City is required');

    await ensureContentSchemaHealed();

    const tourPayload = {
      title: data.title.trim(),
      titleEn: data.titleEn?.trim() || data.title.trim(),
      city: data.city.trim(),
      cityEn: data.cityEn?.trim() || data.city.trim(),
      country: data.country || 'ایران',
      countryEn: data.countryEn || 'Iran',
      durationDays: data.durationDays || 3,
      durationNights: data.durationNights ?? Math.max(1, (data.durationDays || 3) - 1),
      currency: data.currency || 'TOMAN',
      price: new Prisma.Decimal(data.price || 0),
      childPrice: data.childPrice ? new Prisma.Decimal(data.childPrice) : null,
      originalPrice: data.originalPrice ? new Prisma.Decimal(data.originalPrice) : null,
      discountPercent: data.discountPercent ?? (
        data.originalPrice && data.price && data.originalPrice > data.price
          ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
          : null
      ),
      category: data.category || 'cultural',
      heroImage: data.heroImage || null,
      gallery: data.gallery || [],
      summary: data.summary || '',
      summaryEn: data.summaryEn || '',
      description: data.description || '',
      descriptionEn: data.descriptionEn || '',
      highlights: data.highlights || [],
      includes: data.includes || ['پرواز رفت و برگشت', 'هتل ۵ ستاره', 'بیمه', 'ترانسفر'],
      excludes: data.excludes || ['خریدهای شخصی'],
      hotelName: data.hotelName || 'هتل ۵ ستاره لوکس',
      hotelStars: data.hotelStars || 5,
      transportType: data.transportType || 'پرواز + ترانسفر',
      transportTypeEn: data.transportTypeEn || 'Flights + transfers',
      groupSize: data.groupSize || 'حداکثر ۱۲ نفر',
      guideLanguages: data.guideLanguages || ['فارسی', 'English'],
      departureDates: {
        create: (
          (data.departureDates && data.departureDates.length > 0)
            ? data.departureDates
            : [7, 14, 21].map((offset) => {
                const now = new Date();
                const start = new Date(now.getTime() + offset * 86400000);
                const end = new Date(now.getTime() + (offset + (data.durationDays || 3)) * 86400000);
                return {
                  startDate: start.toISOString().split('T')[0],
                  endDate: end.toISOString().split('T')[0],
                  currency: data.currency || 'TOMAN',
                  price: data.price || 0,
                  childPrice: data.childPrice ?? null,
                  availableSeats: 10,
                  guaranteed: true,
                };
              })
        ).map((d) => ({
          startDate: d.startDate,
          endDate: d.endDate,
          currency: d.currency || data.currency || 'TOMAN',
          price: new Prisma.Decimal(d.price),
          childPrice: d.childPrice != null ? new Prisma.Decimal(d.childPrice) : (data.childPrice != null ? new Prisma.Decimal(data.childPrice) : null),
          availableSeats: d.availableSeats || 10,
          guaranteed: d.guaranteed ?? true,
        })),
      },
      itineraryDays: {
        create: (
          (data.itineraryDays && data.itineraryDays.length > 0)
            ? data.itineraryDays
            : Array.from({ length: data.durationDays || 3 }, (_, idx) => ({
                day: idx + 1,
                title: `روز ${idx + 1} - گشت شهری و اقامت`,
                titleEn: `Day ${idx + 1} City Tour`,
                description: `برنامه بازدید اختصاصی از جاذبه‌های برگزیده در ${data.city.trim()}`,
                activities: ['گشت شهری', 'اقامت در هتل'],
                breakfast: true,
                lunch: false,
                dinner: false,
                accommodation: data.hotelName || 'هتل ۵ ستاره لوکس',
              }))
        ).map((day) => ({
          day: day.day,
          title: day.title,
          titleEn: day.titleEn || day.title,
          description: day.description,
          activities: day.activities || [],
          breakfast: day.breakfast ?? false,
          lunch: day.lunch ?? false,
          dinner: day.dinner ?? false,
          accommodation: day.accommodation || '',
        })),
      },
    };

    try {
      const created = await prisma.tour.create({
        data: tourPayload,
        include: {
          departureDates: { orderBy: { startDate: 'asc' } },
          itineraryDays: { orderBy: { day: 'asc' } },
        },
      });
      return ContentDomainService.serializeTour(created);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('does not exist') || errMsg.includes('Tour.currency') || errMsg.includes('column')) {
        isSchemaHealed = false;
        await ensureContentSchemaHealed();
        const retry = await prisma.tour.create({
          data: tourPayload,
          include: {
            departureDates: { orderBy: { startDate: 'asc' } },
            itineraryDays: { orderBy: { day: 'asc' } },
          },
        });
        return ContentDomainService.serializeTour(retry);
      }
      throw err;
    }
  }

  static async ensureTourInDb(id: string): Promise<boolean> {
    await ensureContentSchemaHealed();
    try {
      const existing = await prisma.tour.findUnique({ where: { id } });
      if (existing) return true;
      const { DETAILED_TOURS } = await import('@/services/tours-service');
      const staticTour = DETAILED_TOURS.find((t) => t.id === id);
      if (!staticTour) return false;

      await prisma.tour.create({
        data: {
          id: staticTour.id,
          title: staticTour.title,
          titleEn: staticTour.titleEn || staticTour.title,
          city: staticTour.city,
          cityEn: staticTour.cityEn || staticTour.city,
          country: staticTour.country || 'ایران',
          countryEn: staticTour.countryEn || 'Iran',
          durationDays: staticTour.durationDays || 3,
          durationNights: staticTour.durationNights || 2,
          currency: staticTour.currency || 'TOMAN',
          price: new Prisma.Decimal(staticTour.price || 0),
          childPrice: staticTour.childPrice ? new Prisma.Decimal(staticTour.childPrice) : null,
          originalPrice: staticTour.originalPrice ? new Prisma.Decimal(staticTour.originalPrice) : null,
          discountPercent: staticTour.discountPercent || null,
          category: staticTour.category || 'cultural',
          heroImage: staticTour.heroImage || null,
          gallery: staticTour.gallery || [],
          summary: staticTour.summary || '',
          summaryEn: staticTour.summaryEn || '',
          description: staticTour.description || '',
          descriptionEn: staticTour.descriptionEn || '',
          highlights: staticTour.highlights || [],
          includes: staticTour.includes || [],
          excludes: staticTour.excludes || [],
          hotelName: staticTour.hotelName || 'هتل ۵ ستاره',
          hotelStars: staticTour.hotelStars || 5,
          transportType: staticTour.transportType || 'پرواز + ترانسفر',
          transportTypeEn: staticTour.transportTypeEn || 'Flights + transfers',
          groupSize: staticTour.groupSize || 'حداکثر ۱۲ نفر',
          guideLanguages: staticTour.guideLanguages || ['فارسی', 'English'],
          isPublished: true,
          departureDates: {
            create: (staticTour.departureDates || []).map((d) => ({
              startDate: d.startDate,
              endDate: d.endDate,
              currency: d.currency || 'TOMAN',
              price: new Prisma.Decimal(d.price),
              childPrice: d.childPrice != null ? new Prisma.Decimal(d.childPrice) : null,
              availableSeats: d.availableSeats || 10,
              guaranteed: d.guaranteed ?? true,
            })),
          },
          itineraryDays: {
            create: (staticTour.itinerary || []).map((item) => ({
              day: item.day,
              title: item.title,
              titleEn: item.titleEn || item.title,
              description: item.description,
              activities: item.activities || [],
              breakfast: item.meals?.breakfast ?? true,
              lunch: item.meals?.lunch ?? false,
              dinner: item.meals?.dinner ?? false,
              accommodation: item.accommodation || '',
            })),
          },
        },
      });
      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('does not exist') || errMsg.includes('Tour.currency') || errMsg.includes('column')) {
        isSchemaHealed = false;
        await ensureContentSchemaHealed();
      }
      console.warn(`[ensureTourInDb] Warning auto-cloning tour ${id}:`, err);
      return false;
    }
  }

  static async deleteTour(id: string) {
    let deleted = null;
    try {
      deleted = await prisma.tour.delete({ where: { id } });
    } catch {
      // Record might not have been in DB yet
    }
    // If this was a seeded/static tour, its static twin would otherwise
    // reappear on the next read (static fallback for ids absent from DB).
    // Record the deletion intent so read paths keep it hidden.
    try {
      const { DETAILED_TOURS } = await import('@/services/tours-service');
      if (DETAILED_TOURS.some((t) => t.id === id)) {
        await ContentDomainService.tombstoneStaticRef(DELETED_STATIC_KIND_TOUR, id);
      }
    } catch {
      // Advisory only
    }
    return deleted || { id };
  }

  static async toggleTourPublish(id: string, isPublished: boolean) {
    await ensureContentSchemaHealed();
    await ContentDomainService.ensureTourInDb(id);
    try {
      const updated = await prisma.tour.update({
        where: { id },
        data: { isPublished },
        include: {
          departureDates: { orderBy: { startDate: 'asc' } },
          itineraryDays: { orderBy: { day: 'asc' } },
        },
      });
      return ContentDomainService.serializeTour(updated);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('does not exist') || errMsg.includes('Tour.currency') || errMsg.includes('column')) {
        isSchemaHealed = false;
        await ensureContentSchemaHealed();
        const retry = await prisma.tour.update({
          where: { id },
          data: { isPublished },
          include: {
            departureDates: { orderBy: { startDate: 'asc' } },
            itineraryDays: { orderBy: { day: 'asc' } },
          },
        });
        return ContentDomainService.serializeTour(retry);
      }
      throw err;
    }
  }

  /** Partial edit of an existing tour; only provided fields change. */
  static async updateTour(id: string, data: {
    title?: string;
    titleEn?: string;
    city?: string;
    country?: string;
    durationDays?: number;
    currency?: string;
    price?: number;
    childPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    category?: string;
    heroImage?: string | null;
    gallery?: string[];
    summary?: string | null;
    summaryEn?: string | null;
    description?: string | null;
    descriptionEn?: string | null;
    hotelName?: string | null;
    hotelStars?: number | null;
    transportType?: string | null;
    transportTypeEn?: string | null;
    groupSize?: string | null;
    groupSizeEn?: string | null;
    guideLanguages?: string[];
    highlights?: string[];
    includes?: string[];
    excludes?: string[];
    isPublished?: boolean;
  }) {
    if (data.title !== undefined && !data.title.trim()) throw new Error('Title cannot be empty');
    if (data.city !== undefined && !data.city.trim()) throw new Error('City cannot be empty');
    if (data.durationDays !== undefined && data.durationDays < 1) throw new Error('Duration must be at least 1 day');

    await ensureContentSchemaHealed();
    await ContentDomainService.ensureTourInDb(id);

    // Auto-sync departure dates prices and currency so checkout & booking widget reflect the updated CMS price
    if (data.price !== undefined || data.currency !== undefined) {
      await prisma.tourDepartureDate.updateMany({
        where: { tourId: id },
        data: {
          ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
          ...(data.currency !== undefined && { currency: data.currency }),
        },
      }).catch(() => {});
    }
    if (data.childPrice !== undefined) {
      await prisma.tourDepartureDate.updateMany({
        where: { tourId: id },
        data: { childPrice: data.childPrice != null ? new Prisma.Decimal(data.childPrice) : null },
      }).catch(() => {});
    }

    const updatePayload = {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.titleEn !== undefined && { titleEn: data.titleEn.trim() || data.title?.trim() || '' }),
      ...(data.city !== undefined && { city: data.city.trim() }),
      ...(data.country !== undefined && { country: data.country.trim() }),
      ...(data.durationDays !== undefined && {
        durationDays: data.durationDays,
        durationNights: Math.max(1, data.durationDays - 1),
      }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
      ...(data.childPrice !== undefined && {
        childPrice: data.childPrice != null ? new Prisma.Decimal(data.childPrice) : null,
      }),
      ...(data.originalPrice !== undefined && {
        originalPrice: data.originalPrice != null ? new Prisma.Decimal(data.originalPrice) : null,
      }),
      ...(data.discountPercent !== undefined && {
        discountPercent: data.discountPercent != null ? data.discountPercent : null,
      }),
      ...(data.originalPrice === null && data.discountPercent === undefined && {
        discountPercent: null,
      }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.heroImage !== undefined && { heroImage: data.heroImage || null }),
      ...(data.gallery !== undefined && { gallery: data.gallery }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.summaryEn !== undefined && { summaryEn: data.summaryEn }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn }),
      ...(data.hotelName !== undefined && { hotelName: data.hotelName || null }),
      ...(data.hotelStars !== undefined && { hotelStars: data.hotelStars }),
      ...(data.transportType !== undefined && { transportType: data.transportType || null }),
      ...(data.transportTypeEn !== undefined && { transportTypeEn: data.transportTypeEn || null }),
      ...(data.groupSize !== undefined && { groupSize: data.groupSize }),
      ...(data.groupSizeEn !== undefined && { groupSizeEn: data.groupSizeEn }),
      ...(data.guideLanguages !== undefined && { guideLanguages: data.guideLanguages }),
      ...(data.highlights !== undefined && { highlights: data.highlights }),
      ...(data.includes !== undefined && { includes: data.includes }),
      ...(data.excludes !== undefined && { excludes: data.excludes }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
    };

    try {
      const updated = await prisma.tour.update({
        where: { id },
        data: updatePayload,
        include: {
          departureDates: { orderBy: { startDate: 'asc' } },
          itineraryDays: { orderBy: { day: 'asc' } },
        },
      });
      return ContentDomainService.serializeTour(updated);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('does not exist') || errMsg.includes('Tour.currency') || errMsg.includes('column')) {
        isSchemaHealed = false;
        await ensureContentSchemaHealed();
        const retry = await prisma.tour.update({
          where: { id },
          data: updatePayload,
          include: {
            departureDates: { orderBy: { startDate: 'asc' } },
            itineraryDays: { orderBy: { day: 'asc' } },
          },
        });
        return ContentDomainService.serializeTour(retry);
      }
      throw err;
    }
  }

  // 2. Experiences
  static async getExperiences(countryId?: string, publicOnly = false) {
    const where: Prisma.SignatureExperienceWhereInput = {
      ...(countryId ? { countryId } : {}),
      ...(publicOnly ? { isActive: true } : {}),
    };
    const records = await prisma.signatureExperience.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    if (records.length === 0) {
      try {
        const { COUNTRIES } = await import('@/lib/countries');
        const fallback = Object.entries(COUNTRIES).flatMap(([cId, config]) =>
          (config.signatureExperiences || []).map((exp, idx) => ({
            id: `exp_${cId}_${idx + 1}`,
            countryId: cId,
            category: exp.category || 'cultural',
            title: exp.title,
            titleEn: exp.titleEn || exp.title,
            desc: exp.desc,
            descEn: exp.descEn || exp.desc,
            where: exp.where,
            whereEn: exp.whereEn || exp.where,
            when: exp.when,
            whenEn: exp.whenEn || exp.when,
            fromPrice: exp.fromPrice,
            image: exp.image || null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
        return fallback.filter((f) => (!countryId || f.countryId === countryId) && (!publicOnly || f.isActive));
      } catch {
        // Safe return
      }
    }

    return records.map((r) => ({
      ...r,
      fromPrice: Number(r.fromPrice),
    }));
  }

  static async createExperience(data: {
    countryId: string;
    category?: string;
    title: string;
    titleEn?: string;
    desc: string;
    descEn?: string;
    where: string;
    whereEn?: string;
    when: string;
    whenEn?: string;
    fromPrice: number;
    image?: string;
  }) {
    if (!data.title?.trim()) throw new Error('Title is required');
    if (!data.countryId) throw new Error('Country is required');

    const created = await prisma.signatureExperience.create({
      data: {
        countryId: data.countryId,
        category: data.category || 'culture',
        title: data.title.trim(),
        titleEn: data.titleEn?.trim() || data.title.trim(),
        desc: data.desc.trim(),
        descEn: data.descEn?.trim() || data.desc.trim(),
        where: data.where.trim(),
        whereEn: data.whereEn?.trim() || data.where.trim(),
        when: data.when.trim(),
        whenEn: data.whenEn?.trim() || data.when.trim(),
        fromPrice: new Prisma.Decimal(data.fromPrice || 0),
        image: data.image || null,
        isActive: true,
      },
    });
    return {
      ...created,
      fromPrice: Number(created.fromPrice),
    };
  }

  static async ensureExperienceInDb(id: string): Promise<boolean> {
    try {
      const existing = await prisma.signatureExperience.findUnique({ where: { id } });
      if (existing) return true;
      if (id.startsWith('exp_')) {
        const { COUNTRIES } = await import('@/lib/countries');
        for (const [cId, config] of Object.entries(COUNTRIES)) {
          const idx = (config.signatureExperiences || []).findIndex((_, i) => `exp_${cId}_${i + 1}` === id);
          if (idx !== -1) {
            const exp = config.signatureExperiences[idx];
            await prisma.signatureExperience.create({
              data: {
                id,
                countryId: cId,
                category: exp.category || 'cultural',
                title: exp.title,
                titleEn: exp.titleEn || exp.title,
                desc: exp.desc,
                descEn: exp.descEn || exp.desc,
                where: exp.where,
                whereEn: exp.whereEn || exp.where,
                when: exp.when,
                whenEn: exp.whenEn || exp.when,
                fromPrice: new Prisma.Decimal(exp.fromPrice || 0),
                image: exp.image || null,
                isActive: true,
              },
            });
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  static async deleteExperience(id: string) {
    return prisma.signatureExperience.delete({ where: { id } }).catch(() => ({ id }));
  }

  static async updateExperience(id: string, data: {
    countryId?: string;
    category?: string;
    title?: string;
    titleEn?: string;
    desc?: string;
    where?: string;
    when?: string;
    fromPrice?: number;
    image?: string;
    isActive?: boolean;
  }) {
    if (data.title !== undefined && !data.title.trim()) throw new Error('Title cannot be empty');
    if (data.countryId !== undefined && !data.countryId) throw new Error('Country is required');

    await ContentDomainService.ensureExperienceInDb(id);
    const updated = await prisma.signatureExperience.update({
      where: { id },
      data: {
        ...(data.countryId !== undefined && { countryId: data.countryId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn.trim() || data.title?.trim() || '' }),
        ...(data.desc !== undefined && { desc: data.desc.trim() }),
        ...(data.where !== undefined && { where: data.where.trim() }),
        ...(data.when !== undefined && { when: data.when.trim() }),
        ...(data.fromPrice !== undefined && { fromPrice: new Prisma.Decimal(data.fromPrice) }),
        ...(data.image !== undefined && { image: data.image || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return {
      ...updated,
      fromPrice: Number(updated.fromPrice),
    };
  }

  static async toggleExperienceActive(id: string, isActive: boolean) {
    await ContentDomainService.ensureExperienceInDb(id);
    const updated = await prisma.signatureExperience.update({
      where: { id },
      data: { isActive },
    });
    return {
      ...updated,
      fromPrice: Number(updated.fromPrice),
    };
  }

  // 3. Travelogues
  static async getTravelogues() {
    return prisma.travelogue.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createTravelogue(data: {
    countryId?: string;
    titleFa: string;
    titleEn?: string;
    destFa: string;
    destEn?: string;
    userName: string;
    image?: string;
    contentFa: string;
    contentEn?: string;
  }) {
    if (!data.titleFa?.trim()) throw new Error('Title is required');
    if (!data.userName?.trim()) throw new Error('User name is required');

    return prisma.travelogue.create({
      data: {
        countryId: data.countryId || 'iran',
        titleFa: data.titleFa.trim(),
        titleEn: data.titleEn?.trim() || data.titleFa.trim(),
        destFa: data.destFa.trim(),
        destEn: data.destEn?.trim() || data.destFa.trim(),
        userName: data.userName.trim(),
        image: data.image || 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200',
        contentFa: data.contentFa.trim(),
        contentEn: data.contentEn?.trim() || data.contentFa.trim(),
        isPublished: true,
      },
    });
  }

  static async deleteTravelogue(id: string) {
    return prisma.travelogue.delete({ where: { id } }).catch(() => ({ id }));
  }

  static async toggleTraveloguePublish(id: string, isPublished: boolean) {
    return prisma.travelogue.update({
      where: { id },
      data: { isPublished },
    });
  }

  static async updateTravelogue(id: string, data: {
    titleFa?: string;
    destFa?: string;
    userName?: string;
    image?: string;
    contentFa?: string;
    isPublished?: boolean;
  }) {
    if (data.titleFa !== undefined && !data.titleFa.trim()) throw new Error('Title cannot be empty');
    if (data.userName !== undefined && !data.userName.trim()) throw new Error('User name cannot be empty');

    return prisma.travelogue.update({
      where: { id },
      data: {
        ...(data.titleFa !== undefined && { titleFa: data.titleFa.trim() }),
        ...(data.destFa !== undefined && { destFa: data.destFa.trim() }),
        ...(data.userName !== undefined && { userName: data.userName.trim() }),
        // Travelogue.image is non-nullable in Prisma — an empty value means
        // "keep the existing image" (mirrors the create-path default fallback).
        ...(data.image !== undefined && data.image.trim() && { image: data.image.trim() }),
        ...(data.contentFa !== undefined && { contentFa: data.contentFa.trim() }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
  }

  // 4. Guides
  static async getGuides() {
    const records = await prisma.guideArticle.findMany({
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    if (!records || records.length === 0) {
      return [
        {
          id: 'guide_1',
          categoryFa: 'ویزا',
          categoryEn: 'Visa',
          titleFa: 'چک‌لیست سفر به ترکیه',
          titleEn: 'Turkey Travel Checklist',
          readTime: '۵ دقیقه',
          excerptFa: 'از بیمه مسافرتی اجباری تا رزرو هتل قابل استعلام — همه مدارکی که برای ورود به ترکیه لازم دارید.',
          excerptEn: 'From mandatory travel insurance to a verifiable hotel booking — every document you need to enter Turkey.',
          bodyFa: 'برای سفر به ترکیه علاوه بر پاسپورت با حداقل ۵ ماه اعتبار، توصیه می‌کنیم بیمه مسافرتی معتبر تهیه کنید.',
          bodyEn: 'For travel to Turkey, besides a passport with at least 5 months of validity, we recommend holding valid travel insurance.',
          image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=800',
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'guide_2',
          categoryFa: 'مالی',
          categoryEn: 'Finance',
          titleFa: 'راهنمای کیف پول چندارزی فیروز',
          titleEn: 'Firuzo Multi-Currency Wallet Guide',
          readTime: '۷ دقیقه',
          excerptFa: 'شارژ ریالی با شتاب، نگهداری تتر و درهم، و تبدیل لحظه‌ای با قفل نرخ ۳۰ ثانیه‌ای چگونه کار می‌کند؟',
          excerptEn: 'How Shetab rial top-ups, USDT & AED balances, and instant exchange with a 30-second rate lock work.',
          bodyFa: 'کیف پول فیروز از سه ارز ریال، تتر و درهم پشتیبانی می‌کند.',
          bodyEn: 'The Firuzo wallet supports three currencies: IRR, USDT and AED.',
          image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=75&w=800',
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    return records;
  }

  static async createGuide(data: {
    categoryFa: string;
    categoryEn?: string;
    titleFa: string;
    titleEn?: string;
    readTime?: string;
    excerptFa: string;
    excerptEn?: string;
    bodyFa?: string;
    bodyEn?: string;
    image?: string;
  }) {
    if (!data.titleFa?.trim()) throw new Error('Title is required');
    if (!data.excerptFa?.trim()) throw new Error('Excerpt is required');

    return prisma.guideArticle.create({
      data: {
        categoryFa: data.categoryFa || 'نکات سفر',
        categoryEn: data.categoryEn || 'Travel Tips',
        titleFa: data.titleFa.trim(),
        titleEn: data.titleEn?.trim() || data.titleFa.trim(),
        readTime: data.readTime || '۵ دقیقه',
        excerptFa: data.excerptFa.trim(),
        excerptEn: data.excerptEn?.trim() || data.excerptFa.trim(),
        bodyFa: data.bodyFa || data.excerptFa.trim(),
        bodyEn: data.bodyEn || data.excerptEn || data.excerptFa.trim(),
        image: data.image || null,
        isPublished: true,
      },
    });
  }

  static async ensureGuideInDb(id: string): Promise<boolean> {
    try {
      const existing = await prisma.guideArticle.findUnique({ where: { id } });
      if (existing) return true;
      const FALLBACK_GUIDES = [
        {
          id: 'guide_1',
          categoryFa: 'ویزا',
          categoryEn: 'Visa',
          titleFa: 'چک‌لیست سفر به ترکیه',
          titleEn: 'Turkey Travel Checklist',
          readTime: '۵ دقیقه',
          excerptFa: 'از بیمه مسافرتی اجباری تا رزرو هتل قابل استعلام — همه مدارکی که برای ورود به ترکیه لازم دارید.',
          excerptEn: 'From mandatory travel insurance to a verifiable hotel booking — every document you need to enter Turkey.',
          bodyFa: 'برای سفر به ترکیه علاوه بر پاسپورت با حداقل ۵ ماه اعتبار، توصیه می‌کنیم بیمه مسافرتی معتبر تهیه کنید.',
          bodyEn: 'For travel to Turkey, besides a passport with at least 5 months of validity, we recommend holding valid travel insurance.',
          image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=75&w=800',
          isPublished: true,
        },
        {
          id: 'guide_2',
          categoryFa: 'مالی',
          categoryEn: 'Finance',
          titleFa: 'راهنمای کیف پول چندارزی فیروز',
          titleEn: 'Firuzo Multi-Currency Wallet Guide',
          readTime: '۷ دقیقه',
          excerptFa: 'شارژ ریالی با شتاب، نگهداری تتر و درهم، و تبدیل لحظه‌ای با قفل نرخ ۳۰ ثانیه‌ای چگونه کار می‌کند؟',
          excerptEn: 'How Shetab rial top-ups, USDT & AED balances, and instant exchange with a 30-second rate lock work.',
          bodyFa: 'کیف پول فیروز از سه ارز ریال، تتر و درهم پشتیبانی می‌کند.',
          bodyEn: 'The Firuzo wallet supports three currencies: IRR, USDT and AED.',
          image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=75&w=800',
          isPublished: true,
        },
      ];
      const match = FALLBACK_GUIDES.find((g) => g.id === id);
      if (match) {
        await prisma.guideArticle.create({
          data: match,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async deleteGuide(id: string) {
    return prisma.guideArticle.delete({ where: { id } }).catch(() => ({ id }));
  }

  static async toggleGuidePublish(id: string, isPublished: boolean) {
    await ContentDomainService.ensureGuideInDb(id);
    return prisma.guideArticle.update({
      where: { id },
      data: { isPublished },
    });
  }

  static async updateGuide(id: string, data: {
    categoryFa?: string;
    titleFa?: string;
    readTime?: string;
    excerptFa?: string;
    bodyFa?: string;
    image?: string;
    isPublished?: boolean;
  }) {
    if (data.titleFa !== undefined && !data.titleFa.trim()) throw new Error('Title cannot be empty');
    if (data.excerptFa !== undefined && !data.excerptFa.trim()) throw new Error('Excerpt cannot be empty');

    await ContentDomainService.ensureGuideInDb(id);
    return prisma.guideArticle.update({
      where: { id },
      data: {
        ...(data.categoryFa !== undefined && { categoryFa: data.categoryFa.trim() }),
        ...(data.titleFa !== undefined && { titleFa: data.titleFa.trim() }),
        ...(data.readTime !== undefined && { readTime: data.readTime.trim() }),
        ...(data.excerptFa !== undefined && { excerptFa: data.excerptFa.trim() }),
        ...(data.bodyFa !== undefined && { bodyFa: data.bodyFa }),
        ...(data.image !== undefined && { image: data.image || null }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
  }
}
