import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createLogger } from '@/lib/observability/logger';

const log = createLogger('BusinessContentService');

/** Validated JSON-serializable values cross the Prisma Json column boundary here. */
const asJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

/**
 * Firuzo Child CMS (T0501–T0508).
 * Child-owned per DATA_OWNERSHIP.md — the core SiteContent store is an
 * untyped key/payload blob and CmsPublishingService is memory-only, so the
 * specialist vertical gets a DB-backed, registry-validated, revisioned page
 * model. Sections are typed registry entries, never raw HTML blobs (§18).
 */

const SectionEntrySchema = z.object({
  key: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

const SeoSchema = z.object({
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(155).optional(),
  canonicalUrl: z.string().url().optional(),
  ogImage: z.string().optional(),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});

/** T0503 — section registry: every section key must validate against its props schema. */
export const SECTION_REGISTRY: Record<string, z.ZodType<Record<string, unknown>>> = {
  hero_banner: z
    .object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.string().optional(),
      bgImageUrl: z.string().optional(),
    })
    .passthrough() as unknown as z.ZodType<Record<string, unknown>>,
  itinerary_timeline: z
    .object({
      days: z
        .array(
          z.object({
            dayNumber: z.number().int().positive(),
            title: z.string().min(1),
            description: z.string().optional(),
          })
        )
        .min(1),
    })
    .passthrough() as unknown as z.ZodType<Record<string, unknown>>,
  included_services: z
    .object({
      items: z.array(z.string()).default([]),
      excluded: z.array(z.string()).default([]),
    })
    .passthrough() as unknown as z.ZodType<Record<string, unknown>>,
  faq_accordion: z
    .object({
      questions: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).min(1),
    })
    .passthrough() as unknown as z.ZodType<Record<string, unknown>>,
};

export interface SectionEntry {
  key: string;
  props: Record<string, unknown>;
}

export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: Record<string, unknown>;
}

function validateSections(input: unknown): SectionEntry[] {
  const parsed = z.array(SectionEntrySchema).parse(input);
  for (const entry of parsed) {
    const validator = SECTION_REGISTRY[entry.key];
    if (!validator) {
      throw new Error(`UNKNOWN_SECTION_KEY: '${entry.key}' is not in the section registry`);
    }
    const result = validator.safeParse(entry.props);
    if (!result.success) {
      throw new Error(`INVALID_SECTION_PROPS: section '${entry.key}' failed validation`);
    }
  }
  return parsed;
}

function validateSeo(input: unknown): SeoFields | null {
  if (input === undefined || input === null) return null;
  const result = SeoSchema.safeParse(input);
  if (!result.success) {
    throw new Error('INVALID_SEO_FIELDS: seo metadata failed validation');
  }
  return result.data;
}

