import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class ContentDomainService {
  // 1. Tours
  static async getTours() {
    return prisma.tour.findMany({
      include: {
        departureDates: { orderBy: { startDate: 'asc' } },
        itineraryDays: { orderBy: { day: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    return prisma.tour.create({
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
  }

  static async deleteTour(id: string) {
    return prisma.tour.delete({ where: { id } });
  }

  static async toggleTourPublish(id: string, isPublished: boolean) {
    return prisma.tour.update({
      where: { id },
      data: { isPublished },
    });
  }

  // 2. Experiences
  static async getExperiences(countryId?: string) {
    const where = countryId ? { countryId } : {};
    return prisma.signatureExperience.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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

    return prisma.signatureExperience.create({
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
  }

  static async deleteExperience(id: string) {
    return prisma.signatureExperience.delete({ where: { id } });
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
}
