import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class ContentDomainService {
  private static serializeTour<T extends Record<string, unknown>>(t: T): T {
    if (!t) return t;
    const priceVal = t.price;
    const childVal = t.childPrice;
    const depDates = t.departureDates;
    return {
      ...t,
      price: priceVal != null ? Number(priceVal) : 0,
      childPrice: childVal != null ? Number(childVal) : null,
      departureDates: Array.isArray(depDates)
        ? depDates.map((d: Record<string, unknown>) => ({
            ...d,
            price: d.price != null ? Number(d.price) : 0,
            childPrice: d.childPrice != null ? Number(d.childPrice) : null,
          }))
        : [],
    };
  }

  // 1. Tours
  static async getTours() {
    const tours = await prisma.tour.findMany({
      include: {
        departureDates: { orderBy: { startDate: 'asc' } },
        itineraryDays: { orderBy: { day: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tours.map((t) => ContentDomainService.serializeTour(t));
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
    price: number;
    childPrice?: number;
    category?: string;
    heroImage?: string;
    gallery?: string[];
    summary?: string;
    summaryEn?: string;
    description?: string;
    descriptionEn?: string;
    highlights?: string[];
    includes?: string[];
    excludes?: string[];
    hotelName?: string;
    hotelStars?: number;
    transportType?: string;
    transportTypeEn?: string;
    groupSize?: string;
    guideLanguages?: string[];
    departureDates?: Array<{
      startDate: string;
      endDate: string;
      price: number;
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

    const created = await prisma.tour.create({
      data: {
        title: data.title.trim(),
        titleEn: data.titleEn?.trim() || data.title.trim(),
        city: data.city.trim(),
        cityEn: data.cityEn?.trim() || data.city.trim(),
        country: data.country || 'ایران',
        countryEn: data.countryEn || 'Iran',
        durationDays: data.durationDays || 3,
        durationNights: data.durationNights ?? Math.max(1, (data.durationDays || 3) - 1),
        price: new Prisma.Decimal(data.price || 0),
        childPrice: data.childPrice ? new Prisma.Decimal(data.childPrice) : null,
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
          create: (data.departureDates || []).map((d) => ({
            startDate: d.startDate,
            endDate: d.endDate,
            price: new Prisma.Decimal(d.price),
            availableSeats: d.availableSeats || 10,
            guaranteed: d.guaranteed ?? true,
          })),
        },
        itineraryDays: {
          create: (data.itineraryDays || []).map((day) => ({
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
      },
    });
    return ContentDomainService.serializeTour(created);
  }

  static async deleteTour(id: string) {
    return prisma.tour.delete({ where: { id } });
  }

  static async toggleTourPublish(id: string, isPublished: boolean) {
    const updated = await prisma.tour.update({
      where: { id },
      data: { isPublished },
    });
    return ContentDomainService.serializeTour(updated);
  }

  /** Partial edit of an existing tour; only provided fields change. */
  static async updateTour(id: string, data: {
    title?: string;
    titleEn?: string;
    city?: string;
    country?: string;
    durationDays?: number;
    price?: number;
    childPrice?: number;
    category?: string;
    heroImage?: string;
    summary?: string;
    hotelName?: string;
    transportType?: string;
    isPublished?: boolean;
  }) {
    if (data.title !== undefined && !data.title.trim()) throw new Error('Title cannot be empty');
    if (data.city !== undefined && !data.city.trim()) throw new Error('City cannot be empty');
    if (data.durationDays !== undefined && data.durationDays < 1) throw new Error('Duration must be at least 1 day');

    const updated = await prisma.tour.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn.trim() || data.title!.trim() }),
        ...(data.city !== undefined && { city: data.city.trim() }),
        ...(data.country !== undefined && { country: data.country.trim() }),
        ...(data.durationDays !== undefined && {
          durationDays: data.durationDays,
          durationNights: Math.max(1, data.durationDays - 1),
        }),
        ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
        ...(data.childPrice !== undefined && { childPrice: data.childPrice ? new Prisma.Decimal(data.childPrice) : null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.heroImage !== undefined && { heroImage: data.heroImage || null }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.hotelName !== undefined && { hotelName: data.hotelName || null }),
        ...(data.transportType !== undefined && { transportType: data.transportType || null }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    return ContentDomainService.serializeTour(updated);
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
    });
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

  static async deleteExperience(id: string) {
    return prisma.signatureExperience.delete({ where: { id } });
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

    const updated = await prisma.signatureExperience.update({
      where: { id },
      data: {
        ...(data.countryId !== undefined && { countryId: data.countryId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn.trim() || data.title!.trim() }),
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
    return prisma.travelogue.delete({ where: { id } });
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
    return prisma.guideArticle.findMany({
      orderBy: { createdAt: 'desc' },
    });
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

  static async deleteGuide(id: string) {
    return prisma.guideArticle.delete({ where: { id } });
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
