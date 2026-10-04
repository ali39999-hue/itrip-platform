'use server';

import { requirePermission } from '@/domains/identity/permission-service';
import {
  BusinessContentService,
  SECTION_REGISTRY,
  type SectionEntry,
} from '@/domains/business/core/BusinessContentService';
import { prisma } from '@/lib/prisma';

/**
 * T0502 — CMS server actions for the specialist Child. Every action is
 * permission-guarded with `content:manage` and attributes the acting editor.
 * Goal (§18): a non-developer content editor can create, preview, approve and
 * publish a supported landing page without code changes.
 */

export async function listContentPages() {
  try {
    await requirePermission('content:manage');
    const pages = await BusinessContentService.listForAdmin();
    return { success: true, pages };
  } catch (err: unknown) {
    console.error('listContentPages server error:', err);
    return { success: false, error: 'Failed to list content pages' };
  }
}

export async function getContentPage(pageId: string) {
  try {
    await requirePermission('content:manage');
    const page = await prisma.businessContentPage.findUnique({
      where: { id: pageId },
      include: {
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, note: true, authorId: true, createdAt: true },
        },
      },
    });
    return { success: true, page };
  } catch (err: unknown) {
    console.error('getContentPage server error:', err);
    return { success: false, error: 'Failed to fetch page' };
  }
}

export async function saveContentDraft(params: {
  pageId?: string;
  slug: string;
  locale?: string;
  vertical?: string;
  title: string;
  sections: SectionEntry[];
  seo?: Record<string, unknown>;
}) {
  try {
    const user = await requirePermission('content:manage');
    if (params.pageId) {
      // Update path: fetch current row, snapshot, then rewrite via the service.
      const existing = await prisma.businessContentPage.findUnique({ where: { id: params.pageId } });
      if (!existing) return { success: false, error: 'Page not found' };
      const updated = await BusinessContentService.upsertDraft({
        slug: existing.slug,
        locale: existing.locale,
        vertical: existing.vertical,
        title: params.title,
        sections: params.sections,
        seo: params.seo,
        actorId: user.id,
      });
      return { success: true, page: updated };
    }
    const page = await BusinessContentService.upsertDraft({
      slug: params.slug,
      locale: params.locale,
      vertical: params.vertical,
      title: params.title,
      sections: params.sections,
      seo: params.seo,
      actorId: user.id,
    });
    return { success: true, page };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save draft';
    console.error('saveContentDraft server error:', err);
    return { success: false, error: message };
  }
}

export async function publishContentPage(pageId: string) {
  try {
    const user = await requirePermission('content:manage');
    const page = await BusinessContentService.publish(pageId, user.id);
    return { success: true, page };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to publish';
    console.error('publishContentPage server error:', err);
    return { success: false, error: message };
  }
}

export async function scheduleContentPage(pageId: string, scheduledAtIso: string) {
  try {
    const user = await requirePermission('content:manage');
    const page = await BusinessContentService.schedule(
      pageId,
      new Date(scheduledAtIso),
      user.id
    );
    return { success: true, page };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to schedule';
    console.error('scheduleContentPage server error:', err);
    return { success: false, error: message };
  }
}

export async function restoreContentRevision(pageId: string, revisionId: string) {
  try {
    const user = await requirePermission('content:manage');
    const page = await BusinessContentService.restoreRevision(pageId, revisionId, user.id);
    return { success: true, page };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to restore revision';
    console.error('restoreContentRevision server error:', err);
    return { success: false, error: message };
  }
}

/** Section keys exposed to the editor UI, with their human labels. */
export async function getSectionCatalog() {
  return {
    success: true,
    sections: Object.keys(SECTION_REGISTRY).map((key) => ({
      key,
      label: {
        hero_banner: 'بنر اصلی',
        itinerary_timeline: 'برنامه روزانه',
        included_services: 'خدمات شامل',
        faq_accordion: 'سوالات متداول',
      }[key] ?? key,
    })),
  };
}
