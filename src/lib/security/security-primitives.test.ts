import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  timingSafeEqualStrings,
  timingSafeEqualBuffers,
  verifyHmacSignature,
  verifyOtpCode,
} from './timing-safe';
import {
  acquireIdempotencyLock,
  completeIdempotency,
  failIdempotency,
  releaseIdempotencyLock,
  computePayloadFingerprint,
  resetIdempotencyStoreForTesting,
} from './idempotency';

describe('Security Primitives Suite (ASVS V5 Cryptography & V6 Financial/Idempotency)', () => {
  describe('Timing-Safe Comparison Primitives', () => {
    it('accurately verifies identical strings in constant time', () => {
      expect(timingSafeEqualStrings('super-secret-token-123', 'super-secret-token-123')).toBe(true);
      expect(timingSafeEqualStrings('', '')).toBe(true);
    });

    it('rejects strings of different lengths without throwing RangeError', () => {
      expect(timingSafeEqualStrings('short', 'much-longer-string')).toBe(false);
      expect(timingSafeEqualStrings('token1', 'token23')).toBe(false);
      expect(timingSafeEqualStrings('', 'non-empty')).toBe(false);
    });

    it('rejects strings of the same length with different characters', () => {
      expect(timingSafeEqualStrings('secret_1', 'secret_2')).toBe(false);
      expect(timingSafeEqualStrings('aaaa', 'aaab')).toBe(false);
    });

    it('handles buffer equality securely', () => {
      const buf1 = Buffer.from('binary-data-test-123');
      const buf2 = Buffer.from('binary-data-test-123');
      const buf3 = Buffer.from('binary-data-test-456');
      const bufShort = Buffer.from('bin');

      expect(timingSafeEqualBuffers(buf1, buf2)).toBe(true);
      expect(timingSafeEqualBuffers(buf1, buf3)).toBe(false);
      expect(timingSafeEqualBuffers(buf1, bufShort)).toBe(false);
    });

    it('validates HMAC-SHA256 signatures and detects tampering', () => {
      const secret = 'merchant-webhook-secret-9988';
      const payload = JSON.stringify({ transactionId: 'tx_100', amount: 5000000 });
      const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyHmacSignature(payload, validSig, secret)).toBe(true);
      // Tampered payload
      expect(verifyHmacSignature('{"transactionId":"tx_100","amount":999}', validSig, secret)).toBe(false);
      // Tampered signature
      expect(verifyHmacSignature(payload, validSig.slice(0, -2) + 'ff', secret)).toBe(false);
      // Wrong secret
      expect(verifyHmacSignature(payload, validSig, 'wrong-secret')).toBe(false);
    });

    it('verifies hashed OTP code securely', () => {
      const otp = '849201';
      const salt = 'customer_salt';
      const codeHash = crypto
        .createHash('sha256')
        .update(`${otp}:${salt}`)
        .digest('hex');

      expect(verifyOtpCode(otp, codeHash, salt)).toBe(true);
      expect(verifyOtpCode('111111', codeHash, salt)).toBe(false);
    });
  });

  describe('Idempotency Key Manager', () => {
    beforeEach(() => {
      resetIdempotencyStoreForTesting();
    });

    it('computes deterministic payload fingerprints regardless of key ordering', () => {
      const payloadA = { amount: 1000, currency: 'IRR', flightId: 'fl_01' };
      const payloadB = { flightId: 'fl_01', currency: 'IRR', amount: 1000 };

      expect(computePayloadFingerprint(payloadA)).toBe(computePayloadFingerprint(payloadB));
    });

    it('acquires lock on first request and blocks concurrent duplicates', () => {
      const key = 'req-id-uuid-1';
      const scope = 'user_99';
      const payload = { flightId: 'FL-101', seats: 2 };

      const res1 = acquireIdempotencyLock(key, scope, payload);
      expect(res1.acquired).toBe(true);

      // Concurrent second request before completion
      const res2 = acquireIdempotencyLock(key, scope, payload);
      expect(res2.acquired).toBe(false);
      if (!res2.acquired && res2.status === 'IN_PROGRESS') {
        expect(res2.retryAfterSeconds).toBeGreaterThan(0);
      } else {
        throw new Error('Expected IN_PROGRESS status');
      }
    });

    it('serves cached response on replayed request after completion', () => {
      const key = 'req-pay-88';
      const scope = 'user_99';
      const payload = { bookingId: 'BK-555' };

      const res1 = acquireIdempotencyLock(key, scope, payload);
      expect(res1.acquired).toBe(true);

      completeIdempotency(key, scope, 200, {
        status: 'PAID',
        receiptNumber: 'REC-99881',
      });

      const resReplay = acquireIdempotencyLock<{ status: string; receiptNumber: string }>(key, scope, payload);
      expect(resReplay.acquired).toBe(false);
      if (!resReplay.acquired && resReplay.status === 'COMPLETED') {
        expect(resReplay.cachedResponse.statusCode).toBe(200);
        expect(resReplay.cachedResponse.body.receiptNumber).toBe('REC-99881');
      } else {
        throw new Error('Expected COMPLETED status with cached response');
      }
    });

    it('detects and rejects payload tampering when reusing the same idempotency key', () => {
      const key = 'req-tx-11';
      const scope = 'user_12';
      const originalPayload = { amount: 100000 };
      const tamperedPayload = { amount: 9999999 };

      const res1 = acquireIdempotencyLock(key, scope, originalPayload);
      expect(res1.acquired).toBe(true);

      const resTampered = acquireIdempotencyLock(key, scope, tamperedPayload);
      expect(resTampered.acquired).toBe(false);
      if (!resTampered.acquired) {
        expect(resTampered.status).toBe('MISMATCH');
        expect(resTampered.error).toContain('different request payload');
      }
    });

    it('isolates keys across different user/tenant security scopes', () => {
      const key = 'shared-client-uuid-001';
      const payload = { test: true };

      const user1Res = acquireIdempotencyLock(key, 'tenant_A', payload);
      const user2Res = acquireIdempotencyLock(key, 'tenant_B', payload);

      // Both tenants should acquire the lock independently
      expect(user1Res.acquired).toBe(true);
      expect(user2Res.acquired).toBe(true);
    });

    it('handles failure and release lifecycle', () => {
      const key = 'transient-req-77';
      const scope = 'user_1';
      const payload = { step: 1 };

      acquireIdempotencyLock(key, scope, payload);
      failIdempotency(key, scope, 'Supplier API gateway timed out');

      const resFailed = acquireIdempotencyLock(key, scope, payload);
      expect(resFailed.acquired).toBe(false);
      if (!resFailed.acquired && resFailed.status === 'FAILED') {
        expect(resFailed.error).toContain('timed out');
      }

      // Releasing allows retry
      releaseIdempotencyLock(key, scope);
      const resRetried = acquireIdempotencyLock(key, scope, payload);
      expect(resRetried.acquired).toBe(true);
    });
  });
});
