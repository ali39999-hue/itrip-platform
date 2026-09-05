import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Master encryption key derived from AUTH_SECRET or dedicated ENCRYPTION_KEY
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || 'dev-insecure-master-key-32-chars-ok';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive personal data (e.g. passport number, national ID) using AES-256-GCM (Section 34)
 * Output format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptSensitive(plaintext: string): string {
  if (!plaintext || plaintext.startsWith('enc:v1:')) {
    return plaintext; // Already encrypted or empty
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts AES-256-GCM encrypted sensitive fields
 */
export function decryptSensitive(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:v1:')) {
    return encryptedPayload; // Not encrypted, return plain
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 5) {
    throw new Error('SECURITY_ERROR: Malformed encrypted sensitive data payload');
  }

  const iv = Buffer.from(parts[2], 'hex');
  const authTag = Buffer.from(parts[3], 'hex');
  const ciphertext = parts[4];

  const key = getMasterKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks passport and travel document numbers for UI rendering (Section 34)
 * Example: "A12345678" -> "A12****78"
 */
export function maskDocumentNumber(docNo: string | null | undefined): string {
  if (!docNo) return '';
  const plain = decryptSensitive(docNo);
  if (plain.length <= 4) return '****';
  const prefix = plain.slice(0, 3);
  const suffix = plain.slice(-2);
  return `${prefix}****${suffix}`;
}

/**
 * Masks national IDs
 * Example: "0012345678" -> "001****678"
 */
export function maskNationalId(nationalId: string | null | undefined): string {
  if (!nationalId) return '';
  const plain = decryptSensitive(nationalId);
  if (plain.length <= 4) return '****';
  const prefix = plain.slice(0, 3);
  const suffix = plain.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Access audit logger for sensitive identity documents (Section 34)
 */
export async function auditDocumentAccess(params: {
  userId: string;
  documentId: string;
  documentType: string;
  action: 'READ' | 'WRITE' | 'DECRYPT';
  reason?: string;
  ipAddress?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: `PII_ACCESS_${params.action}`,
      resource: `TravelDocument:${params.documentType}`,
      resourceId: params.documentId,
      reason: params.reason || 'Authorized identity verification',
      ipAddress: params.ipAddress,
    },
  });
}
