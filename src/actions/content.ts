'use server';

import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { ContentDomainService } from '@/domains/content/ContentDomainService';
import { SiteContentService, SITE_CONTENT_KEYS, type SiteContentKey } from '@/domains/content/SiteContentService';
import { sanitizeUserObject } from '@/lib/security/content-sanitizer';

async function checkAdminAuth() {
  const session = await safeAuth();
  if (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true') {
    return true;
  }
  if (!session?.user?.id) return false;
  try {
    const { hasErpRole } = await import('@/domains/identity/permission-service');
    return await hasErpRole(session.user.id);
  } catch {
    return false;
  }
}

function revalidateContentPaths() {
  revalidatePath('/[locale]/admin/content', 'page');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/tours', 'page');
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
    category: String(t.category || 'cultural'),
    isPublished: Boolean(t.isPublished),
    price: typeof t.price === 'object' && t.price !== null ? Number(t.price.toString()) : (Number(t.price) || 0),
    childPrice: t.childPrice != null ? (typeof t.childPrice === 'object' ? Number(t.childPrice.toString()) : Number(t.childPrice)) : null,
    departureDates: Array.isArray(t.departureDates)
      ? t.departureDates.map((d: Record<string, unknown>) => ({
          ...d,
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

export async function createAdminTourAction(data: Parameters<typeof ContentDomainService.createTour>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const created = await ContentDomainService.createTour(sanitized);
    revalidateContentPaths();

    return { success: true, tour: sanitizeTour(created) };
  } catch (e: unknown) {
    console.error('createAdminTourAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت تور' };
  }
}

export async function updateAdminTourAction(id: string, data: Parameters<typeof ContentDomainService.updateTour>[1]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const updated = await ContentDomainService.updateTour(id, sanitized);
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

export async function createAdminExperienceAction(data: Parameters<typeof ContentDomainService.createExperience>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const created = await ContentDomainService.createExperience(sanitized);
    revalidateContentPaths();

    return { success: true, experience: sanitizeExperience(created) };
  } catch (e: unknown) {
    console.error('createAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت تجربه اصیل' };
  }
}

export async function updateAdminExperienceAction(id: string, data: Parameters<typeof ContentDomainService.updateExperience>[1]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const updated = await ContentDomainService.updateExperience(id, sanitized);
    revalidateContentPaths();
    return { success: true, experience: sanitizeExperience(updated) };
  } catch (e: unknown) {
    console.error('updateAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ویرایش تجربه اصیل' };
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

// ==================== 3. TRAVELOGUES CRUD ====================

export async function getPublicTraveloguesAction() {
  try {
    const travelogues = await ContentDomainService.getTravelogues();
    return { success: true, travelogues: travelogues.filter((t) => t.isPublished) };
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
    return { success: true, travelogues };
  } catch (e: unknown) {
    console.error('getAdminTraveloguesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch travelogues', travelogues: [] };
  }
}

export async function createAdminTravelogueAction(data: Parameters<typeof ContentDomainService.createTravelogue>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const created = await ContentDomainService.createTravelogue(sanitized);
    revalidateContentPaths();

    return { success: true, travelogue: created };
  } catch (e: unknown) {
    console.error('createAdminTravelogueAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت سفرنامه' };
  }
}

export async function updateAdminTravelogueAction(id: string, data: Parameters<typeof ContentDomainService.updateTravelogue>[1]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const updated = await ContentDomainService.updateTravelogue(id, sanitized);
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

// ==================== 4. TRAVEL GUIDES CRUD ====================

export async function getPublicGuidesAction() {
  try {
    const guides = await ContentDomainService.getGuides();
    return { success: true, guides };
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
    return { success: true, guides };
  } catch (e: unknown) {
    console.error('getAdminGuidesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch guide articles', guides: [] };
  }
}

export async function createAdminGuideAction(data: Parameters<typeof ContentDomainService.createGuide>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const created = await ContentDomainService.createGuide(sanitized);
    revalidateContentPaths();

    return { success: true, guide: created };
  } catch (e: unknown) {
    console.error('createAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت راهنما' };
  }
}

export async function updateAdminGuideAction(id: string, data: Parameters<typeof ContentDomainService.updateGuide>[1]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const sanitized = sanitizeUserObject(data);
    const updated = await ContentDomainService.updateGuide(id, sanitized);
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

// ==================== 5. SITE CONTENT (page-level overrides) ====================

export async function getSiteContentAction() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized', entries: [] };
    const entries = await SiteContentService.list();
    return { success: true, entries };
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
    return { success: true, entry };
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
