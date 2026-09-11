import crypto from 'crypto';

/**
 * Timing-Safe Comparison Primitives (OWASP ASVS V5.2.2 / CWE-208)
 *
 * Prevents side-channel timing attacks on cryptographic signatures, tokens,
 * OTP codes, and API secrets by executing comparisons in constant time.
 */

/**
 * Compares two buffers in constant time.
 * If buffers have unequal lengths, returns false without leaking timing info.
 */
export function timingSafeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }

  // Hash both buffers with SHA-256 to ensure identical fixed 32-byte length
  // and prevent length leak / RangeError in crypto.timingSafeEqual
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();

  const hashesMatch = crypto.timingSafeEqual(hashA, hashB);
  return hashesMatch && a.length === b.length;
}

/**
 * Compares two UTF-8 strings in constant time.
 * Secure against length-probing timing attacks by hashing both strings first.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();

  const hashesMatch = crypto.timingSafeEqual(hashA, hashB);
  return hashesMatch && a.length === b.length;
}

/**
 * Verifies an HMAC signature against payload data in constant time.
 *
 * @param payload The raw string or buffer that was signed
 * @param receivedSignature The signature received in webhook headers (hex or base64)
 * @param secret The shared secret key
 * @param algorithm Hash algorithm (default: 'sha256')
 * @param encoding Digest encoding (default: 'hex')
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  receivedSignature: string,
  secret: string,
  algorithm: string = 'sha256',
  encoding: crypto.BinaryToTextEncoding = 'hex'
): boolean {
  if (!payload || !receivedSignature || !secret) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest(encoding);

    return timingSafeEqualStrings(computedSignature, receivedSignature.trim());
  } catch {
    return false;
  }
}

/**
 * Verifies a user-supplied OTP code against a stored SHA-256 hash in constant time.
 */
export function verifyOtpCode(
  providedCode: string,
  storedCodeHash: string,
  salt: string = ''
): boolean {
  if (!providedCode || !storedCodeHash) {
    return false;
  }

  const computedHash = crypto
    .createHash('sha256')
    .update(`${providedCode.trim()}:${salt}`)
    .digest('hex');

  return timingSafeEqualStrings(computedHash, storedCodeHash.trim());
}
