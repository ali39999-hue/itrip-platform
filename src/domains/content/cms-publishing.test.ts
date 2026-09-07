import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUPPORTED_LOCALES,
  validateContentTranslation,
  resolveTranslation,
  generateLocaleSlug,
  type ContentTranslationMap,
} from './ContentTranslation';
import {
  CmsPublishingService,
  type CmsContentItem,
} from './CmsPublishingService';
import { SeoMetadataService } from './SeoMetadataService';

describe('Wave 18: CMS Domain Services Suite (CMS-101, CMS-102, CMS-103)', () => {
  beforeEach(() => {
    CmsPublishingService.resetStore();
  });

  // =========================================================================
  // CMS-101: Translation-First Content Model
  // =========================================================================
  describe('CMS-101: Translation-First Content Model', () => {
    it('supports all 5 canonical locales uniformly', () => {
      expect(SUPPORTED_LOCALES).toEqual(['fa', 'en', 'ar', 'zh', 'ru']);
    });

    it('calculates completeness percentage and identifies missing locales', () => {
      const partialTranslations: ContentTranslationMap = {
        fa: {
          title: 'راهنمای جامع سفر به کیش',
          slug: 'kish-island-guide',
          body: 'کیش یکی از زیباترین مقاصد خلیج فارس است.',
        },
        en: {
          title: 'Complete Kish Island Travel Guide',
          slug: 'kish-island-guide',
          body: 'Kish is one of the most scenic Persian Gulf destinations.',
        },
      };

      const status = validateContentTranslation(partialTranslations, 'fa');
      expect(status.isComplete).toBe(false);
      expect(status.completionPercentage).toBe(40); // 2 out of 5 = 40%
      expect(status.completedLocales).toEqual(['fa', 'en']);
      expect(status.missingLocales).toEqual(['ar', 'zh', 'ru']);
      expect(status.hasBaseLocale).toBe(true);
    });

    it('identifies 100% complete translation set across all 5 locales', () => {
      const fullTranslations: ContentTranslationMap = {
        fa: { title: 'شیراز', slug: 'shiraz', body: 'شهر شعر و ادب' },
        en: { title: 'Shiraz', slug: 'shiraz', body: 'City of poets and gardens' },
        ar: { title: 'شيراز', slug: 'shiraz', body: 'مدينة الشعراء والحدائق' },
        zh: { title: '设拉子', slug: 'shiraz', body: '诗与花园之城' },
        ru: { title: 'Шираз', slug: 'shiraz', body: 'Город поэтов и садов' },
      };

      const status = validateContentTranslation(fullTranslations);
      expect(status.isComplete).toBe(true);
      expect(status.completionPercentage).toBe(100);
      expect(status.missingLocales).toHaveLength(0);
    });

    it('resolves translation with RTL-aware fallback (Arabic falls back to Persian before English)', () => {
      const translations: ContentTranslationMap = {
        fa: { title: 'کویر مرنجاب', slug: 'maranjab', body: 'شن‌های روان و رمل‌های طلایی' },
        en: { title: 'Maranjab Desert', slug: 'maranjab-en', body: 'Golden sand dunes' },
      };

      // When Arabic is requested but missing, RTL-aware fallback should prefer Persian (RTL) over English
      const resolvedAr = resolveTranslation(translations, 'ar', { fallbackRtlToBase: true });
      expect(resolvedAr.title).toBe('کویر مرنجاب');

      // Direct hit works as expected
      const resolvedEn = resolveTranslation(translations, 'en');
      expect(resolvedEn.title).toBe('Maranjab Desert');
    });

    it('generates SEO-safe slugs for multi-script and unicode content', () => {
      expect(generateLocaleSlug('Classic Isfahan & Shiraz Tour', 'en')).toBe('classic-isfahan-shiraz-tour');
      expect(generateLocaleSlug('تور اختصاصی کاشان و ابیانه', 'fa')).toBe('تور-اختصاصی-کاشان-و-ابیانه');
      expect(generateLocaleSlug('جولة شيراز التاريخية', 'ar')).toBe('جولة-شيراز-التاريخية');
      expect(generateLocaleSlug('北京故宫与长城精选', 'zh')).toBe('北京故宫与长城精选');
      expect(generateLocaleSlug('Тур по Золотому Кольцу', 'ru')).toBe('Тур-по-Золотому-Кольцу');
    });
  });

  // =========================================================================
  // CMS-102: Auditable Publishing Workflow
  // =========================================================================
  describe('CMS-102: Auditable Publishing Workflow Service', () => {
    const validTranslations: ContentTranslationMap = {
      fa: { title: 'تور کویر لوت', slug: 'lut-desert', body: 'پیمایش کلوت‌های ثبت یونسکو' },
      en: { title: 'Lut Desert Tour', slug: 'lut-desert', body: 'UNESCO World Heritage Kaluts Expedition' },
    };

    it('completes the full publishing lifecycle: draft -> in_review -> published -> archived', () => {
      // 1. Create draft
      const draft = CmsPublishingService.createDraft({
        contentType: 'tour',
        translations: validTranslations,
        authorId: 'usr_author_1',
      });
      expect(draft.status).toBe('draft');
      expect(draft.authorId).toBe('usr_author_1');
      expect(draft.auditTrail).toHaveLength(1);

      // 2. Submit for review
      const underReview = CmsPublishingService.submitForReview(draft.id, 'usr_author_1', 'Ready for editorial review');
      expect(underReview.status).toBe('in_review');
      expect(underReview.submittedAt).toBeDefined();

      // 3. Publish by editor
      const published = CmsPublishingService.publish(draft.id, 'usr_editor_1', 'Approved and published');
      expect(published.status).toBe('published');
      expect(published.publisherId).toBe('usr_editor_1');
      expect(published.publishedAt).toBeDefined();

      // 4. Archive content
      const archived = CmsPublishingService.archive(draft.id, 'usr_admin_1', 'End of seasonal promotion');
      expect(archived.status).toBe('archived');
      expect(archived.archivedAt).toBeDefined();

      // 5. Verify audit history records all transitions with actor IDs
      const history = published.auditTrail;
      expect(history.length).toBe(4);
      expect(history[1].fromStatus).toBe('draft');
      expect(history[1].toStatus).toBe('in_review');
      expect(history[2].fromStatus).toBe('in_review');
      expect(history[2].toStatus).toBe('published');
      expect(history[3].fromStatus).toBe('published');
      expect(history[3].toStatus).toBe('archived');
      expect(history[3].reason).toBe('End of seasonal promotion');
    });

    it('handles editorial rejection back to draft with documented reason', () => {
      const draft = CmsPublishingService.createDraft({
        contentType: 'guide',
        translations: validTranslations,
        authorId: 'usr_author_2',
      });

      CmsPublishingService.submitForReview(draft.id, 'usr_author_2');
      const rejected = CmsPublishingService.rejectToDraft(draft.id, 'usr_editor_2', 'Missing hotel accreditation details');

      expect(rejected.status).toBe('draft');
      expect(rejected.reviewerId).toBe('usr_editor_2');
      const lastAudit = rejected.auditTrail[rejected.auditTrail.length - 1];
      expect(lastAudit.fromStatus).toBe('in_review');
      expect(lastAudit.toStatus).toBe('draft');
      expect(lastAudit.reason).toBe('Missing hotel accreditation details');
    });

    it('rejects publication when base locale is missing or empty', () => {
      const incompleteTranslations: ContentTranslationMap = {
        en: { title: 'English only', slug: 'english-only', body: 'No Persian content' },
      };

      const item = CmsPublishingService.createDraft({
        contentType: 'article',
        translations: incompleteTranslations,
        authorId: 'usr_author_3',
      });

      expect(() => {
        CmsPublishingService.submitForReview(item.id, 'usr_author_3');
      }).toThrow(/missing complete base locale/i);

      expect(() => {
        CmsPublishingService.publish(item.id, 'usr_publisher_1');
      }).toThrow(/base locale translation is incomplete/i);
    });

    it('supports scheduled future publishing and executes automated publication', () => {
      const draft = CmsPublishingService.createDraft({
        contentType: 'tour',
        translations: validTranslations,
        authorId: 'usr_author_4',
      });

      const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour ahead
      CmsPublishingService.schedulePublish(draft.id, 'usr_editor_3', futureDate);

      // Verify not published yet
      const item = CmsPublishingService.getItem(draft.id);
      expect(item?.scheduledPublishAt).toEqual(futureDate);
      expect(item?.status).toBe('draft');

      // Process with past timestamp -> nothing published
      const nonePublished = CmsPublishingService.processScheduledPublications(new Date(Date.now() - 1000));
      expect(nonePublished).toHaveLength(0);

      // Process when time has passed
      const processed = CmsPublishingService.processScheduledPublications(new Date(Date.now() + 7200 * 1000));
      expect(processed).toHaveLength(1);
      expect(processed[0].id).toBe(draft.id);
      expect(processed[0].status).toBe('published');
    });

    it('prevents modifying archived items unless restored to draft first', () => {
      const item = CmsPublishingService.createDraft({
        contentType: 'page',
        translations: validTranslations,
        authorId: 'usr_author_5',
      });

      CmsPublishingService.archive(item.id, 'usr_admin');

      expect(() => {
        CmsPublishingService.updateDraft(item.id, {
          translations: { en: { title: 'New title', slug: 'new-title', body: 'New text' } },
          authorId: 'usr_author_5',
        });
      }).toThrow(/Cannot modify archived content/i);

      // Restoring to draft allows updates again
      const restored = CmsPublishingService.restoreToDraft(item.id, 'usr_admin');
      expect(restored.status).toBe('draft');
      expect(() => {
        CmsPublishingService.updateDraft(item.id, {
          translations: { en: { title: 'New title', slug: 'new-title', body: 'New text' } },
          authorId: 'usr_author_5',
        });
      }).not.toThrow();
    });
  });

  // =========================================================================
  // CMS-103: SEO Metadata Model & Structured Data
  // =========================================================================
  describe('CMS-103: CMS SEO Metadata Model & Structured Data', () => {
    const sampleContent = {
      title: 'تور اختصاصی نیاوران و تجریش',
      slug: 'niavaran-tajrish-tour',
      body: 'سفری خاطره‌انگیز به کاخ نیاوران و بازار تجریش تهران.',
      metaDescription: 'رزرو تور لوکس کاخ نیاوران و بازار تجریش با راهنمای اختصاصی.',
    };

    it('generates canonical URL and comprehensive hreflang tags for all 5 locales + x-default', () => {
      const seo = SeoMetadataService.generateSeo({
        content: sampleContent,
        locale: 'fa',
        pathPrefix: 'tours',
        imageUrl: 'https://itrip.ir/images/niavaran.jpg',
      });

      expect(seo.canonicalUrl).toBe('https://itrip.ir/fa/tours/niavaran-tajrish-tour');

      // Hreflang alternates
      expect(seo.hreflang).toHaveLength(6); // 5 locales + x-default
      const langs = seo.hreflang.map((h) => h.lang);
      expect(langs).toContain('fa');
      expect(langs).toContain('en');
      expect(langs).toContain('ar');
      expect(langs).toContain('zh');
      expect(langs).toContain('ru');
      expect(langs).toContain('x-default');

      // x-default points to international English
      const xDefault = seo.hreflang.find((h) => h.lang === 'x-default');
      expect(xDefault?.url).toBe('https://itrip.ir/en/tours/niavaran-tajrish-tour');
    });

    it('configures OpenGraph and Twitter Card metadata with locale-specific mapping', () => {
      const seo = SeoMetadataService.generateSeo({
        content: sampleContent,
        locale: 'ar',
        pathPrefix: 'tours',
        imageUrl: 'https://itrip.ir/images/niavaran.jpg',
      });

      expect(seo.openGraph.locale).toBe('ar_SA');
      expect(seo.openGraph.siteName).toBe('iTrip / Firuzo');
      expect(seo.openGraph.images?.[0].url).toBe('https://itrip.ir/images/niavaran.jpg');
      expect(seo.twitter.card).toBe('summary_large_image');
    });

    it('generates valid Schema.org/Article JSON-LD structured data', () => {
      const jsonLd = SeoMetadataService.generateArticleJsonLd({
        title: 'راهنمای سفر به اصفهان',
        description: 'معرفی جاذبه‌های تاریخی نصف جهان',
        url: 'https://itrip.ir/fa/guide/isfahan',
        locale: 'fa',
        authorName: 'تیم تحریریه فیروزه',
        publishedTime: '2026-09-01T10:00:00Z',
      });

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('Article');
      expect(jsonLd['headline']).toBe('راهنمای سفر به اصفهان');
      expect(jsonLd['inLanguage']).toBe('fa');
      expect((jsonLd['author'] as { name: string }).name).toBe('تیم تحریریه فیروزه');
    });

    it('generates valid Schema.org/TouristTrip JSON-LD structured data with itinerary', () => {
      const jsonLd = SeoMetadataService.generateTouristTripJsonLd({
        name: 'تور ۳ روزه شیراز',
        description: 'بازدید از تخت جمشید، حافظیه و سعدیه',
        url: 'https://itrip.ir/fa/tours/shiraz-3day',
        destinationCity: 'Shiraz',
        durationDays: 3,
        price: 45000000,
        currency: 'IRR',
        itineraryDays: [
          { day: 1, title: 'تخت جمشید', description: 'بازدید از آثار هخامنشی' },
          { day: 2, title: 'حافظیه و سعدیه', description: 'دیدار از آرامگاه شاعران' },
        ],
      });

      expect(jsonLd['@type']).toBe('TouristTrip');
      expect(jsonLd['name']).toBe('تور ۳ روزه شیراز');
      const itinerary = jsonLd['itinerary'] as Array<{ dayNumber: number; name: string }>;
      expect(itinerary).toHaveLength(2);
      expect(itinerary[0].dayNumber).toBe(1);
      const offer = jsonLd['offers'] as { price: number; priceCurrency: string };
      expect(offer.price).toBe(45000000);
      expect(offer.priceCurrency).toBe('IRR');
    });

    it('generates valid Schema.org/BreadcrumbList JSON-LD structured data', () => {
      const jsonLd = SeoMetadataService.generateBreadcrumbJsonLd([
        { name: 'خانه', url: 'https://itrip.ir/fa' },
        { name: 'تورها', url: 'https://itrip.ir/fa/tours' },
        { name: 'تور کویر', url: 'https://itrip.ir/fa/tours/desert' },
      ]);

      expect(jsonLd['@type']).toBe('BreadcrumbList');
      const elements = jsonLd['itemListElement'] as Array<{ position: number; name: string; item: string }>;
      expect(elements).toHaveLength(3);
      expect(elements[0].position).toBe(1);
      expect(elements[2].name).toBe('تور کویر');
    });
  });
});
