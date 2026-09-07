/**
 * CMS-102: Auditable publishing workflow service.
 * Lifecycle: draft -> in_review -> published -> archived.
 * Tracks authorId, reviewerId, publisherId, transition timestamps, and reasons.
 */

import {
  type SupportedLocale,
  type ContentTranslationMap,
  validateContentTranslation,
} from './ContentTranslation';

export type CmsPublishingStatus = 'draft' | 'in_review' | 'published' | 'archived';

export type CmsContentType = 'tour' | 'guide' | 'travelogue' | 'experience' | 'article' | 'page';

export interface CmsAuditTransition {
  id: string;
  fromStatus: CmsPublishingStatus;
  toStatus: CmsPublishingStatus;
  actorId: string;
  timestamp: Date;
  reason?: string;
  note?: string;
}

export interface CmsContentItem {
  id: string;
  contentType: CmsContentType;
  status: CmsPublishingStatus;
  translations: ContentTranslationMap;
  authorId: string;
  reviewerId?: string;
  publisherId?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  scheduledPublishAt?: Date;
  auditTrail: CmsAuditTransition[];
  metadata?: Record<string, unknown>;
}

export class CmsPublishingService {
  private static store: Map<string, CmsContentItem> = new Map();

  /**
   * Reset store (used for test isolation)
   */
  static resetStore() {
    this.store.clear();
  }

