import { decryptSensitive } from './crypto-vault';
import { ERPPermission } from '@/domains/identity/permissions';
import { TenantAuthContext } from '@/domains/identity/permission-service';

export const PII_VIEW_PERMISSION: ERPPermission = 'traveler:pii:view';

/**
 * Checks whether the provided caller context or permission list contains the 'traveler:pii:view' permission.
 */
export function hasPiiViewPermission(
  ctxOrPermissions?: TenantAuthContext | ERPPermission[] | string[] | Set<string> | boolean | null
): boolean {
  if (ctxOrPermissions === true) return true;
  if (!ctxOrPermissions) return false;

  // TenantAuthContext object
  if (typeof ctxOrPermissions === 'object') {
    if ('isSuperAdmin' in ctxOrPermissions && ctxOrPermissions.isSuperAdmin) {
      return true;
    }
    if ('permissions' in ctxOrPermissions && ctxOrPermissions.permissions instanceof Set) {
      return ctxOrPermissions.permissions.has(PII_VIEW_PERMISSION);
    }
    if (Array.isArray(ctxOrPermissions)) {
      return ctxOrPermissions.includes(PII_VIEW_PERMISSION);
    }
    if (ctxOrPermissions instanceof Set) {
      return ctxOrPermissions.has(PII_VIEW_PERMISSION);
    }
  }

  return false;
}

/**
 * Masks passport numbers. If unmask allowed, returns plain string.
 * Example: "A12345678" -> "A12****78"
 */
export function maskPassportNumber(
  passportNo: string | null | undefined,
  allowUnmask: boolean = false
): string {
  if (!passportNo) return '';
  const plain = decryptSensitive(passportNo).trim();
  if (allowUnmask) return plain;
  if (plain.length <= 4) return '****';
  const prefix = plain.slice(0, 3);
  const suffix = plain.slice(-2);
  return `${prefix}****${suffix}`;
}

/**
 * Masks national IDs. If unmask allowed, returns plain string.
 * Example: "0012345678" -> "001****678"
 */
export function maskNationalId(
  nationalId: string | null | undefined,
  allowUnmask: boolean = false
): string {
  if (!nationalId) return '';
  const plain = decryptSensitive(nationalId).trim();
  if (allowUnmask) return plain;
  if (plain.length <= 4) return '****';
  const prefix = plain.slice(0, 3);
  const suffix = plain.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Masks credit / debit card numbers.
 * Example: "4111222233334444" -> "****-****-****-4444"
 */
export function maskCardNumber(
  cardNumber: string | null | undefined,
  allowUnmask: boolean = false
): string {
  if (!cardNumber) return '';
  const plain = decryptSensitive(cardNumber).replace(/[\s-]/g, '');
  if (allowUnmask) return plain;
  if (plain.length <= 4) return '****';
  const suffix = plain.slice(-4);
  return `****-****-****-${suffix}`;
}

/**
 * Masks telephone numbers.
 * Example: "+989123456789" -> "+9891****6789"
 */
export function maskPhone(
  phone: string | null | undefined,
  allowUnmask: boolean = false
): string {
  if (!phone) return '';
  const plain = phone.trim();
  if (allowUnmask) return plain;
  if (plain.length <= 6) return '****';
  const prefix = plain.slice(0, 5);
  const suffix = plain.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Masks email addresses.
 * Example: "traveler@example.com" -> "t***r@example.com"
 */
export function maskEmail(
  email: string | null | undefined,
  allowUnmask: boolean = false
): string {
  if (!email) return '';
  const plain = email.trim();
  if (allowUnmask) return plain;
  const atIndex = plain.indexOf('@');
  if (atIndex <= 1) return '***' + plain.slice(atIndex);
  const name = plain.slice(0, atIndex);
  const domain = plain.slice(atIndex);
  if (name.length <= 2) {
    return `${name[0]}***${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}${domain}`;
}

/**
 * Applies PII masking to a traveler document entity.
 */
export function maskTravelDocumentEntity<T extends { type?: string; documentNumber?: string }>(
  doc: T,
  allowUnmask: boolean = false
): T {
  if (!doc.documentNumber) return doc;
  const isPassport = doc.type === 'PASSPORT';
  const maskedNumber = isPassport
    ? maskPassportNumber(doc.documentNumber, allowUnmask)
    : maskNationalId(doc.documentNumber, allowUnmask);

  return {
    ...doc,
    documentNumber: maskedNumber,
  };
}

/**
 * Applies PII masking across customer / traveler profile records unless `traveler:pii:view` is held.
 */
export function maskTravelerData<T extends Record<string, unknown>>(
  data: T,
  ctxOrPermissions?: TenantAuthContext | ERPPermission[] | string[] | Set<string> | boolean | null
): T {
  const allowed = hasPiiViewPermission(ctxOrPermissions);
  if (allowed) return data;

  const clone: Record<string, unknown> = { ...data };

  if (typeof clone.nationalId === 'string' && clone.nationalId) {
    clone.nationalId = maskNationalId(clone.nationalId, false);
  }
  if (typeof clone.passportNo === 'string' && clone.passportNo) {
    clone.passportNo = maskPassportNumber(clone.passportNo, false);
  }
  if (typeof clone.cardNumber === 'string' && clone.cardNumber) {
    clone.cardNumber = maskCardNumber(clone.cardNumber, false);
  }
  if (typeof clone.phone === 'string' && clone.phone) {
    clone.phone = maskPhone(clone.phone, false);
  }
  if (typeof clone.email === 'string' && clone.email) {
    clone.email = maskEmail(clone.email, false);
  }

  // Handle nested documents array
  if (Array.isArray(clone.documents)) {
    clone.documents = clone.documents.map((d: { type?: string; documentNumber?: string }) =>
      maskTravelDocumentEntity(d, false)
    );
  }

  // Handle travelerProfiles array
  if (Array.isArray(clone.travelerProfiles)) {
    clone.travelerProfiles = clone.travelerProfiles.map((tp: Record<string, unknown>) =>
      maskTravelerData(tp, false)
    );
  }

  return clone as unknown as T;
}
