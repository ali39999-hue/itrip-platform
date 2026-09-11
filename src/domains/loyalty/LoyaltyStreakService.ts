/**
 * Server-Authoritative 7-Day Loyalty Daily Streak Service for Firuzo Platform.
 * Hardened per Production Guidelines Section 26 & 27 (ANTI-ABUSE, SERVER AUTHORITY).
 *
 * Enforces:
 * 1. Server-authoritative state (no client-side useState authority).
 * 2. Strict Asia/Tehran timezone calendar anchoring.
 * 3. Race condition prevention (atomic in-flight mutex per userId).
 * 4. Idempotency against double-clicks, tab refreshes, parallel device requests.
 * 5. Deterministic day-break rules: missing a day resets streak to Day 1.
 * 6. Zero-sum coin rewards ledger with transaction tracking.
 */

import crypto from "crypto";

export interface StreakDayReward {
  day: number;
  coins: number;
  labelFa: string;
  labelEn: string;
  isSpecial?: boolean;
}

export const STREAK_REWARDS: readonly StreakDayReward[] = [
  { day: 1, coins: 10, labelFa: "روز ۱", labelEn: "Day 1" },
  { day: 2, coins: 15, labelFa: "روز ۲", labelEn: "Day 2" },
  { day: 3, coins: 20, labelFa: "روز ۳", labelEn: "Day 3" },
  { day: 4, coins: 25, labelFa: "روز ۴", labelEn: "Day 4" },
  { day: 5, coins: 30, labelFa: "روز ۵", labelEn: "Day 5" },
  { day: 6, coins: 40, labelFa: "روز ۶", labelEn: "Day 6" },
  { day: 7, coins: 70, labelFa: "روز ۷", labelEn: "Day 7", isSpecial: true },
] as const;

export interface UserStreakState {
  userId: string;
  currentStreak: number; // 0 to 7
  longestStreak: number;
  lastClaimDate: string | null; // YYYY-MM-DD in Asia/Tehran
  totalCoins: number;
  updatedAt: string;
}

export interface ClaimResult {
  success: boolean;
  message: string;
  streak: number;
  coinsAwarded: number;
  totalCoins: number;
  claimedToday: boolean;
  transactionId?: string;
  errorCode?: "ALREADY_CLAIMED_TODAY" | "USER_REQUIRED" | "CONCURRENT_CLAIM" | "INVALID_USER";
}

export interface StreakStatusView {
  userId: string;
  currentStreak: number; // consecutive active days (1..7)
  claimedToday: boolean;
  nextReward: StreakDayReward;
  todayDateTehran: string;
  totalCoins: number;
  rewardsLadder: readonly StreakDayReward[];
}

export class LoyaltyStreakService {
  private static userStates = new Map<string, UserStreakState>();
  private static userLocks = new Map<string, Promise<unknown>>();
  private static claimLedger = new Map<string, {
    claimId: string;
    userId: string;
    date: string;
    dayNumber: number;
    coins: number;
    createdAt: string;
  }>();

  /**
   * Returns current calendar date in Asia/Tehran timezone as YYYY-MM-DD.
   * Can be overridden for deterministic unit testing.
   */
  static getTehranDate(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  }

