interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const memoryStore = new Map<string, TokenBucket>();

/**
 * Token Bucket Rate Limiter with In-Memory / Distributed-Ready Architecture (Section 35)
 * Controls burst traffic and protects authentication, OTP, and webhook endpoints against abuse.
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
    const now = Date.now();
    const refillRatePerMs = maxTokens / (refillTimeSeconds * 1000);

    let bucket = memoryStore.get(key);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      memoryStore.set(key, bucket);
    } else {
      // Calculate token refill based on elapsed time
      const elapsedMs = now - bucket.lastRefill;
      const tokensToAdd = elapsedMs * refillRatePerMs;
      bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const remaining = Math.floor(bucket.tokens);
      const timeToFullMs = ((maxTokens - bucket.tokens) / refillRatePerMs);
      return {
        allowed: true,
        remaining,
        resetTimeMs: now + timeToFullMs,
      };
    }

    const timeUntilOneTokenMs = (1 - bucket.tokens) / refillRatePerMs;
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: now + timeUntilOneTokenMs,
    };
  }

  /**
   * Layered OTP flood protection (Section 35)
   * Max 3 requests per 10 minutes per phone/email identifier
   */
  static async checkOtpRateLimit(identifier: string, ip?: string): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Identifier rate limit: max 3 per 10 minutes
    const idCheck = await this.checkRateLimit(`otp:id:${identifier.toLowerCase()}`, 3, 600);
    if (!idCheck.allowed) {
      return {
        allowed: false,
        reason: 'Too many verification requests for this number/email. Please wait before retrying.',
      };
    }

    // 2. IP rate limit: max 10 requests per 5 minutes per IP
    if (ip) {
      const ipCheck = await this.checkRateLimit(`otp:ip:${ip}`, 10, 300);
      if (!ipCheck.allowed) {
        return {
          allowed: false,
          reason: 'Too many requests from this IP address. Please wait.',
        };
      }
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
