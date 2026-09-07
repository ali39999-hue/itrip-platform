/**
 * SEC-105: Canonical File Upload Security Validator
 *
 * Enforces strict MIME validation, file magic byte signature inspection,
 * max file size ceiling (<= 5MB), path traversal elimination, and filename sanitization.
 */

import crypto from 'node:crypto';

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB strictly enforced

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.php3', '.php4', '.php5',
  '.phtml', '.js', '.mjs', '.cjs', '.ts', '.vbs', '.py', '.rb', '.ps1',
  '.cgi', '.pl', '.jsp', '.asp', '.aspx', '.shtml', '.html', '.htm',
  '.svg', '.xml', '.jar', '.dll', '.so', '.dylib', '.com', '.scr', '.msi',
]);

/**
 * Inspects file buffer header bytes to accurately identify the real MIME type.
 */
export function detectMagicMime(buffer: Uint8Array | Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 12) {
    const ftyp = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
    if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis')) {
      return 'image/avif';
    }
  }

  return null;
}

/**
 * Sanitizes an upload filename: strips path traversal, illegal chars, and dangerous extensions.
 */
export function sanitizeUploadFilename(rawFilename: string): string {
  if (!rawFilename) {
    return `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.bin`;
  }

  // Strip null bytes and control chars
  let cleaned = rawFilename.replace(/\0/g, '').replace(/[\x00-\x1f\x7f]/g, '');

  // Extract base filename (strip all directory traversal)
  cleaned = cleaned.replace(/.*[/\\]/, '');

  // Split into base name and extension
  const lastDot = cleaned.lastIndexOf('.');
  let ext = '';
  let base = cleaned;

  if (lastDot > 0) {
    base = cleaned.substring(0, lastDot);
    ext = cleaned.substring(lastDot).toLowerCase();
  }

  // Check dangerous extension
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    ext = '.bin';
  }

  // Sanitize base: allow alphanumeric, dash, underscore
  base = base.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
  if (!base) {
    base = `file_${crypto.randomBytes(4).toString('hex')}`;
  }

  return `${base}${ext}`;
}

export interface FileValidationInput {
  buffer: Uint8Array | Buffer;
  originalFilename: string;
  mimeType: string;
  size?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  sanitizedFilename?: string;
}

/**
 * Validates an uploaded file payload against SEC-105 policies.
 */
export function validateUploadedFile(
  file: FileValidationInput,
  options: {
    maxSizeBytes?: number;
    allowedMimeTypes?: Set<string>;
  } = {}
): FileValidationResult {
  const maxBytes = options.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES;
  const allowedMimes = options.allowedMimeTypes ?? ALLOWED_UPLOAD_MIME_TYPES;

  // 1. File size check
  const actualSize = file.size ?? file.buffer.length;
  if (actualSize <= 0) {
    return { valid: false, error: 'File is empty (0 bytes)' };
  }
  if (actualSize > maxBytes) {
    return {
      valid: false,
      error: `File size ${actualSize} exceeds maximum allowed limit of ${maxBytes} bytes (5MB)`,
    };
  }

  // 2. MIME claim check
  const claimedMime = file.mimeType.toLowerCase().trim();
  if (!allowedMimes.has(claimedMime)) {
    return {
      valid: false,
      error: `Claimed MIME type '${claimedMime}' is not permitted`,
    };
  }

  // 3. Magic bytes verification (deep content inspection)
  const detectedMime = detectMagicMime(file.buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'File signature (magic bytes) does not match any recognized secure format',
    };
  }

  if (detectedMime !== claimedMime) {
    return {
      valid: false,
      error: `MIME type mismatch: claimed '${claimedMime}' but file content signature indicates '${detectedMime}'`,
      detectedMime,
    };
  }

  // 4. Filename sanitization
  const sanitizedFilename = sanitizeUploadFilename(file.originalFilename);

  return {
    valid: true,
    detectedMime,
    sanitizedFilename,
  };
}