  /**
   * Computes the difference in calendar days between two YYYY-MM-DD date strings.
   */
  static getCalendarDayDiff(fromDateStr: string, toDateStr: string): number {
    const from = new Date(`${fromDateStr}T12:00:00Z`);
    const to = new Date(`${toDateStr}T12:00:00Z`);
    const diffMs = to.getTime() - from.getTime();
    return Math.round(diffMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Retrieves or initializes authoritative streak state for a user.
   */
  static getOrCreateState(userId: string): UserStreakState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastClaimDate: null,
        totalCoins: 0,
        updatedAt: new Date().toISOString(),
      });
    }
    return this.userStates.get(userId)!;
  }

  /**
   * Inspects current status without mutating state.
   */
  static getStreakStatus(userId: string, now: Date = new Date()): StreakStatusView {
    if (!userId) {
      return {
        userId: "guest",
        currentStreak: 0,
        claimedToday: false,
        nextReward: STREAK_REWARDS[0],
        todayDateTehran: this.getTehranDate(now),
        totalCoins: 0,
        rewardsLadder: STREAK_REWARDS,
      };
    }

    const state = this.getOrCreateState(userId);
    const todayStr = this.getTehranDate(now);
    const claimedToday = state.lastClaimDate === todayStr;

    let displayStreak = state.currentStreak;
    if (state.lastClaimDate) {
      const diff = this.getCalendarDayDiff(state.lastClaimDate, todayStr);
      if (diff > 1 && !claimedToday) {
        // User missed at least 1 calendar day -> streak has broken
        displayStreak = 0;
      }
    }

    // Determine upcoming reward
    const nextDayIndex = claimedToday
      ? state.currentStreak % 7
      : (displayStreak % 7);
    const nextReward = STREAK_REWARDS[nextDayIndex] || STREAK_REWARDS[0];

    return {
      userId,
      currentStreak: displayStreak,
      claimedToday,
      nextReward,
      todayDateTehran: todayStr,
      totalCoins: state.totalCoins,
      rewardsLadder: STREAK_REWARDS,
    };
  }

  /**
   * Atomic, server-authoritative claim execution.
   * Serializes concurrent calls per userId using an internal mutex promise chain.
   */
  static async claimDailyReward(userId: string, now: Date = new Date()): Promise<ClaimResult> {
    if (!userId || userId.trim() === "" || userId === "guest") {
      return {
        success: false,
        message: "برای دریافت پاداش روزانه، ورود به حساب کاربری الزامی است.",
        streak: 0,
        coinsAwarded: 0,
        totalCoins: 0,
        claimedToday: false,
        errorCode: "USER_REQUIRED",
      };
    }

    // Acquire lock for this user
    while (this.userLocks.has(userId)) {
      await this.userLocks.get(userId);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.userLocks.set(userId, lockPromise);

    try {
      const state = this.getOrCreateState(userId);
      const todayStr = this.getTehranDate(now);

      // 1. Idempotency Check: Already claimed today?
      if (state.lastClaimDate === todayStr) {
        return {
          success: false,
          message: "پاداش وفاداری امروز پیش‌تر با موفقیت دریافت شده است.",
          streak: state.currentStreak,
          coinsAwarded: 0,
          totalCoins: state.totalCoins,
          claimedToday: true,
          errorCode: "ALREADY_CLAIMED_TODAY",
        };
      }

      // 2. Evaluate streak continuity
      let nextStreak = 1;
      if (state.lastClaimDate) {
        const diff = this.getCalendarDayDiff(state.lastClaimDate, todayStr);
        if (diff === 1) {
          // Exactly consecutive day
          nextStreak = (state.currentStreak % 7) + 1;
        } else if (diff === 0) {
          // Duplicate in same day (guard)
          return {
            success: false,
            message: "پاداش امروز دریافت شده است.",
            streak: state.currentStreak,
            coinsAwarded: 0,
            totalCoins: state.totalCoins,
            claimedToday: true,
            errorCode: "ALREADY_CLAIMED_TODAY",
          };
        } else {
          // Missed one or more days -> streak broken, reset to Day 1
          nextStreak = 1;
        }
      } else {
        // First time claim
        nextStreak = 1;
      }

      // 3. Resolve coins for this streak day
      const rewardConfig = STREAK_REWARDS[nextStreak - 1] || STREAK_REWARDS[0];
      const coinsAwarded = rewardConfig.coins;

      // 4. Update state atomically
      state.currentStreak = nextStreak;
      if (nextStreak > state.longestStreak) {
        state.longestStreak = nextStreak;
      }
      state.lastClaimDate = todayStr;
      state.totalCoins += coinsAwarded;
      state.updatedAt = now.toISOString();

      // 5. Generate immutable transaction ledger entry
      const transactionId = `tx_loyalty_${crypto.randomBytes(8).toString("hex")}`;
      const ledgerKey = `${userId}:${todayStr}`;
      this.claimLedger.set(ledgerKey, {
        claimId: transactionId,
        userId,
        date: todayStr,
        dayNumber: nextStreak,
        coins: coinsAwarded,
        createdAt: now.toISOString(),
      });

      return {
        success: true,
        message: `پاداش روز ${nextStreak} به میزان ${coinsAwarded} سکه با موفقیت به حساب شما افزوده شد.`,
        streak: nextStreak,
        coinsAwarded,
        totalCoins: state.totalCoins,
        claimedToday: true,
        transactionId,
      };
    } finally {
      this.userLocks.delete(userId);
      releaseLock();
    }
  }

  /**
   * Reset store (test helper)
   */
  static resetForTesting() {
    this.userStates.clear();
    this.userLocks.clear();
    this.claimLedger.clear();
  }
}
