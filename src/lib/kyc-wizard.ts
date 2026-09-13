/**
 * Pure KYC-completion wizard logic for the "تکمیل اطلاعات" flow.
 * Kept free of React/prisma imports so unit tests can exercise the gates
 * directly (BASE-006: component/import chains reaching prisma are untestable).
 */
import { toAsciiDigits, validateNationalId } from '@/lib/iranian-commerce';

export interface KycDraft {
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  nationalId: string;
  passportNo: string;
  passportExpiry: string;
}

export const KYC_STEP_COUNT = 3; // 0 مشخصات فردی · 1 احراز هویت · 2 بازبینی

/** Persian/Arabic digits → ASCII, strips non-digits (e.g. paste from PDFs). */
export function normalizeNationalId(raw: string): string {
  return toAsciiDigits(raw || '').replace(/\D/g, '');
}

/** Step 1 (هویت) gate: Persian first + last name are mandatory. */
export function isIdentityStepValid(d: Pick<KycDraft, 'firstNameFa' | 'lastNameFa'>): boolean {
  return Boolean(d.firstNameFa.trim() && d.lastNameFa.trim());
}

/**
 * Step 2 (احراز هویت) gate: a checksum-valid 10-digit کد ملی, OR a passport
 * number for foreign nationals (same rule as the checkout KYC gate).
 */
export function isVerificationStepValid(d: Pick<KycDraft, 'nationalId' | 'passportNo'>): boolean {
  const passportOk = d.passportNo.trim().length >= 5;
  const nid = normalizeNationalId(d.nationalId);
  if (!nid) return passportOk;
  return validateNationalId(nid) || passportOk;
}

/**
 * Server-authoritative mirror of KYC completeness used to decide whether the
 * identity data on file satisfies the platform KYC: name + last name plus a
 * national ID (or passport for non-Iranian users).
 */
export function isKycDataComplete(
  u:
    | {
        firstNameFa?: string | null;
        lastNameFa?: string | null;
        nationalId?: string | null;
        passportNo?: string | null;
      }
    | null
    | undefined,
): boolean {
  return Boolean(u?.firstNameFa && u?.lastNameFa && (u?.nationalId || u?.passportNo));
}

/**
 * Builds the updateProfileDetails payload: empty strings must be omitted
 * (zod `.optional()` rejects '' — e.g. a phone-OTP user has no email).
 */
export function buildKycProfilePayload(d: KycDraft): Record<string, string> {
  const payload: Record<string, string> = {};
  if (d.firstNameFa.trim()) payload.firstNameFa = d.firstNameFa.trim();
  if (d.lastNameFa.trim()) payload.lastNameFa = d.lastNameFa.trim();
  if (d.firstNameEn.trim()) payload.firstNameEn = d.firstNameEn.trim().toUpperCase();
  if (d.lastNameEn.trim()) payload.lastNameEn = d.lastNameEn.trim().toUpperCase();
  const nid = normalizeNationalId(d.nationalId);
  if (nid) payload.nationalId = nid;
  if (d.passportNo.trim()) payload.passportNo = d.passportNo.trim().toUpperCase();
  if (d.passportExpiry.trim()) payload.passportExpiry = d.passportExpiry.trim();
  if (payload.firstNameFa && payload.lastNameFa) payload.name = `${payload.firstNameFa} ${payload.lastNameFa}`;
  return payload;
}
