import crypto from 'crypto';
import { timingSafeEqualStrings } from '@/lib/security/timing-safe';

/**
 * Derives the HMAC signing secret for browser callback URLs.
 * Uses AUTH_SECRET / NEXTAUTH_SECRET / ECARDO_SECRET_KEY, falling back to a deterministic internal salt.
 */
function getCallbackSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ECARDO_SECRET_KEY ||
    'firuzo_callback_authoritative_salt'
  );
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
