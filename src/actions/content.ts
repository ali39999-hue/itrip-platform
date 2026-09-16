'use server';

import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  tourInputSchema,
  tourUpdateSchema,
  experienceInputSchema,
  experienceUpdateSchema,
  travelogueInputSchema,
  travelogueUpdateSchema,
  guideInputSchema,
  guideUpdateSchema,
} from '@/lib/validations';
import { ContentDomainService } from '@/domains/content/ContentDomainService';
import { SiteContentService, SITE_CONTENT_KEYS, type SiteContentKey } from '@/domains/content/SiteContentService';
import { sanitizeUserObject } from '@/lib/security/content-sanitizer';

// NOTE: CMS zod schemas live in `@/lib/validations` (plain lib module).
// A `"use server"` file may only export async functions, so this module
// exports actions only.

async function checkAdminAuth(): Promise<boolean> {
  try {
    const session = await safeAuth();
    if (session?.user?.id) {
      const role = session.user.role || '';
      if (
        role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        role === 'OPERATOR' ||
        role === 'OPS' ||
        role === 'FINANCE'
      ) {
        return true;
      }
      const { isKnownAdminIdentifier } = await import('@/auth');
      if (session.user.email && isKnownAdminIdentifier(session.user.email)) {
        return true;
      }

      const { hasErpRole } = await import('@/domains/identity/permission-service');
      const hasRole = await hasErpRole(session.user.id);
      if (hasRole) return true;
    }

    // In non-production or demo environment, permit access gracefully
    if (
      process.env.NODE_ENV !== 'production' &&
      (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'test' || !session)
    ) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[checkAdminAuth] Auth verification notice:', err);
    return process.env.NODE_ENV !== 'production';
  }
}

function revalidateContentPaths() {
  revalidatePath('/[locale]/admin/content', 'page');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/tours', 'page');
  revalidatePath('/[locale]/tours/[id]', 'page');
  revalidatePath('/[locale]/transfers', 'page');
  revalidatePath('/[locale]/visa', 'page');
  revalidatePath('/[locale]/destinations', 'page');
  revalidatePath('/[locale]/travelogues', 'page');
  revalidatePath('/[locale]/guide', 'page');
}

/** Converts any Prisma Decimal or non-plain object into a standard plain serializable structure */
function sanitizeExperience(exp: Record<string, unknown>) {
  return {
    id: String(exp.id || ''),
    countryId: String(exp.countryId || 'iran'),
    category: String(exp.category || 'culture'),
    title: String(exp.title || ''),
    titleEn: String(exp.titleEn || ''),
    desc: String(exp.desc || ''),
    descEn: String(exp.descEn || ''),
    where: String(exp.where || ''),
    whereEn: String(exp.whereEn || ''),
    when: String(exp.when || ''),
    whenEn: String(exp.whenEn || ''),
    fromPrice: typeof exp.fromPrice === 'object' && exp.fromPrice !== null ? Number(exp.fromPrice.toString()) : (Number(exp.fromPrice) || 0),
    image: exp.image ? String(exp.image) : null,
    isActive: Boolean(exp.isActive),
    createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : String(exp.createdAt || ''),
    updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : String(exp.updatedAt || ''),
  };
}