  /**
   * Create a new draft item
   */
  static createDraft(params: {
    id?: string;
    contentType: CmsContentType;
    translations: ContentTranslationMap;
    authorId: string;
    metadata?: Record<string, unknown>;
  }): CmsContentItem {
    if (!params.authorId || !params.authorId.trim()) {
      throw new Error('authorId is required to create a draft');
    }

    const id = params.id || `cms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    const item: CmsContentItem = {
      id,
      contentType: params.contentType,
      status: 'draft',
      translations: { ...params.translations },
      authorId: params.authorId,
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        {
          id: `trans_${Date.now().toString(36)}_init`,
          fromStatus: 'draft',
          toStatus: 'draft',
          actorId: params.authorId,
          timestamp: now,
          note: 'Initial draft created',
        },
      ],
      metadata: params.metadata || {},
    };

    this.store.set(id, item);
    return item;
  }

  /**
   * Update draft content and translations
   */
  static updateDraft(
    id: string,
    params: {
      translations?: ContentTranslationMap;
      authorId: string;
      metadata?: Record<string, unknown>;
    }
  ): CmsContentItem {
    const item = this.getItemOrThrow(id);

    if (item.status === 'archived') {
      throw new Error(`Cannot modify archived content item '${id}'`);
    }

    const now = new Date();
    if (params.translations) {
      item.translations = { ...item.translations, ...params.translations };
    }
    if (params.metadata) {
      item.metadata = { ...item.metadata, ...params.metadata };
    }
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      fromStatus: item.status,
      toStatus: item.status,
      actorId: params.authorId,
      timestamp: now,
      note: 'Draft content updated',
    });

    return item;
  }

  /**
   * Submit draft for editorial review: draft -> in_review
   */
  static submitForReview(id: string, authorId: string, note?: string): CmsContentItem {
    const item = this.getItemOrThrow(id);

    if (item.status !== 'draft') {
      throw new Error(`Cannot submit for review: current status is '${item.status}', expected 'draft'`);
    }

    const completeness = validateContentTranslation(item.translations, 'fa');
    if (!completeness.hasBaseLocale) {
      throw new Error(`Cannot submit for review: missing complete base locale ('fa') translation`);
    }

    const now = new Date();
    const prevStatus = item.status;
    item.status = 'in_review';
    item.submittedAt = now;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_sub`,
      fromStatus: prevStatus,
      toStatus: 'in_review',
      actorId: authorId,
      timestamp: now,
      note: note || 'Submitted for editorial review',
    });

    return item;
  }

  /**
   * Editorial rejection: in_review -> draft
   */
  static rejectToDraft(id: string, reviewerId: string, reason: string): CmsContentItem {
    if (!reason || !reason.trim()) {
      throw new Error('Rejection reason is required');
    }

    const item = this.getItemOrThrow(id);

    if (item.status !== 'in_review') {
      throw new Error(`Cannot reject: current status is '${item.status}', expected 'in_review'`);
    }

    const now = new Date();
    const prevStatus = item.status;
    item.status = 'draft';
    item.reviewerId = reviewerId;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_rej`,
      fromStatus: prevStatus,
      toStatus: 'draft',
      actorId: reviewerId,
      timestamp: now,
      reason: reason.trim(),
      note: 'Rejected back to draft by reviewer',
    });

    return item;
  }

  /**
   * Publish content: in_review (or direct draft for authorized publisher) -> published
   */
  static publish(id: string, publisherId: string, note?: string): CmsContentItem {
    if (!publisherId || !publisherId.trim()) {
      throw new Error('publisherId is required to publish content');
    }

    const item = this.getItemOrThrow(id);

    if (item.status !== 'in_review' && item.status !== 'draft') {
      throw new Error(`Cannot publish: current status is '${item.status}'`);
    }

    const completeness = validateContentTranslation(item.translations, 'fa');
    if (!completeness.hasBaseLocale) {
      throw new Error('Cannot publish: base locale translation is incomplete');
    }

    const now = new Date();
    const prevStatus = item.status;
    item.status = 'published';
    item.publisherId = publisherId;
    item.publishedAt = now;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_pub`,
      fromStatus: prevStatus,
      toStatus: 'published',
      actorId: publisherId,
      timestamp: now,
      note: note || 'Content published to production',
    });

    return item;
  }

  /**
   * Schedule content for future publishing
   */
  static schedulePublish(id: string, publisherId: string, scheduledAt: Date): CmsContentItem {
    const item = this.getItemOrThrow(id);

    if (item.status === 'archived') {
      throw new Error('Cannot schedule archived content');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new Error('Scheduled publication time must be in the future');
    }

    const completeness = validateContentTranslation(item.translations, 'fa');
    if (!completeness.hasBaseLocale) {
      throw new Error('Cannot schedule: base locale translation is incomplete');
    }

    const now = new Date();
    item.scheduledPublishAt = scheduledAt;
    item.publisherId = publisherId;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_sched`,
      fromStatus: item.status,
      toStatus: item.status,
      actorId: publisherId,
      timestamp: now,
      note: `Scheduled publication at ${scheduledAt.toISOString()}`,
    });

    return item;
  }

  /**
   * Process scheduled publications whose scheduledPublishAt <= now
   */
  static processScheduledPublications(now: Date = new Date()): CmsContentItem[] {
    const published: CmsContentItem[] = [];

    for (const item of this.store.values()) {
      if (
        item.scheduledPublishAt &&
        item.scheduledPublishAt.getTime() <= now.getTime() &&
        (item.status === 'in_review' || item.status === 'draft')
      ) {
        const publisherId = item.publisherId || 'system_scheduler';
        item.status = 'published';
        item.publishedAt = now;
        item.scheduledPublishAt = undefined;
        item.updatedAt = now;

        item.auditTrail.push({
          id: `trans_${Date.now().toString(36)}_auto_pub`,
          fromStatus: 'draft',
          toStatus: 'published',
          actorId: publisherId,
          timestamp: now,
          note: 'Automatically published via scheduler',
        });

        published.push(item);
      }
    }

    return published;
  }

  /**
   * Archive content: published, draft, or in_review -> archived
   */
  static archive(id: string, actorId: string, reason?: string): CmsContentItem {
    const item = this.getItemOrThrow(id);

    if (item.status === 'archived') {
      return item; // Idempotent
    }

    const now = new Date();
    const prevStatus = item.status;
    item.status = 'archived';
    item.archivedAt = now;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_arc`,
      fromStatus: prevStatus,
      toStatus: 'archived',
      actorId,
      timestamp: now,
      reason: reason || 'Content archived',
    });

    return item;
  }

  /**
   * Restore archived content back to draft: archived -> draft
   */
  static restoreToDraft(id: string, actorId: string): CmsContentItem {
    const item = this.getItemOrThrow(id);

    if (item.status !== 'archived') {
      throw new Error(`Cannot restore to draft: current status is '${item.status}', expected 'archived'`);
    }

    const now = new Date();
    item.status = 'draft';
    item.archivedAt = undefined;
    item.updatedAt = now;

    item.auditTrail.push({
      id: `trans_${Date.now().toString(36)}_rst`,
      fromStatus: 'archived',
      toStatus: 'draft',
      actorId,
      timestamp: now,
      note: 'Restored from archive back to draft',
    });

    return item;
  }

  /**
   * Retrieve item by ID
   */
  static getItem(id: string): CmsContentItem | null {
    return this.store.get(id) || null;
  }

  /**
   * Retrieve item by ID or throw
   */
  static getItemOrThrow(id: string): CmsContentItem {
    const item = this.store.get(id);
    if (!item) {
      throw new Error(`CMS content item '${id}' not found`);
    }
    return item;
  }

  /**
   * Query items with optional filters
   */
  static listItems(filters?: {
    status?: CmsPublishingStatus;
    contentType?: CmsContentType;
    authorId?: string;
  }): CmsContentItem[] {
    let items = Array.from(this.store.values());

    if (filters) {
      if (filters.status) {
        items = items.filter((i) => i.status === filters.status);
      }
      if (filters.contentType) {
        items = items.filter((i) => i.contentType === filters.contentType);
      }
      if (filters.authorId) {
        items = items.filter((i) => i.authorId === filters.authorId);
      }
    }

    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}
