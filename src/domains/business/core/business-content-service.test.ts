import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BusinessContentService, SECTION_REGISTRY } from './BusinessContentService';

/**
 * T0501–T0508 QA — Child CMS: registry validation, draft/publish lifecycle,
 * scheduled publishing sweeper, immutable revisions with restore.
 * Fixtures are suffix-scoped (BUSINESS_RECONCILIATION.md §trap 3).
 */
describe('QA — Business CMS (T0501–T0508)', () => {
  const suffix = `cms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const pageIds: string[] = [];

  const validSections = [
    {
      key: 'hero_banner',
      props: { title: 'تور فناوری گوانگژو', subtitle: 'ویژه فعالان حوزه فناوری' },
    },
    {
      key: 'itinerary_timeline',
      props: { days: [{ dayNumber: 1, title: 'پرواز و استقرار', description: 'ترانسفر و توجیه' }] },
    },
  ];

  afterAll(async () => {
    await prisma.businessContentRevision.deleteMany({
      where: { pageId: { in: pageIds } },
    });
    await prisma.businessContentPage.deleteMany({
      where: { slug: { endsWith: suffix } },
    });
  });

  it('registry exposes only typed section validators (no raw HTML blobs)', () => {
    expect(Object.keys(SECTION_REGISTRY).sort()).toEqual([
      'faq_accordion',
      'hero_banner',
      'included_services',
      'itinerary_timeline',
    ]);
  });

  it('creates a draft with a validated section list and initial revision', async () => {
    const page = await BusinessContentService.upsertDraft({
      slug: `cms-page-${suffix}`,
      title: 'صفحه تستی CMS',
      sections: validSections,
      seo: { metaTitle: 'تور فناوری', metaDescription: 'سفر تخصصی برای فعالان فناوری' },
      actorId: `usr_${suffix}`,
    });
    pageIds.push(page.id);

    expect(page.status).toBe('draft');
    const revisions = await prisma.businessContentRevision.findMany({
      where: { pageId: page.id },
    });
    expect(revisions.length).toBe(1);
    expect(revisions[0].note).toBe('initial draft');
  });

  it('rejects sections that are not in the registry', async () => {
    await expect(
      BusinessContentService.upsertDraft({
        slug: `cms-bad-${suffix}`,
        title: 'بخش ناشناس',
        sections: [{ key: 'raw_html_blob', props: { html: '<script/>' } }],
      })
    ).rejects.toThrow(/UNKNOWN_SECTION_KEY/);
  });

  it('refuses to publish a page with zero sections', async () => {
    const page = await BusinessContentService.upsertDraft({
      slug: `cms-empty-${suffix}`,
      title: 'صفحه خالی',
      sections: [],
    });
    pageIds.push(page.id);
    await expect(BusinessContentService.publish(page.id)).rejects.toThrow(
      /EMPTY_PAGE_CANNOT_PUBLISH/
    );
  });

  it('publishing stamps publishedAt, flips status, and appends a revision', async () => {
    const page = await BusinessContentService.upsertDraft({
      slug: `cms-pub-${suffix}`,
      title: 'صفحه انتشار',
      sections: validSections,
    });
    pageIds.push(page.id);

    const published = await BusinessContentService.publish(page.id, `usr_${suffix}`);
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeTruthy();

    const pubRevision = await prisma.businessContentRevision.findFirst({
      where: { pageId: page.id, note: 'published' },
    });
    expect(pubRevision).toBeTruthy();

    // Public read path only serves published pages.
    const publicView = await BusinessContentService.getPublished(`cms-pub-${suffix}`);
    expect(publicView?.id).toBe(page.id);
  });

  it('scheduled pages stay non-public until due, then the sweeper promotes them', async () => {
    const page = await BusinessContentService.upsertDraft({
      slug: `cms-sched-${suffix}`,
      title: 'صفحه زمان‌بندی‌شده',
      sections: validSections,
    });
    pageIds.push(page.id);

    const scheduled = await BusinessContentService.schedule(
      page.id,
      new Date(Date.now() + 60_000)
    );
    expect(scheduled.status).toBe('scheduled');
    await expect(
      BusinessContentService.getPublished(`cms-sched-${suffix}`)
    ).resolves.toBeNull();

    // Simulate the passage of time directly in DB (the service refuses past
    // scheduling) so the sweeper sees the page as due.
    await prisma.businessContentPage.update({
      where: { id: page.id },
      data: { scheduledAt: new Date(Date.now() - 1) },
    });
    const promoted = await BusinessContentService.publishDuePages();
    expect(promoted).toBeGreaterThanOrEqual(1);

    const nowPublic = await BusinessContentService.getPublished(`cms-sched-${suffix}`);
    expect(nowPublic?.status).toBe('published');
  });

  it('every save snapshots a revision and restore returns the page to draft with history intact', async () => {
    const page = await BusinessContentService.upsertDraft({
      slug: `cms-rev-${suffix}`,
      title: 'نسخه اول',
      sections: validSections,
    });
    pageIds.push(page.id);

    const revised = await BusinessContentService.upsertDraft({
      slug: `cms-rev-${suffix}`,
      title: 'نسخه دوم',
      sections: [
        { key: 'hero_banner', props: { title: 'عنوان بازنویسی‌شده' } },
        ...validSections.slice(1),
      ],
    });
    expect(revised.title).toBe('نسخه دوم');

    const revisions = await prisma.businessContentRevision.findMany({
      where: { pageId: page.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(revisions.length).toBeGreaterThanOrEqual(2);

    const restored = await BusinessContentService.restoreRevision(page.id, revisions[0].id);
    expect(restored.status).toBe('draft');
    expect(restored.title).toBe('نسخه اول');

    // Append-only: restore records its own revision instead of mutating history.
    const afterRestore = await prisma.businessContentRevision.count({
      where: { pageId: page.id },
    });
    expect(afterRestore).toBe(revisions.length + 1);
  });

  it('enforces slug+locale uniqueness (T0509 localization model)', async () => {
    await BusinessContentService.upsertDraft({
      slug: `cms-uniq-${suffix}`,
      title: 'فارسی',
      sections: validSections,
      locale: 'fa',
    });
    await BusinessContentService.upsertDraft({
      slug: `cms-uniq-${suffix}`,
      title: 'English',
      sections: validSections,
      locale: 'en',
    });
    // Same slug+locale twice → same row (upsert path), not a duplicate.
    const again = await BusinessContentService.upsertDraft({
      slug: `cms-uniq-${suffix}`,
      title: 'فارسی ویرایش‌شده',
      sections: validSections,
      locale: 'fa',
    });
    const rows = await prisma.businessContentPage.findMany({
      where: { slug: `cms-uniq-${suffix}` },
    });
    expect(rows.length).toBe(2); // fa + en
    expect(again.title).toBe('فارسی ویرایش‌شده');
  });
});
