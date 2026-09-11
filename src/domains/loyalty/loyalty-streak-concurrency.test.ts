import { describe, it, expect, beforeEach } from "vitest";
import { LoyaltyStreakService, STREAK_REWARDS } from "./LoyaltyStreakService";

describe("LoyaltyStreakService (Server-Authoritative & Concurrency Suite)", () => {
  beforeEach(() => {
    LoyaltyStreakService.resetForTesting();
  });

  it("grants Day 1 reward (10 coins) for a first-time user", async () => {
    const res = await LoyaltyStreakService.claimDailyReward("user_101", new Date("2026-09-11T10:00:00Z"));
    expect(res.success).toBe(true);
    expect(res.streak).toBe(1);
    expect(res.coinsAwarded).toBe(10);
    expect(res.totalCoins).toBe(10);
    expect(res.claimedToday).toBe(true);
    expect(res.transactionId).toMatch(/^tx_loyalty_/);
  });

  it("advances to Day 2 (15 coins) on consecutive day claim", async () => {
    // Day 1: 2026-09-11
    await LoyaltyStreakService.claimDailyReward("user_102", new Date("2026-09-11T10:00:00Z"));

    // Day 2: 2026-09-12
    const res2 = await LoyaltyStreakService.claimDailyReward("user_102", new Date("2026-09-12T10:00:00Z"));
    expect(res2.success).toBe(true);
    expect(res2.streak).toBe(2);
    expect(res2.coinsAwarded).toBe(15);
    expect(res2.totalCoins).toBe(25); // 10 + 15
  });

  it("resets streak to Day 1 if user misses a day", async () => {
    // Day 1: 2026-09-10
    await LoyaltyStreakService.claimDailyReward("user_103", new Date("2026-09-10T10:00:00Z"));

    // User skips 2026-09-11 and arrives on 2026-09-12
    const res = await LoyaltyStreakService.claimDailyReward("user_103", new Date("2026-09-12T10:00:00Z"));
    expect(res.success).toBe(true);
    expect(res.streak).toBe(1); // Reset to 1
    expect(res.coinsAwarded).toBe(10);
    expect(res.totalCoins).toBe(20); // 10 + 10
  });

  it("rejects duplicate claim on the same calendar day (idempotent)", async () => {
    const now = new Date("2026-09-11T10:00:00Z");
    const first = await LoyaltyStreakService.claimDailyReward("user_104", now);
    expect(first.success).toBe(true);

    const second = await LoyaltyStreakService.claimDailyReward("user_104", now);
    expect(second.success).toBe(false);
    expect(second.errorCode).toBe("ALREADY_CLAIMED_TODAY");
    expect(second.coinsAwarded).toBe(0);
    expect(second.totalCoins).toBe(10); // Balance unaltered
  });

  it("enforces authentication for guest users", async () => {
    const res = await LoyaltyStreakService.claimDailyReward("guest");
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("USER_REQUIRED");
  });

  it("CONCURRENCY TEST: 50 simultaneous parallel claim requests result in exactly 1 success", async () => {
    const userId = "user_stress_parallel";
    const now = new Date("2026-09-11T14:30:00Z");

    // Dispatch 50 simultaneous requests
    const promises = Array.from({ length: 50 }, () =>
      LoyaltyStreakService.claimDailyReward(userId, now)
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.success);
    const duplicates = results.filter((r) => !r.success && r.errorCode === "ALREADY_CLAIMED_TODAY");

    expect(successes.length).toBe(1);
    expect(duplicates.length).toBe(49);

    // Final user state check
    const status = LoyaltyStreakService.getStreakStatus(userId, now);
    expect(status.claimedToday).toBe(true);
    expect(status.currentStreak).toBe(1);
    expect(status.totalCoins).toBe(10); // Exactly credited once
  });

  it("advances through the full 7-day ladder and wraps to Day 1 with correct rewards", async () => {
    const userId = "user_ladder_marathon";

    for (let day = 1; day <= 7; day++) {
      const date = new Date(`2026-09-${String(day + 10).padStart(2, "0")}T08:00:00Z`);
      const res = await LoyaltyStreakService.claimDailyReward(userId, date);
      expect(res.success).toBe(true);
      expect(res.streak).toBe(day);
      expect(res.coinsAwarded).toBe(STREAK_REWARDS[day - 1].coins);
    }

    // Day 8 (Next cycle wraps to Day 1)
    const day8 = new Date("2026-09-18T08:00:00Z");
    const res8 = await LoyaltyStreakService.claimDailyReward(userId, day8);
    expect(res8.success).toBe(true);
    expect(res8.streak).toBe(1);
  });
});
