import { RedisRateLimiter, type OtpVelocityResult } from './redis-rate-limiter';

/**
 * Token Bucket Rate Limiter with In-Memory / Distributed-Ready Architecture (Section 35)
 * Controls burst traffic and protects authentication, OTP, and webhook endpoints against abuse.
 * Delegates to RedisRateLimiter for unified distributed policy enforcement (AUTH-101, AUTH-102).
 */
export class RateLimiter {
  /**
   * Check if request is allowed under rate limits
   * @param key Unique key (e.g. "otp:+989123456789" or "ip:192.168.1.1")
   * @param maxTokens Maximum capacity of bucket (e.g. 5 requests)
   * @param refillTimeSeconds Time window to completely refill bucket (e.g. 60 seconds)
   */
  static async checkRateLimit(
    key: string,
    maxTokens: number = 5,
    refillTimeSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetTimeMs: number }> {
    return RedisRateLimiter.checkRateLimit(key, maxTokens, refillTimeSeconds);
  }

  /**
   * Layered OTP flood and velocity protection (AUTH-101, AUTH-102)
   * Enforces identifier velocity, IP velocity, device limits, and 60-second cooldowns.
   */
  static async checkOtpRateLimit(
    identifier: string,
    ip?: string,
    deviceId?: string
  ): Promise<{ allowed: boolean; reason?: string; cooldownRemainingSeconds?: number; violations?: string[] }> {
    if (ip || deviceId) {
      const res: OtpVelocityResult = await RedisRateLimiter.checkOtpVelocity({
        identifier,
        ip,
        deviceId,
      });
      return {
        allowed: res.allowed,
        reason: res.reason,
        cooldownRemainingSeconds: res.cooldownRemainingSeconds,
        violations: res.violations,
      };
    }

    // Token-bucket fallback when no IP/device context is supplied (e.g. basic unit tests)
    const idCheck = await this.checkRateLimit(`otp:id:${identifier.toLowerCase()}`, 3, 600);
    if (!idCheck.allowed) {
      return {
        allowed: false,
        reason: 'Too many verification requests for this number/email. Please wait before retrying.',
      };
    }

    return { allowed: true };
  }

  /**
   * Webhook burst rate limit
   * Max 30 requests per minute per gateway/IP
   */
  static async checkWebhookRateLimit(gatewayOrIp: string): Promise<boolean> {
    const res = await this.checkRateLimit(`webhook:${gatewayOrIp}`, 30, 60);
    return res.allowed;
  }
}
