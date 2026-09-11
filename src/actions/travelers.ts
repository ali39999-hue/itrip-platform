'use server';

import { safeAuth } from '@/auth';
import {
  TravelerProfileService,
  UpsertTravelerProfileDTO,
  AddTravelDocumentDTO,
  EnrichedTravelerProfile,
  EnrichedTravelDocument,
} from '@/domains/identity/TravelerProfileService';

export async function getMyTravelerProfilesAction(): Promise<{
  success: boolean;
  data?: EnrichedTravelerProfile[];
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    const profiles = await TravelerProfileService.getTravelerProfiles(session.user.id);
    return { success: true, data: profiles };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات مسافران';
    return { success: false, error: errorMsg };
  }
}

export async function saveTravelerProfileAction(
  data: UpsertTravelerProfileDTO
): Promise<{
  success: boolean;
  profile?: EnrichedTravelerProfile;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    const profile = await TravelerProfileService.upsertTravelerProfile(session.user.id, data);
    return { success: true, profile };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در ذخیره مشخصات مسافر';
    return { success: false, error: errorMsg };
  }
}

export async function deleteTravelerProfileAction(
  profileId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    await TravelerProfileService.deleteTravelerProfile(session.user.id, profileId);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در حذف مسافر';
    return { success: false, error: errorMsg };
  }
}

export async function saveTravelDocumentAction(
  profileId: string,
  docData: AddTravelDocumentDTO
): Promise<{
  success: boolean;
  document?: EnrichedTravelDocument;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    const document = await TravelerProfileService.addTravelDocument(
      session.user.id,
      profileId,
      docData
    );
    return { success: true, document };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در ذخیره مدرک مسافرتی';
    return { success: false, error: errorMsg };
  }
}

export async function deleteTravelDocumentAction(
  profileId: string,
  documentId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    await TravelerProfileService.deleteTravelDocument(session.user.id, profileId, documentId);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در حذف مدرک مسافرتی';
    return { success: false, error: errorMsg };
  }
}
