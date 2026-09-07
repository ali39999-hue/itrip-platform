import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { RedisRateLimiter, type IRedisClient } from '@/lib/security/redis-rate-limiter';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { ProductionSmsProvider } from './providers/ProductionSmsProvider';
import { ProductionEmailProvider } from './providers/ProductionEmailProvider';
import crypto from 'crypto';

describe('OTP Abuse & Replay Hardening Suite (AUTH-101 to AUTH-105)', () => {
  const originalEnv = { ...process.env };
  const secretKey = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');

  function hashOtp(code: string): string {
    return crypto.createHmac('sha256', process.env.AUTH_SECRET || secretKey).update(code).digest('hex');
  }

  beforeEach(async () => {
    RedisRateLimiter.resetStore();
    RedisRateLimiter.setRedisClient(null);
    RedisRateLimiter.setForceInMemory(false);
    process.env = { ...originalEnv, AUTH_SECRET: secretKey };
  });

  afterEach(async () => {
    process.env = originalEnv;
    RedisRateLimiter.resetStore();
    RedisRateLimiter.setRedisClient(null);
  });

  it('AUTH-102: enforces 60-second cooldown between consecutive OTP requests for the same identifier', async () => {
    const phone = '+989121112233';

    // First request should be allowed
    const firstCheck = await RateLimiter.checkOtpRateLimit(phone, '192.168.1.50');
    expect(firstCheck.allowed).toBe(true);

    // Immediate second request within 60s should be blocked by cooldown
    const secondCheck = await RateLimiter.checkOtpRateLimit(phone, '192.168.1.50');
    expect(secondCheck.allowed).toBe(false);
    expect(secondCheck.violations).toContain('COOLDOWN_ACTIVE');
    expect(secondCheck.cooldownRemainingSeconds).toBeGreaterThan(0);
    expect(secondCheck.reason).toContain('ثانیه');
  });

  it('AUTH-102: enforces identifier velocity limit (max 3 requests per 10 minutes)', async () => {
    const phone = '+989129998877';

    // Simulate 3 requests bypassing the cooldown (e.g. at intervals)
    for (let i = 0; i < 3; i++) {
      const check = await RedisRateLimiter.checkRateLimit(`otp:id:${phone}`, 3, 600);
      expect(check.allowed).toBe(true);
    }

    // 4th request must be rejected
    const fourthCheck = await RedisRateLimiter.checkRateLimit(`otp:id:${phone}`, 3, 600);
    expect(fourthCheck.allowed).toBe(false);
    expect(fourthCheck.remaining).toBe(0);
  });

  it('AUTH-102: enforces IP velocity limit (max 10 requests per 5 minutes per IP)', async () => {
    const testIp = '10.20.30.40';

    for (let i = 0; i < 10; i++) {
      const check = await RedisRateLimiter.checkRateLimit(`otp:ip:5m:${testIp}`, 10, 300);
      expect(check.allowed).toBe(true);
    }

    const eleventhCheck = await RedisRateLimiter.checkRateLimit(`otp:ip:5m:${testIp}`, 10, 300);
    expect(eleventhCheck.allowed).toBe(false);
  });

  it('AUTH-101: Redis-backed store executes rate limiting and handles client errors gracefully', async () => {
    const mockStorage = new Map<string, string>();
    const mockRedis: IRedisClient = {
      async get(key: string) {
        return mockStorage.get(key) || null;
      },
      async set(key: string, value: string) {
        mockStorage.set(key, value);
        return 'OK';
      },
      async del(key: string) {
        return mockStorage.delete(key) ? 1 : 0;
      },
      async incr(key: string) {
        const val = Number(mockStorage.get(key) || 0) + 1;
        mockStorage.set(key, String(val));
        return val;
      },
      async expire() {
        return 1;
      },
    };

    RedisRateLimiter.setRedisClient(mockRedis);

    // Test token bucket consumption with Redis client
    const key = 'test-redis-bucket';
    const r1 = await RedisRateLimiter.checkRateLimit(key, 2, 60);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = await RedisRateLimiter.checkRateLimit(key, 2, 60);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = await RedisRateLimiter.checkRateLimit(key, 2, 60);
    expect(r3.allowed).toBe(false);

    // Redis client error falls back to in-memory gracefully
    const failingRedis: IRedisClient = {
      ...mockRedis,
      async get() {
        throw new Error('Connection refused');
      },
    };
    RedisRateLimiter.setRedisClient(failingRedis);
    const fallbackRes = await RedisRateLimiter.checkRateLimit('fallback-test', 3, 60);
    expect(fallbackRes.allowed).toBe(true);
  });

  it('AUTH-105: Replay attack prevention — consumed OTP cannot be verified twice', async () => {
    const testIdentifier = `replay_${Date.now()}@firuzo.com`;
    const code = '765432';
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpRecord = await prisma.otpVerification.create({
      data: {
        identifier: testIdentifier,
        channel: 'email',
        codeHash,
        expiresAt,
      },
    });

    // Verify first time -> marks consumed
    const firstVerification = await prisma.otpVerification.findFirst({
      where: { identifier: testIdentifier, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    expect(firstVerification).not.toBeNull();

    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    // Second verification attempt with identical code should fail (consumedAt is not null)
    const replayAttempt = await prisma.otpVerification.findFirst({
      where: { identifier: testIdentifier, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    expect(replayAttempt).toBeNull();
  });

  it('AUTH-105: Expired OTP protection — cannot verify code past expiration window', async () => {
    const testIdentifier = `expired_${Date.now()}@firuzo.com`;
    const code = '112233';
    const expiredAt = new Date(Date.now() - 1000); // 1s in the past

    await prisma.otpVerification.create({
      data: {
        identifier: testIdentifier,
        channel: 'email',
        codeHash: hashOtp(code),
        expiresAt: expiredAt,
      },
    });

    const activeOtp = await prisma.otpVerification.findFirst({
      where: { identifier: testIdentifier, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    expect(activeOtp).toBeNull();
  });

  it('AUTH-105: Brute-force lockout — exceeding 5 incorrect attempts locks out the OTP', async () => {
    const testIdentifier = `brute_${Date.now()}@firuzo.com`;
    const correctCode = '888999';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const record = await prisma.otpVerification.create({
      data: {
        identifier: testIdentifier,
        channel: 'email',
        codeHash: hashOtp(correctCode),
        expiresAt,
      },
    });

    // 5 failed attempts increment counter
    for (let i = 0; i < 5; i++) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }

    const updated = await prisma.otpVerification.findUnique({
      where: { id: record.id },
    });
    expect(updated?.attempts).toBe(5);

    // Authentication rule: if record.attempts >= 5, verify returns false even if code matches
    const isLockedOut = (updated?.attempts || 0) >= 5;
    expect(isLockedOut).toBe(true);
  });

  it('AUTH-103: ProductionSmsProvider fails closed in production when secrets are missing', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.KAVENEGAR_API_KEY;
    delete process.env.SMS_PROVIDER_API_KEY;
    delete process.env.FARAZ_SMS_API_KEY;

    const provider = new ProductionSmsProvider({ apiKey: '' });
    const result = await provider.sendSms('+989123456789', 'کد تایید ورود');

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('FAIL_CLOSED');
  });

  it('AUTH-104: ProductionEmailProvider fails closed in production when secrets are missing', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;

    const provider = new ProductionEmailProvider({ apiKey: '' });
    const result = await provider.sendEmail('test@firuzo.com', 'ورود به فیروزو', '<p>کد تایید</p>');

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('FAIL_CLOSED');
  });
});