function sanitizeTour(t: Record<string, unknown>) {
  return {
    ...t,
    id: String(t.id || ''),
    title: String(t.title || ''),
    titleEn: String(t.titleEn || ''),
    city: String(t.city || ''),
    cityEn: t.cityEn ? String(t.cityEn) : null,
    country: String(t.country || 'ایران'),
    countryEn: t.countryEn ? String(t.countryEn) : null,
    durationDays: Number(t.durationDays || 3),
    durationNights: Number(t.durationNights || 2),
    currency: String(t.currency || 'TOMAN'),
    category: String(t.category || 'cultural'),
    isPublished: t.isPublished !== undefined ? Boolean(t.isPublished) : true,
    price: typeof t.price === 'object' && t.price !== null ? Number(t.price.toString()) : (Number(t.price) || 0),
    childPrice: t.childPrice != null ? (typeof t.childPrice === 'object' ? Number(t.childPrice.toString()) : Number(t.childPrice)) : null,
    originalPrice: t.originalPrice != null ? (typeof t.originalPrice === 'object' ? Number(t.originalPrice.toString()) : Number(t.originalPrice)) : null,
    discountPercent: t.discountPercent != null ? Number(t.discountPercent) : null,
    departureDates: Array.isArray(t.departureDates)
      ? t.departureDates.map((d: Record<string, unknown>) => ({
          ...d,
          currency: String(d.currency || t.currency || 'TOMAN'),
          price: typeof d.price === 'object' && d.price !== null ? Number(d.price.toString()) : (Number(d.price) || 0),
          childPrice: d.childPrice != null ? (typeof d.childPrice === 'object' ? Number(d.childPrice.toString()) : Number(d.childPrice)) : null,
        }))
      : [],
    itineraryDays: Array.isArray(t.itineraryDays) ? t.itineraryDays : [],
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt || ''),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt || ''),
  };
}

// ==================== 1. TOURS CRUD ====================

export async function getPublicToursAction() {
  try {
    const tours = await ContentDomainService.getTours();
    return { success: true, tours: (tours || []).filter((t: { isPublished?: boolean }) => t?.isPublished).map(sanitizeTour) };
  } catch (e: unknown) {
    console.error('getPublicToursAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch tours', tours: [] };
  }
}

export async function getAdminToursAction() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', tours: [] };

    const tours = await ContentDomainService.getTours();
    return { success: true, tours: (tours || []).filter(Boolean).map(sanitizeTour) };
  } catch (e: unknown) {
    console.error('getAdminToursAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch tours', tours: [] };
  }
}

export async function createAdminTourAction(data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = tourInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const sanitized = sanitizeUserObject(parsed.data);
    const created = await ContentDomainService.createTour(sanitized as Parameters<typeof ContentDomainService.createTour>[0]);
    revalidateContentPaths();

    return { success: true, tour: sanitizeTour(created) };
  } catch (e: unknown) {
    console.error('createAdminTourAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت تور' };
  }
}

export async function updateAdminTourAction(id: string, data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = tourUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const sanitized = sanitizeUserObject(parsed.data);
    const updated = await ContentDomainService.updateTour(id, sanitized as Parameters<typeof ContentDomainService.updateTour>[1]);
    revalidateContentPaths();
    return { success: true, tour: sanitizeTour(updated) };
  } catch (e: unknown) {
    console.error('updateAdminTourAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ویرایش تور' };
  }
}

export async function deleteAdminTourAction(tourId: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteTour(tourId);
    revalidateContentPaths();

    return { success: true };
  } catch (e: unknown) {
    console.error('deleteAdminTourAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در حذف تور' };
  }
}

export async function toggleAdminTourPublishAction(tourId: string, isPublished: boolean) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const updated = await ContentDomainService.toggleTourPublish(tourId, isPublished);
    revalidateContentPaths();
    return { success: true, tour: sanitizeTour(updated) };
  } catch (e: unknown) {
    console.error('toggleAdminTourPublishAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در تغییر وضعیت انتشار' };
  }
}

// ==================== 2. SIGNATURE EXPERIENCES CRUD ====================

export async function getPublicExperiencesAction(countryId?: string) {
  try {
    const experiences = await ContentDomainService.getExperiences(countryId, true);
    return { success: true, experiences: (experiences || []).filter(Boolean).map(sanitizeExperience) };
  } catch (e: unknown) {
    console.error('getPublicExperiencesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch experiences', experiences: [] };
  }
}

export async function getAdminExperiencesAction(countryId?: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', experiences: [] };
    const experiences = await ContentDomainService.getExperiences(countryId);
    return { success: true, experiences: (experiences || []).filter(Boolean).map(sanitizeExperience) };
  } catch (e: unknown) {
    console.error('getAdminExperiencesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch experiences', experiences: [] };
  }
}

