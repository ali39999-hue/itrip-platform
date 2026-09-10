// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailyStreakCard } from "./daily-streak-card";

describe("DailyStreakCard", () => {
  it("renders streak header and day steps", () => {
    render(<DailyStreakCard initialStreak={3} />);

    expect(screen.getByText("باشگاه وفاداری فیروزو")).toBeDefined();
    expect(screen.getByText(/۳ روز متوالی/)).toBeDefined();
    expect(screen.getByText("روز ۱")).toBeDefined();
    expect(screen.getByText("روز ۷")).toBeDefined();
  });

  it("handles claiming daily reward", () => {
    const onClaimMock = vi.fn();

    render(
      <DailyStreakCard
        initialStreak={2}
        initialClaimedToday={false}
        onClaim={onClaimMock}
      />
    );

    const claimBtn = screen.getByRole("button", { name: /دریافت سکه‌های امروز/ });
    expect(claimBtn).toBeDefined();

    fireEvent.click(claimBtn);

    expect(onClaimMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("پاداش امروز دریافت شده است")).toBeDefined();
  });

  it("disables button when reward is already claimed today", () => {
    render(<DailyStreakCard initialStreak={4} initialClaimedToday={true} />);

    const disabledBtn = screen.getByRole("button", { name: /پاداش امروز دریافت شد/ });
    expect(disabledBtn).toBeDefined();
    expect((disabledBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
