import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CmsPublishingService } from './CmsPublishingService';

const NOW = new Date('2026-09-17T10:00:00.000Z');
const DUE = new Date('2026-09-17T11:00:00.000Z');

function createDraft(id = 'cms_regression') {
  return CmsPublishingService.createDraft({
    id,
    contentType: 'article',
    authorId: 'author',
    translations: { fa: { title: 'Title', slug: 'title', body: 'Body' } },
    metadata: { category: 'travel' },
  });
}

describe('CMS publishing workflow regressions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    CmsPublishingService.resetStore();
  });

  afterEach(() => {
    CmsPublishingService.resetStore();
    vi.useRealTimers();
  });

  it.each(['draft', 'in_review'] as const)('records the actual %s scheduler transition exactly once', (status) => {
    const item = createDraft();
    if (status === 'in_review') CmsPublishingService.submitForReview(item.id, 'author');
    CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    expect(CmsPublishingService.processScheduledPublications(new Date(DUE.getTime() - 1))).toEqual([]);
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([item]);
    expect(item.auditTrail.at(-1)).toMatchObject({
      fromStatus: status, toStatus: 'published', actorId: 'publisher', timestamp: DUE,
    });
    expect(item.publishedAt).toEqual(DUE);
    expect(item.updatedAt).toEqual(DUE);
    expect(item.scheduledPublishAt).toBeUndefined();
    const auditCount = item.auditTrail.length;
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
    expect(item.auditTrail).toHaveLength(auditCount);
  });

  it('cancels a rejected schedule until explicitly scheduled again', () => {
    const item = createDraft();
    CmsPublishingService.submitForReview(item.id, 'author');
    CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    CmsPublishingService.rejectToDraft(item.id, 'reviewer', 'Needs revisions');
    expect(item.scheduledPublishAt).toBeUndefined();
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
    expect(item.status).toBe('draft');
    CmsPublishingService.schedulePublish(item.id, 'new_publisher', DUE);
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([item]);
    expect(item.publisherId).toBe('new_publisher');
  });

  it('cancels schedules on archive and does not resurrect them on restore', () => {
    const item = createDraft();
    CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    CmsPublishingService.archive(item.id, 'editor');
    expect(item.scheduledPublishAt).toBeUndefined();
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
    CmsPublishingService.restoreToDraft(item.id, 'editor');
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
    expect(item.status).toBe('draft');
  });

  it('clears legacy stale schedules when restoring archived content', () => {
    const item = createDraft();
    CmsPublishingService.archive(item.id, 'editor');
    item.scheduledPublishAt = DUE;
    CmsPublishingService.restoreToDraft(item.id, 'editor');
    expect(item.scheduledPublishAt).toBeUndefined();
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
  });

  it('clears pending schedules on manual publication', () => {
    const item = createDraft();
    CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    CmsPublishingService.publish(item.id, 'manual_publisher');
    expect(item.scheduledPublishAt).toBeUndefined();
    expect(item.publisherId).toBe('manual_publisher');
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([]);
  });

  it.each([new Date(NaN), new Date(NOW), new Date(NOW.getTime() - 1)])('rejects invalid or non-future schedule %s without mutation', (date) => {
    const item = createDraft();
    CmsPublishingService.schedulePublish(item.id, 'original', DUE);
    const before = structuredClone(item);
    vi.setSystemTime(new Date(NOW.getTime() + 1));
    expect(() => CmsPublishingService.schedulePublish(item.id, 'replacement', date)).toThrow(/valid date|future/);
    expect(item).toEqual(before);
  });

  it('rejects an invalid scheduler clock without mutation', () => {
    const item = createDraft();
    CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    const before = structuredClone(item);
    expect(() => CmsPublishingService.processScheduledPublications(new Date(NaN))).toThrow(/valid date/);
    expect(item).toEqual(before);
  });

  it.each(['', '   '])('requires an update author and scheduling publisher (%j)', (actor) => {
    const item = createDraft();
    const before = structuredClone(item);
    expect(() => CmsPublishingService.updateDraft(item.id, { authorId: actor, metadata: { changed: true } })).toThrow(/authorId/);
    expect(() => CmsPublishingService.schedulePublish(item.id, actor, DUE)).toThrow(/publisherId/);
    expect(item).toEqual(before);
  });

  it.each(['published', 'archived'] as const)('does not schedule %s content', (status) => {
    const item = createDraft();
    if (status === 'published') CmsPublishingService.publish(item.id, 'publisher');
    else CmsPublishingService.archive(item.id, 'editor');
    const before = structuredClone(item);
    expect(() => CmsPublishingService.schedulePublish(item.id, 'publisher', DUE)).toThrow(/Cannot schedule/);
    expect(item).toEqual(before);
  });

  it('copies the accepted schedule date so later input changes cannot reschedule it', () => {
    const item = createDraft();
    const date = new Date(DUE);
    CmsPublishingService.schedulePublish(item.id, 'publisher', date);
    date.setTime(NaN);
    expect(item.scheduledPublishAt).toEqual(DUE);
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([item]);
  });

  it.each(['in_review', 'published', 'scheduled'] as const)('validates merged translations atomically for %s updates', (status) => {
    const item = createDraft();
    if (status === 'in_review') CmsPublishingService.submitForReview(item.id, 'author');
    if (status === 'published') CmsPublishingService.publish(item.id, 'publisher');
    if (status === 'scheduled') CmsPublishingService.schedulePublish(item.id, 'publisher', DUE);
    const before = structuredClone(item);
    vi.setSystemTime(new Date(NOW.getTime() + 1));
    expect(() => CmsPublishingService.updateDraft(item.id, {
      authorId: 'editor',
      translations: { fa: { title: ' ', slug: 'title', body: 'Body' } },
      metadata: { category: 'invalid edit' },
    })).toThrow(/base locale/);
    expect(item).toEqual(before);
    CmsPublishingService.updateDraft(item.id, {
      authorId: 'editor',
      translations: { en: { title: 'English', slug: 'english', body: 'Body' } },
    });
    expect(item.translations.fa).toEqual(before.translations.fa);
    expect(item.translations.en?.title).toBe('English');
    expect(item.auditTrail.at(-1)?.actorId).toBe('editor');
  });

  it('still permits incomplete unscheduled drafts', () => {
    const item = createDraft();
    CmsPublishingService.updateDraft(item.id, {
      authorId: 'author', translations: { fa: { title: '', slug: '', body: '' } },
    });
    expect(item.translations.fa?.title).toBe('');
    expect(() => CmsPublishingService.publish(item.id, 'publisher')).toThrow(/base locale/);
  });

  it('skips content that became incomplete without blocking other due items', () => {
    const invalid = createDraft('invalid');
    const valid = createDraft('valid');
    CmsPublishingService.schedulePublish(invalid.id, 'publisher', DUE);
    CmsPublishingService.schedulePublish(valid.id, 'publisher', DUE);
    // Existing API returns live references; scheduler must revalidate them.
    invalid.translations.fa!.body = '';
    const before = structuredClone(invalid);
    expect(CmsPublishingService.processScheduledPublications(DUE)).toEqual([valid]);
    expect(invalid).toEqual(before);
    expect(valid.status).toBe('published');
  });
});