export async function createAdminExperienceAction(data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = experienceInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const d = parsed.data;
    const sanitized = sanitizeUserObject({
      countryId: d.countryId || 'iran',
      category: d.category || 'cultural',
      title: d.title.trim(),
      titleEn: d.titleEn?.trim() || d.title.trim(),
      desc: d.desc.trim(),
      descEn: d.descEn?.trim() || d.desc.trim(),
      where: d.where?.trim() || 'ایران',
      whereEn: d.whereEn?.trim() || d.where?.trim() || 'Iran',
      when: d.when?.trim() || 'تمام ایام سال',
      whenEn: d.whenEn?.trim() || d.when?.trim() || 'All Year',
      fromPrice: d.fromPrice || 0,
      image: d.image || undefined,
    });

    const created = await ContentDomainService.createExperience(sanitized as Parameters<typeof ContentDomainService.createExperience>[0]);
    revalidateContentPaths();

    return { success: true, experience: sanitizeExperience(created) };
  } catch (e: unknown) {
    console.error('createAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت ماجراجویی' };
  }
}

export async function updateAdminExperienceAction(id: string, data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = experienceUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const sanitized = sanitizeUserObject(parsed.data);
    const updated = await ContentDomainService.updateExperience(id, sanitized as Parameters<typeof ContentDomainService.updateExperience>[1]);
    revalidateContentPaths();
    return { success: true, experience: sanitizeExperience(updated) };
  } catch (e: unknown) {
    console.error('updateAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ویرایش ماجراجویی' };
  }
}

export async function deleteAdminExperienceAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteExperience(id);
    revalidateContentPaths();

    return { success: true };
  } catch (e: unknown) {
    console.error('deleteAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در حذف تجربه' };
  }
}

export async function toggleAdminExperienceActiveAction(id: string, isActive: boolean) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const updated = await ContentDomainService.toggleExperienceActive(id, isActive);
    revalidateContentPaths();
    return { success: true, experience: sanitizeExperience(updated) };
  } catch (e: unknown) {
    console.error('toggleAdminExperienceActiveAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در تغییر وضعیت تجربه' };
  }
}

// ==================== 3. TRAVELOGUES CRUD ====================

export async function getPublicTraveloguesAction() {
  try {
    const travelogues = await ContentDomainService.getTravelogues();
    return { success: true, travelogues: (travelogues || []).filter((t) => t?.isPublished) };
  } catch (e: unknown) {
    console.error('getPublicTraveloguesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch travelogues', travelogues: [] };
  }
}

export async function getAdminTraveloguesAction() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', travelogues: [] };
    const travelogues = await ContentDomainService.getTravelogues();
    return { success: true, travelogues: travelogues || [] };
  } catch (e: unknown) {
    console.error('getAdminTraveloguesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch travelogues', travelogues: [] };
  }
}

export async function createAdminTravelogueAction(data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = travelogueInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const d = parsed.data;
    const titleFa = (d.titleFa || d.title || '').trim();
    const destFa = (d.destFa || d.city || 'ایران').trim();
    const userName = (d.userName || d.author || 'کاربر فیروزو').trim();
    const contentFa = (d.contentFa || d.content || d.summary || '').trim();
    const image = (d.image || d.coverImage || undefined)?.trim();

    if (!titleFa) return { success: false, error: 'عنوان سفرنامه الزامی است' };
    if (!destFa) return { success: false, error: 'مقصد سفرنامه الزامی است' };
    if (!userName) return { success: false, error: 'نام نویسنده الزامی است' };

    const sanitized = sanitizeUserObject({
      countryId: d.countryId || 'iran',
      titleFa,
      titleEn: d.titleEn?.trim() || titleFa,
      destFa,
      destEn: d.cityEn?.trim() || destFa,
      userName,
      image,
      contentFa,
      contentEn: d.contentEn?.trim() || contentFa,
    });

    const created = await ContentDomainService.createTravelogue(sanitized as Parameters<typeof ContentDomainService.createTravelogue>[0]);
    revalidateContentPaths();

    return { success: true, travelogue: created };
  } catch (e: unknown) {
    console.error('createAdminTravelogueAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت سفرنامه' };
  }
}

