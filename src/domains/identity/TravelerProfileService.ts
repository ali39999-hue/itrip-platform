import { prisma } from '@/lib/prisma';
import { PassportValidityGuard, PassportValidationResult } from './PassportValidityGuard';

export interface UpsertTravelerProfileDTO {
  id?: string;
  firstName: string;
  lastName: string;
  nationalId?: string | null;
  dateOfBirth?: string | null; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  nationality?: string;
}

export interface AddTravelDocumentDTO {
  type: 'PASSPORT' | 'NATIONAL_ID' | 'VISA' | 'DRIVER_LICENSE';
  documentNumber: string;
  issuingCountry?: string;
  issuedAt?: string | null; // YYYY-MM-DD
  expiresAt?: string | null; // YYYY-MM-DD
  holderName?: string | null;
  organizationId?: string | null;
  branchId?: string | null;
}

export interface EnrichedTravelDocument {
  id: string;
  travelerProfileId: string;
  organizationId: string | null;
  branchId: string | null;
  type: string;
  documentNumber: string;
  issuingCountry: string;
  issuedAt: string | null;
  expiresAt: string | null;
  holderName: string | null;
  createdAt: Date;
  updatedAt: Date;
  validity?: PassportValidationResult;
}

export interface EnrichedTravelerProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string;
  createdAt: Date;
  updatedAt: Date;
  documents: EnrichedTravelDocument[];
  primaryPassport?: EnrichedTravelDocument;
}

export class TravelerProfileService {
  /**
   * Retrieves all traveler companion profiles belonging to a user,
   * enriched with passport validity diagnostics.
   */
  static async getTravelerProfiles(userId: string): Promise<EnrichedTravelerProfile[]> {
    const profiles = await prisma.travelerProfile.findMany({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    return profiles.map((p) => {
      const enrichedDocs: EnrichedTravelDocument[] = p.documents.map((doc) => {
        let validity: PassportValidationResult | undefined;
        if (doc.type === 'PASSPORT' && doc.expiresAt) {
          validity = PassportValidityGuard.verifyPassport({
            passportExpiryDate: doc.expiresAt,
            travelDate: todayStr,
            requiredValidityDays: 180,
          });
        }
        return {
          ...doc,
          validity,
        };
      });

      const primaryPassport = enrichedDocs.find((d) => d.type === 'PASSPORT');

      return {
        ...p,
        documents: enrichedDocs,
        primaryPassport,
      };
    });
  }

  /**
   * Gets a specific traveler profile with ownership verification.
   */
  static async getTravelerProfileById(
    userId: string,
    profileId: string
  ): Promise<EnrichedTravelerProfile | null> {
    const profile = await prisma.travelerProfile.findFirst({
      where: {
        id: profileId,
        userId,
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) return null;

    const todayStr = new Date().toISOString().slice(0, 10);

    const enrichedDocs: EnrichedTravelDocument[] = profile.documents.map((doc) => {
      let validity: PassportValidationResult | undefined;
      if (doc.type === 'PASSPORT' && doc.expiresAt) {
        validity = PassportValidityGuard.verifyPassport({
          passportExpiryDate: doc.expiresAt,
          travelDate: todayStr,
        });
      }
      return {
        ...doc,
        validity,
      };
    });

    return {
      ...profile,
      documents: enrichedDocs,
      primaryPassport: enrichedDocs.find((d) => d.type === 'PASSPORT'),
    };
  }

  /**
   * Creates or updates a traveler profile for the given user.
   */
  static async upsertTravelerProfile(
    userId: string,
    dto: UpsertTravelerProfileDTO
  ): Promise<EnrichedTravelerProfile> {
    if (!dto.firstName.trim() || !dto.lastName.trim()) {
      throw new Error('نام و نام خانوادگی الزامی است.');
    }

    let profileId = dto.id;

    if (profileId) {
      // Verify ownership before updating
      const existing = await prisma.travelerProfile.findFirst({
        where: { id: profileId, userId },
      });
      if (!existing) {
        throw new Error('پروفایل مسافر یافت نشد یا شما دسترسی به آن را ندارید.');
      }

      await prisma.travelerProfile.update({
        where: { id: profileId },
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          nationalId: dto.nationalId?.trim() || null,
          dateOfBirth: dto.dateOfBirth?.trim() || null,
          gender: dto.gender || null,
          nationality: dto.nationality?.trim().toUpperCase() || 'IR',
        },
      });
    } else {
      const created = await prisma.travelerProfile.create({
        data: {
          userId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          nationalId: dto.nationalId?.trim() || null,
          dateOfBirth: dto.dateOfBirth?.trim() || null,
          gender: dto.gender || null,
          nationality: dto.nationality?.trim().toUpperCase() || 'IR',
        },
      });
      profileId = created.id;
    }

    const updated = await this.getTravelerProfileById(userId, profileId);
    if (!updated) {
      throw new Error('خطا در بارگذاری پروفایل مسافر پس از ذخیره‌سازی.');
    }
    return updated;
  }

  /**
   * Deletes a traveler profile and its associated documents.
   */
  static async deleteTravelerProfile(userId: string, profileId: string): Promise<boolean> {
    const existing = await prisma.travelerProfile.findFirst({
      where: { id: profileId, userId },
    });
    if (!existing) {
      throw new Error('پروفایل مسافر یافت نشد یا دسترسی مجاز نیست.');
    }

    await prisma.travelerProfile.delete({
      where: { id: profileId },
    });
    return true;
  }

  /**
   * Adds or updates a travel document for a specific traveler profile.
   */
  static async addTravelDocument(
    userId: string,
    profileId: string,
    docData: AddTravelDocumentDTO
  ): Promise<EnrichedTravelDocument> {
    const profile = await prisma.travelerProfile.findFirst({
      where: { id: profileId, userId },
    });
    if (!profile) {
      throw new Error('پروفایل مسافر یافت نشد یا دسترسی مجاز نیست.');
    }

    if (!docData.documentNumber.trim()) {
      throw new Error('شماره مدرک الزامی است.');
    }

    const doc = await prisma.travelDocument.create({
      data: {
        travelerProfileId: profileId,
        type: docData.type,
        documentNumber: docData.documentNumber.trim(),
        issuingCountry: docData.issuingCountry?.trim().toUpperCase() || 'IR',
        issuedAt: docData.issuedAt?.trim() || null,
        expiresAt: docData.expiresAt?.trim() || null,
        holderName: docData.holderName?.trim() || `${profile.firstName} ${profile.lastName}`,
        organizationId: docData.organizationId || null,
        branchId: docData.branchId || null,
      },
    });

    let validity: PassportValidationResult | undefined;
    if (doc.type === 'PASSPORT' && doc.expiresAt) {
      const todayStr = new Date().toISOString().slice(0, 10);
      validity = PassportValidityGuard.verifyPassport({
        passportExpiryDate: doc.expiresAt,
        travelDate: todayStr,
      });
    }

    return {
      ...doc,
      validity,
    };
  }

  /**
   * Deletes a travel document verifying the entire ownership hierarchy.
   */
  static async deleteTravelDocument(
    userId: string,
    profileId: string,
    documentId: string
  ): Promise<boolean> {
    const doc = await prisma.travelDocument.findFirst({
      where: {
        id: documentId,
        travelerProfileId: profileId,
        travelerProfile: {
          userId,
        },
      },
    });

    if (!doc) {
      throw new Error('مدرک مسافرتی یافت نشد یا دسترسی مجاز نیست.');
    }

    await prisma.travelDocument.delete({
      where: { id: documentId },
    });
    return true;
  }
}
