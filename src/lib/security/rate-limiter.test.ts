import { describe, it, expect } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('Token Bucket Rate Limiter Suite (Section 35)', () => {
  it('allows requests within capacity and blocks bursts exceeding max tokens', async () => {
    const key = `test_limit_${Date.now()}`;
    const maxTokens = 3;
    const windowSeconds = 60;

    // First 3 requests must be allowed
    const r1 = await RateLimiter.checkRateLimit(key, maxTokens, windowSeconds);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await RateLimiter.checkRateLimit(key, maxTokens, windowSeconds);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await RateLimiter.checkRateLimit(key, maxTokens, windowSeconds);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request must be rejected (burst capacity exhausted)
    const r4 = await RateLimiter.checkRateLimit(key, maxTokens, windowSeconds);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetTimeMs).toBeGreaterThan(Date.now());
  });

  it('enforces OTP layered flood control per identifier and per IP', async () => {
    const phone = `+98912999${Date.now().toString().slice(-4)}`;

    // 3 OTP requests allowed
    const o1 = await RateLimiter.checkOtpRateLimit(phone);
    expect(o1.allowed).toBe(true);

    const o2 = await RateLimiter.checkOtpRateLimit(phone);
    expect(o2.allowed).toBe(true);

    const o3 = await RateLimiter.checkOtpRateLimit(phone);
    expect(o3.allowed).toBe(true);

    // 4th OTP request blocked
    const o4 = await RateLimiter.checkOtpRateLimit(phone);
    expect(o4.allowed).toBe(false);
    expect(o4.reason).toMatch(/too many verification requests/i);
  });
});
