import crypto from 'crypto';
import { timingSafeEqualStrings } from '@/lib/security/timing-safe';

/**
 * Derives the HMAC signing secret for browser callback URLs.
 * Uses AUTH_SECRET / NEXTAUTH_SECRET / ECARDO_SECRET_KEY, falling back to a deterministic internal salt.
 */
function getCallbackSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ECARDO_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
      throw new Error(
        'SEC-008: AUTH_SECRET or ECARDO_SECRET_KEY must be configured in production for callback security'
      );
    }
    return 'firuzo_callback_authoritative_salt';
  }

  return secret;
}

/**
 * Cryptographically signs a wallet top-up callback URL.
 * Binds (userId, topupId, amount, currency) so the return callback cannot be forged or tampered.
 */
export function signTopUpCallback(
  userId: string,
  topupId: string,
  amount: string | number,
  currency: string
): string {
  const secret = getCallbackSecret();
  const normalizedAmount = typeof amount === 'number' ? amount.toString() : String(amount);
  const payload = `topup:${userId}:${topupId}:${normalizedAmount}:${currency.toUpperCase()}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Timing-safe verification of the wallet top-up callback signature.
 */
export function verifyTopUpCallback(
  sig: string,
  userId: string,
  topupId: string,
  amount: string | number,
  currency: string
): boolean {
  if (!sig || !userId || !topupId) return false;
  const expected = signTopUpCallback(userId, topupId, amount, currency);
  return timingSafeEqualStrings(sig, expected);
}
