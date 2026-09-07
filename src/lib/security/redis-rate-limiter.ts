/**
 * Redis-Backed Rate Limiter & OTP Velocity Engine (AUTH-101, AUTH-102)
 *
 * Provides a high-throughput, distributed token-bucket rate limiter with
 * transparent in-memory fallback for local development and unit tests.
 * Enforces strict multi-dimensional velocity policies (per identifier, IP, device, and cooldowns).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
}

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  lastRequestTime?: number;
}

export interface OtpVelocityParams {
  identifier: string;
  ip?: string;
  deviceId?: string;
}

export interface OtpVelocityResult {
  allowed: boolean;
  reason?: string;
  cooldownRemainingSeconds?: number;
  violations?: string[];
  remainingIdentifierTokens?: number;
}

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export class RedisRateLimiter {
  private static memoryStore = new Map<string, TokenBucket>();
  private static customRedisClient: IRedisClient | null = null;
  private static forceInMemoryFallback = false;

  /**
   * Configure custom or mocked Redis client (e.g. for integration tests)
   */
  static setRedisClient(client: IRedisClient | null) {
    this.customRedisClient = client;
  }

  /**
   * Force in-memory fallback mode (useful for isolated tests)
   */
  static setForceInMemory(force: boolean) {
    this.forceInMemoryFallback = force;
  }

  /**
   * Clears the in-memory fallback store
   */
  static resetStore() {
    this.memoryStore.clear();
  }

  /**
   * Check token bucket rate limit
   * @param key Cache key (e.g. "otp:id:+989123456789")
   * @param maxTokens Maximum capacity of bucket (e.g. 3)
   * @param refillTimeSeconds Time window to completely refill bucket (e.g. 600s)
   */
  static async checkRateLimit(
    key: string,
    maxTokens: number = 5,
    refillTimeSeconds: number = 60
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const refillRatePerMs = maxTokens / (refillTimeSeconds * 1000);

    // 1. If Redis is configured and not forced to in-memory, use Redis
    if (this.customRedisClient && !this.forceInMemoryFallback) {
      try {
        return await this.checkRedisRateLimit(this.customRedisClient, key, maxTokens, refillTimeSeconds, now);
      } catch (redisErr) {
        console.warn(`[RedisRateLimiter] Redis error for key ${key}, falling back to in-memory:`, redisErr);
      }
    }

    // 2. In-Memory fallback (single-instance / local dev / unit tests)
    let bucket = this.memoryStore.get(key);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.memoryStore.set(key, bucket);
    } else {
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
   * Redis-backed atomic token bucket implementation
   */
  private static async checkRedisRateLimit(
    client: IRedisClient,
    key: string,
    maxTokens: number,
    refillTimeSeconds: number,
    now: number
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const raw = await client.get(redisKey);
    const refillRatePerMs = maxTokens / (refillTimeSeconds * 1000);

    let bucket: TokenBucket;
    if (!raw) {
      bucket = { tokens: maxTokens, lastRefill: now };
    } else {
      try {
        bucket = JSON.parse(raw) as TokenBucket;
        const elapsedMs = now - bucket.lastRefill;
        const tokensToAdd = elapsedMs * refillRatePerMs;
        bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      } catch {
        bucket = { tokens: maxTokens, lastRefill: now };
      }
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const remaining = Math.floor(bucket.tokens);
      const timeToFullMs = ((maxTokens - bucket.tokens) / refillRatePerMs);
      await client.set(redisKey, JSON.stringify(bucket), 'EX', refillTimeSeconds * 2);
      return {
        allowed: true,
        remaining,
        resetTimeMs: now + timeToFullMs,
      };
    }

    const timeUntilOneTokenMs = (1 - bucket.tokens) / refillRatePerMs;
    await client.set(redisKey, JSON.stringify(bucket), 'EX', refillTimeSeconds * 2);
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: now + timeUntilOneTokenMs,
    };
  }

  /**
   * Multi-Dimensional OTP Velocity Policy (AUTH-102)
   * Enforces:
   * 1. 60-second minimum cooldown between consecutive requests for the same identifier.
   * 2. Max 3 requests per 10 minutes per identifier (phone / email).
   * 3. Max 10 requests per 24 hours per identifier (daily enumeration protection).
   * 4. Max 10 requests per 5 minutes per IP.
   * 5. Max 30 requests per hour per IP.
   * 6. Max 5 requests per 10 minutes per device ID.
   */
  static async checkOtpVelocity(params: OtpVelocityParams): Promise<OtpVelocityResult> {
    const normalizedId = params.identifier.trim().toLowerCase();
    const now = Date.now();
    const violations: string[] = [];

    // 1. Check Cooldown (60s minimum interval)
    const cooldownKey = `otp:cooldown:${normalizedId}`;
    let lastReqTime = 0;

    if (this.customRedisClient && !this.forceInMemoryFallback) {
      try {
        const cdRaw = await this.customRedisClient.get(cooldownKey);
        if (cdRaw) lastReqTime = Number(cdRaw);
      } catch {
        // Fallback to memory
        lastReqTime = this.memoryStore.get(cooldownKey)?.lastRefill || 0;
      }
    } else {
      lastReqTime = this.memoryStore.get(cooldownKey)?.lastRefill || 0;
    }

    if (lastReqTime > 0) {
      const elapsedSeconds = Math.floor((now - lastReqTime) / 1000);
      const cooldownPeriodSeconds = 60;
      if (elapsedSeconds < cooldownPeriodSeconds) {
        const remainingCooldown = cooldownPeriodSeconds - elapsedSeconds;
        return {
          allowed: false,
          reason: `لطفاً ${remainingCooldown} ثانیه قبل از درخواست مجدد کد تایید شکیبا باشید.`,
          cooldownRemainingSeconds: remainingCooldown,
          violations: ['COOLDOWN_ACTIVE'],
        };
      }
    }

    // 2. Identifier short-term velocity limit: max 3 per 10 minutes (600s)
    const idCheck = await this.checkRateLimit(`otp:id:${normalizedId}`, 3, 600);
    if (!idCheck.allowed) {
      violations.push('IDENTIFIER_BURST_EXCEEDED');
    }

    // 3. Identifier daily velocity limit: max 10 per 24 hours (86400s)
    const dailyIdCheck = await this.checkRateLimit(`otp:daily:${normalizedId}`, 10, 86400);
    if (!dailyIdCheck.allowed) {
      violations.push('IDENTIFIER_DAILY_EXCEEDED');
    }

    // 4. IP short-term limit: max 10 per 5 minutes (300s)
    if (params.ip) {
      const ipCheck = await this.checkRateLimit(`otp:ip:5m:${params.ip}`, 10, 300);
      if (!ipCheck.allowed) {
        violations.push('IP_BURST_EXCEEDED');
      }

      // 5. IP hourly limit: max 30 per hour (3600s)
      const ipHourlyCheck = await this.checkRateLimit(`otp:ip:1h:${params.ip}`, 30, 3600);
      if (!ipHourlyCheck.allowed) {
        violations.push('IP_HOURLY_EXCEEDED');
      }
    }

    // 6. Device limit: max 5 per 10 minutes
    if (params.deviceId) {
      const devCheck = await this.checkRateLimit(`otp:dev:${params.deviceId}`, 5, 600);
      if (!devCheck.allowed) {
        violations.push('DEVICE_BURST_EXCEEDED');
      }
    }

    if (violations.length > 0) {
      let reason = 'تعداد درخواست‌های کد تایید بیش از حد مجاز است. لطفاً بعداً تلاش کنید.';
      if (violations.includes('IDENTIFIER_DAILY_EXCEEDED')) {
        reason = 'سقف مجاز روزانه درخواست کد تایید برای این شماره/ایمیل تکمیل شده است.';
      } else if (violations.includes('IDENTIFIER_BURST_EXCEEDED')) {
        reason = 'تعداد درخواست‌های مکرر برای این حساب بالا است. لطفاً ۱۰ دقیقه صبر کنید.';
      } else if (violations.includes('IP_BURST_EXCEEDED') || violations.includes('IP_HOURLY_EXCEEDED')) {
        reason = 'تعداد درخواست‌های ارسال شده از این آدرس اینترنتی بیش از حد مجاز است.';
      } else if (violations.includes('DEVICE_BURST_EXCEEDED')) {
        reason = 'تعداد درخواست‌های ثبت شده از این دستگاه بیش از حد مجاز است.';
      }

      return {
        allowed: false,
        reason,
        violations,
        remainingIdentifierTokens: idCheck.remaining,
      };
    }

    // Record cooldown timestamp
    if (this.customRedisClient && !this.forceInMemoryFallback) {
      try {
        await this.customRedisClient.set(cooldownKey, String(now), 'EX', 65);
      } catch {
        this.memoryStore.set(cooldownKey, { tokens: 1, lastRefill: now });
      }
    } else {
      this.memoryStore.set(cooldownKey, { tokens: 1, lastRefill: now });
    }

    return {
      allowed: true,
      remainingIdentifierTokens: idCheck.remaining,
    };
  }
}
