'use server';

import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { ContentDomainService } from '@/domains/content/ContentDomainService';

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

// ==================== 1. TOURS CRUD ====================

export async function getPublicToursAction() {
  try {
    const tours = await ContentDomainService.getTours();
    return { success: true, tours: tours.filter((t) => t.isPublished) };
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
    return { success: true, tours };
  } catch (e: unknown) {
    console.error('getAdminToursAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch tours', tours: [] };
  }
}

export async function createAdminTourAction(data: Parameters<typeof ContentDomainService.createTour>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const created = await ContentDomainService.createTour(data);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/tours', 'page');

    return { success: true, tour: created };
  } catch (e: unknown) {
    console.error('createAdminTourAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت تور' };
  }
}

export async function deleteAdminTourAction(tourId: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteTour(tourId);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/tours', 'page');

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
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/tours', 'page');
    return { success: true, tour: updated };
  } catch (e: unknown) {
    console.error('toggleAdminTourPublishAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در تغییر وضعیت انتشار' };
  }
}

// ==================== 2. SIGNATURE EXPERIENCES CRUD ====================

export async function getPublicExperiencesAction(countryId?: string) {
  try {
    const experiences = await ContentDomainService.getExperiences(countryId);
    return { success: true, experiences };
  } catch (e: unknown) {
    console.error('getPublicExperiencesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch experiences', experiences: [] };
  }
}

export async function getAdminExperiencesAction(countryId?: string) {
  try {
    // Return published experiences directly if called by client components
    const experiences = await ContentDomainService.getExperiences(countryId);
    return { success: true, experiences };
  } catch (e: unknown) {
    console.error('getAdminExperiencesAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch experiences', experiences: [] };
  }
}

export async function createAdminExperienceAction(data: Parameters<typeof ContentDomainService.createExperience>[0]) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    const created = await ContentDomainService.createExperience(data);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/destinations', 'page');
    revalidatePath('/[locale]/tours', 'page');

    return { success: true, experience: created };
  } catch (e: unknown) {
    console.error('createAdminExperienceAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت تجربه اصیل' };
  }
}

export async function deleteAdminExperienceAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteExperience(id);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/destinations', 'page');
    revalidatePath('/[locale]/tours', 'page');

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

    const created = await ContentDomainService.createTravelogue(data);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/travelogues', 'page');

    return { success: true, travelogue: created };
  } catch (e: unknown) {
    console.error('createAdminTravelogueAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت سفرنامه' };
  }
}

export async function deleteAdminTravelogueAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteTravelogue(id);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/travelogues', 'page');

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

    const created = await ContentDomainService.createGuide(data);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/guide', 'page');

    return { success: true, guide: created };
  } catch (e: unknown) {
    console.error('createAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در ثبت راهنما' };
  }
}

export async function deleteAdminGuideAction(id: string) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return { success: false, error: 'Unauthorized' };

    await ContentDomainService.deleteGuide(id);
    revalidatePath('/[locale]/admin/content', 'page');
    revalidatePath('/[locale]/guide', 'page');

    return { success: true };
  } catch (e: unknown) {
    console.error('deleteAdminGuideAction error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'خطا در حذف راهنما' };
  }
}