export async function updateAdminTravelogueAction(id: string, data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = travelogueUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const d = parsed.data;
    const titleFa = d.titleFa || d.title;
    const destFa = d.destFa || d.city;
    const userName = d.userName || d.author;
    const contentFa = d.contentFa || d.content;
    const image = d.image || d.coverImage;

    const sanitized = sanitizeUserObject({
      ...(titleFa !== undefined && { titleFa: titleFa.trim() }),
      ...(destFa !== undefined && { destFa: destFa.trim() }),
      ...(userName !== undefined && { userName: userName.trim() }),
      ...(image != null && typeof image === 'string' && image.trim() && { image: image.trim() }),
      ...(contentFa !== undefined && { contentFa: contentFa.trim() }),
      ...(d.isPublished !== undefined && { isPublished: d.isPublished }),
    });

    const updated = await ContentDomainService.updateTravelogue(id, sanitized as Parameters<typeof ContentDomainService.updateTravelogue>[1]);
    revalidateContentPaths();
    return { success: true, travelogue: updated };
  } catch (e: unknown) {
    console.error('updateAdminTravelogueAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ویرایش سفرنامه' };
  }
}

export async function deleteAdminTravelogueAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteTravelogue(id);
    revalidateContentPaths();

    return { success: true };
  } catch (e: unknown) {
    console.error('deleteAdminTravelogueAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در حذف سفرنامه' };
  }
}

export async function toggleAdminTraveloguePublishAction(id: string, isPublished: boolean) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const updated = await ContentDomainService.toggleTraveloguePublish(id, isPublished);
    revalidateContentPaths();
    return { success: true, travelogue: updated };
  } catch (e: unknown) {
    console.error('toggleAdminTraveloguePublishAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در تغییر وضعیت انتشار سفرنامه' };
  }
}

// ==================== 4. TRAVEL GUIDES CRUD ====================

export async function getPublicGuidesAction() {
  try {
    const guides = await ContentDomainService.getGuides();
    return { success: true, guides: guides || [] };
  } catch (e: unknown) {
    console.error('getPublicGuidesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch guide articles', guides: [] };
  }
}

export async function getAdminGuidesAction() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', guides: [] };
    const guides = await ContentDomainService.getGuides();
    return { success: true, guides: guides || [] };
  } catch (e: unknown) {
    console.error('getAdminGuidesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch guide articles', guides: [] };
  }
}

export async function createAdminGuideAction(data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = guideInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const d = parsed.data;
    const titleFa = (d.titleFa || d.title || '').trim();
    const categoryFa = (d.categoryFa || d.category || 'نکات سفر').trim();
    const excerptFa = (d.excerptFa || d.summary || titleFa).trim();
    const bodyFa = (d.bodyFa || d.content || excerptFa).trim();
    const image = (d.image || d.coverImage || undefined)?.trim();

    if (!titleFa) return { success: false, error: 'عنوان راهنما الزامی است' };
    if (!excerptFa) return { success: false, error: 'خلاصه یا توضیحات راهنما الزامی است' };

    const sanitized = sanitizeUserObject({
      categoryFa,
      categoryEn: d.categoryEn?.trim() || 'Travel Tips',
      titleFa,
      titleEn: d.titleEn?.trim() || titleFa,
      readTime: d.readTime?.trim() || '۵ دقیقه',
      excerptFa,
      excerptEn: d.excerptEn?.trim() || d.summaryEn?.trim() || excerptFa,
      bodyFa,
      bodyEn: d.bodyEn?.trim() || d.contentEn?.trim() || bodyFa,
      image,
    });

    const created = await ContentDomainService.createGuide(sanitized as Parameters<typeof ContentDomainService.createGuide>[0]);
    revalidateContentPaths();

    return { success: true, guide: created };
  } catch (e: unknown) {
    console.error('createAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت راهنما' };
  }
}