export class BusinessContentService {
  /**
   * Create or update a draft page. Every save snapshots a revision (T0507).
   */
  static async upsertDraft(params: {
    slug: string;
    locale?: string;
    vertical?: string;
    title: string;
    sections: unknown;
    seo?: unknown;
    actorId?: string | null;
  }) {
    const sections = validateSections(params.sections);
    const seo = validateSeo(params.seo);
    const locale = params.locale || 'fa';

    const existing = await prisma.businessContentPage.findUnique({
      where: { slug_locale: { slug: params.slug, locale } },
      include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (existing) {
      // Snapshot the outgoing state before overwriting (restore path).
      await prisma.businessContentRevision.create({
        data: {
          pageId: existing.id,
          snapshot: {
            title: existing.title,
            sections: existing.sections,
            seo: existing.seo,
            status: existing.status,
          },
          authorId: params.actorId || null,
          note: 'pre-save snapshot',
        },
      });

      const updated = await prisma.businessContentPage.update({
        where: { id: existing.id },
        data: {
          title: params.title,
          sections: asJson(sections),
          seo: seo ? asJson(seo) : undefined,
          updatedById: params.actorId || null,
        },
      });
      log.info('CMS draft updated', { pageId: updated.id, slug: params.slug, locale });
      return updated;
    }

    const created = await prisma.businessContentPage.create({
      data: {
        slug: params.slug,
        locale,
        vertical: params.vertical || 'technology',
        title: params.title,
        sections: asJson(sections),
        seo: seo ? asJson(seo) : undefined,
        status: 'draft',
        createdById: params.actorId || null,
        updatedById: params.actorId || null,
      },
    });
    await prisma.businessContentRevision.create({
      data: {
        pageId: created.id,
        snapshot: asJson({ title: created.title, sections, seo: seo ?? null, status: 'draft' }),
        authorId: params.actorId || null,
        note: 'initial draft',
      },
    });
    log.info('CMS draft created', { pageId: created.id, slug: params.slug, locale });
    return created;
  }

  /**
   * Publish immediately. A page must carry at least one registry-valid section.
   */
  static async publish(pageId: string, actorId?: string | null) {
    const page = await prisma.businessContentPage.findUnique({ where: { id: pageId } });
    if (!page) throw new Error('PAGE_NOT_FOUND');
    if (page.status === 'archived') throw new Error('ARCHIVED_PAGE_CANNOT_PUBLISH');

    const sections = validateSections(page.sections);
    if (sections.length === 0) throw new Error('EMPTY_PAGE_CANNOT_PUBLISH');

    await prisma.businessContentRevision.create({
      data: {
        pageId,
        snapshot: asJson({ title: page.title, sections: page.sections, seo: page.seo, status: 'published' }),
        authorId: actorId || null,
        note: 'published',
      },
    });

    const published = await prisma.businessContentPage.update({
      where: { id: pageId },
      data: { status: 'published', publishedAt: new Date(), scheduledAt: null, updatedById: actorId || null },
    });
    log.info('CMS page published', { pageId, slug: page.slug });
    return published;
  }

  /**
   * T0508 — schedule a future publish. The page stays non-public until the
   * sweeper promotes it at (or after) the scheduled time.
   */
  static async schedule(pageId: string, scheduledAt: Date, actorId?: string | null) {
    if (scheduledAt.getTime() <= Date.now()) {
      throw new Error('SCHEDULE_TIME_MUST_BE_FUTURE');
    }
    const page = await prisma.businessContentPage.update({
      where: { id: pageId },
      data: { status: 'scheduled', scheduledAt, updatedById: actorId || null },
    });
    log.info('CMS page scheduled', { pageId, scheduledAt: scheduledAt.toISOString() });
    return page;
  }

  /**
   * T0508 sweeper — promotes every due scheduled page. Idempotent; safe to
   * call from a worker/cron on any interval.
   */
  static async publishDuePages() {
    const due = await prisma.businessContentPage.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const page of due) {
      try {
        await this.publish(page.id, null);
      } catch (err) {
        log.warn('Scheduled publish failed', {
          pageId: page.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return due.length;
  }

  /**
   * T0507 — restore an immutable revision. The restore itself records a new
   * revision so history stays append-only and reproducible.
   */
  static async restoreRevision(pageId: string, revisionId: string, actorId?: string | null) {
    const revision = await prisma.businessContentRevision.findUnique({ where: { id: revisionId } });
    if (!revision || revision.pageId !== pageId) throw new Error('REVISION_NOT_FOUND');

    const snapshot = revision.snapshot as { title?: string; sections?: unknown; seo?: unknown };
    const sections = validateSections(snapshot.sections);
    const seo = validateSeo(snapshot.seo);

    await prisma.businessContentRevision.create({
      data: {
        pageId,
        snapshot: asJson({ title: snapshot.title, sections, seo: seo ?? null, status: 'draft' }),
        authorId: actorId || null,
        note: `restored revision ${revisionId}`,
      },
    });

    return prisma.businessContentPage.update({
      where: { id: pageId },
      data: {
        title: snapshot.title || 'بدون عنوان',
        sections: asJson(sections),
        seo: seo ? asJson(seo) : undefined,
        status: 'draft',
        updatedById: actorId || null,
      },
    });
  }

  /** Public read path — only published pages are ever returned. */
  static async getPublished(slug: string, locale = 'fa') {
    return prisma.businessContentPage.findFirst({
      where: { slug, locale, status: 'published' },
    });
  }

  /** Admin listing with revision counts. */
  static async listForAdmin() {
    return prisma.businessContentPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { revisions: true } } },
    });
  }
}
