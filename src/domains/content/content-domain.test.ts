import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ContentDomainService } from './ContentDomainService';

describe('ERP Content Management (CMS) Domain Service Suite', () => {
  const suffix = `cms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testTourId = '';
  let testExpId = '';
  let testTrvId = '';
  let testGuideId = '';

  afterAll(async () => {
    try {
      if (testTourId) await prisma.tour.deleteMany({ where: { id: testTourId } });
      if (testExpId) await prisma.signatureExperience.deleteMany({ where: { id: testExpId } });
      if (testTrvId) await prisma.travelogue.deleteMany({ where: { id: testTrvId } });
      if (testGuideId) await prisma.guideArticle.deleteMany({ where: { id: testGuideId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  // 1. Tours
  it('creates, reads, toggles publish status and deletes a tour with itinerary and departure dates', async () => {
    const tour = await ContentDomainService.createTour({
      title: `تور اختصاصی کاشان ${suffix}`,
      titleEn: `Kashan Tour ${suffix}`,
      city: 'کاشان',
      country: 'ایران',
      durationDays: 2,
      price: 35000000,
      category: 'cultural',
      departureDates: [
        { startDate: '2026-10-01', endDate: '2026-10-03', price: 35000000, availableSeats: 8 },
      ],
      itineraryDays: [
        { day: 1, title: 'خانه طباطبایی‌ها', description: 'بازدید از خانه‌های تاریخی', breakfast: true },
        { day: 2, title: 'کویر ابوزیدآباد', description: 'سافاری و غروب کویر', dinner: true },
      ],
    });

    expect(tour).toBeDefined();
    expect(tour.id).toBeTruthy();
    testTourId = tour.id;

    // Read tours
    const list = await ContentDomainService.getTours();
    const found = list.find((t) => t.id === testTourId);
    expect(found).toBeDefined();
    expect(found?.city).toBe('کاشان');
    expect(found?.departureDates.length).toBe(1);
    expect(found?.itineraryDays.length).toBe(2);

    // Toggle publish
    const toggled = await ContentDomainService.toggleTourPublish(testTourId, false);
    expect(toggled.isPublished).toBe(false);

    // Delete tour
    await ContentDomainService.deleteTour(testTourId);
    const checkDel = await prisma.tour.findUnique({ where: { id: testTourId } });
    expect(checkDel).toBeNull();
    testTourId = '';
  });

  it('supports custom currency, discounts, and clears discount and childPrice when set to null', async () => {
    const tour = await ContentDomainService.createTour({
      title: `تور ارزی دلار ${suffix}`,
      titleEn: `Dollar Tour ${suffix}`,
      city: 'کیش',
      country: 'ایران',
      currency: 'USD',
      price: 500,
      originalPrice: 600,
      discountPercent: 17,
      childPrice: 350,
      departureDates: [
        { startDate: '2026-11-01', endDate: '2026-11-05', price: 500, availableSeats: 5 },
      ],
    });

    expect(tour.currency).toBe('USD');
    expect(Number(tour.price)).toBe(500);
    expect(Number(tour.originalPrice)).toBe(600);
    expect(Number(tour.childPrice)).toBe(350);
    expect(tour.discountPercent).toBe(17);
    expect(tour.departureDates[0].currency).toBe('USD');

    // Now edit tour: clear discount and child price by passing null
    const updated = await ContentDomainService.updateTour(tour.id, {
      currency: 'EUR',
      price: 450,
      childPrice: null,
      originalPrice: null,
      discountPercent: null,
    });

    expect(updated.currency).toBe('EUR');
    expect(Number(updated.price)).toBe(450);
    expect(updated.childPrice).toBeNull();
    expect(updated.originalPrice).toBeNull();
    expect(updated.discountPercent).toBeNull();

    // Verify in database directly
    const dbTour = await prisma.tour.findUnique({
      where: { id: tour.id },
      include: { departureDates: true },
    });
    expect(dbTour?.currency).toBe('EUR');
    expect(dbTour?.childPrice).toBeNull();
    expect(dbTour?.originalPrice).toBeNull();
    expect(dbTour?.discountPercent).toBeNull();
    expect(dbTour?.departureDates[0].currency).toBe('EUR');
    expect(dbTour?.departureDates[0].childPrice).toBeNull();

    // Clean up
    await ContentDomainService.deleteTour(tour.id);
  });

  // 2. Signature Experiences
  it('creates, reads and deletes a signature experience', async () => {
    const exp = await ContentDomainService.createExperience({
      countryId: 'iran',
      category: 'nature',
      title: `سافاری شبانه ریگ جن ${suffix}`,
      titleEn: `Rig-e Jenn Night Safari ${suffix}`,
      desc: 'هیجان پیمایش کویر مرکزی در زیر آسمان پرستاره',
      where: 'کویر مرکزی',
      when: 'پاییز و بهار',
      fromPrice: 18000000,
    });

    expect(exp.id).toBeTruthy();
    testExpId = exp.id;

    // Read experiences
    const list = await ContentDomainService.getExperiences('iran');
    const found = list.find((e) => e.id === testExpId);
    expect(found).toBeDefined();
    expect(found?.category).toBe('nature');

    // Delete experience
    await ContentDomainService.deleteExperience(testExpId);
    const checkDel = await prisma.signatureExperience.findUnique({ where: { id: testExpId } });
    expect(checkDel).toBeNull();
    testExpId = '';
  });

  // 3. Travelogues
  it('creates, reads and deletes a travelogue story', async () => {
    const trv = await ContentDomainService.createTravelogue({
      countryId: 'turkey',
      titleFa: `خاطرات قایق‌سواری در وان ${suffix}`,
      destFa: 'وان، ترکیه',
      userName: 'سارا کاظمی',
      contentFa: 'سفر کوتاه به دریاچه وان و کلیسای آختامار با هزینه‌ای بسیار اقتصادی...',
    });

    expect(trv.id).toBeTruthy();
    testTrvId = trv.id;

    // Read travelogues
    const list = await ContentDomainService.getTravelogues();
    const found = list.find((t) => t.id === testTrvId);
    expect(found).toBeDefined();
    expect(found?.userName).toBe('سارا کاظمی');

    // Delete travelogue
    await ContentDomainService.deleteTravelogue(testTrvId);
    const checkDel = await prisma.travelogue.findUnique({ where: { id: testTrvId } });
    expect(checkDel).toBeNull();
    testTrvId = '';
  });

  // 4. Travel Guides
  it('creates, reads and deletes a travel guide article', async () => {
    const guide = await ContentDomainService.createGuide({
      titleFa: `۱۰ نکته حیاتی قبل از سوار شدن به هواپیما ${suffix}`,
      categoryFa: 'نکات پرواز',
      readTime: '۴ دقیقه',
      excerptFa: 'چگونه بهترین صندلی را انتخاب کنیم و از تاخیرها مطلع شویم.',
      bodyFa: 'متن کامل مقاله راهنمای پرواز و بار مجاز...',
    });

    expect(guide.id).toBeTruthy();
    testGuideId = guide.id;

    // Read guides
    const list = await ContentDomainService.getGuides();
    const found = list.find((g) => g.id === testGuideId);
    expect(found).toBeDefined();
    expect(found?.categoryFa).toBe('نکات پرواز');

    // Delete guide
    await ContentDomainService.deleteGuide(testGuideId);
    const checkDel = await prisma.guideArticle.findUnique({ where: { id: testGuideId } });
    expect(checkDel).toBeNull();
    testGuideId = '';
  });
});