export async function updateAdminGuideAction(id: string, data: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const parsed = guideUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.issues.map((i) => i.message).join('؛ ');
      return { success: false, error: `اعتبارسنجی ناموفق بود: ${errs}` };
    }

    const d = parsed.data;
    const titleFa = d.titleFa || d.title;
    const categoryFa = d.categoryFa || d.category;
    const excerptFa = d.excerptFa || d.summary;
    const bodyFa = d.bodyFa || d.content;
    const image = d.image || d.coverImage;

    const sanitized = sanitizeUserObject({
      ...(categoryFa !== undefined && { categoryFa: categoryFa.trim() }),
      ...(titleFa !== undefined && { titleFa: titleFa.trim() }),
      ...(d.readTime !== undefined && { readTime: d.readTime.trim() }),
      ...(excerptFa !== undefined && { excerptFa: excerptFa.trim() }),
      ...(bodyFa !== undefined && { bodyFa: bodyFa.trim() }),
      ...(image != null && typeof image === 'string' && image.trim() && { image: image.trim() }),
      ...(d.isPublished !== undefined && { isPublished: d.isPublished }),
    });

    const updated = await ContentDomainService.updateGuide(id, sanitized as Parameters<typeof ContentDomainService.updateGuide>[1]);
    revalidateContentPaths();
    return { success: true, guide: updated };
  } catch (e: unknown) {
    console.error('updateAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ویرایش راهنما' };
  }
}

export async function deleteAdminGuideAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteGuide(id);
    revalidateContentPaths();

    return { success: true };
  } catch (e: unknown) {
    console.error('deleteAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در حذف راهنما' };
  }
}

export async function toggleAdminGuidePublishAction(id: string, isPublished: boolean) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const updated = await ContentDomainService.toggleGuidePublish(id, isPublished);
    revalidateContentPaths();
    return { success: true, guide: updated };
  } catch (e: unknown) {
    console.error('toggleAdminGuidePublishAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در تغییر وضعیت انتشار راهنما' };
  }
}

// ==================== 5. SITE CONTENT (page-level overrides) ====================

export async function getSiteContentAction() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', entries: [] };
    const entries = await SiteContentService.list();
    const sanitized = (entries || []).map((e) => ({
      ...e,
      updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : String(e.updatedAt || ''),
    }));
    return { success: true, entries: sanitized };
  } catch (e: unknown) {
    console.error('getSiteContentAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در دریافت محتوای صفحات', entries: [] };
  }
}

export async function saveSiteContentAction(key: string, payload: unknown) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };
    if (!SITE_CONTENT_KEYS.includes(key as SiteContentKey)) {
      return { success: false, error: 'کلید محتوا نامعتبر است.' };
    }

    const session = await safeAuth();
    const entry = await SiteContentService.upsert(key as SiteContentKey, payload, session?.user?.id);
    revalidateContentPaths();
    return {
      success: true,
      entry: {
        ...entry,
        updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : String(entry.updatedAt || ''),
      },
    };
  } catch (e: unknown) {
    console.error('saveSiteContentAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ذخیره محتوای صفحه' };
  }
}

export async function resetSiteContentAction(key: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };
    if (!SITE_CONTENT_KEYS.includes(key as SiteContentKey)) {
      return { success: false, error: 'کلید محتوا نامعتبر است.' };
    }

    await SiteContentService.remove(key as SiteContentKey);
    revalidateContentPaths();
    return { success: true };
  } catch (e: unknown) {
    console.error('resetSiteContentAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در بازگردانی محتوای پیش‌فرض' };
  }
}
