"use client";

import React, { useState } from "react";
import { Flame, Gift, Check, Sparkles } from "lucide-react";
import { playSuccessChime } from "@/lib/audio-effects";
import { toPersianDigits } from "@/lib/iranian-commerce";

export interface DailyStreakCardProps {
  initialStreak?: number;
  initialClaimedToday?: boolean;
  onClaim?: (day: number, coins: number) => void;
  className?: string;
}

const STREAK_DAYS = [
  { day: 1, coins: 10, label: "روز ۱" },
  { day: 2, coins: 15, label: "روز ۲" },
  { day: 3, coins: 20, label: "روز ۳" },
  { day: 4, coins: 25, label: "روز ۴" },
  { day: 5, coins: 30, label: "روز ۵" },
  { day: 6, coins: 40, label: "روز ۶" },
  { day: 7, coins: 70, label: "روز ۷", isSpecial: true },
];

/**
 * 7-Day Travel Loyalty Daily Streak Card for Firuzo Platform.
 * Adapted from aroux30/site for customer retention and gamified coin rewards.
 */
export function DailyStreakCard({
  initialStreak = 2,
  initialClaimedToday = false,
  onClaim,
  className = "",
}: DailyStreakCardProps) {
  const [streak, setStreak] = useState(initialStreak);
  const [claimedToday, setClaimedToday] = useState(initialClaimedToday);
  const [justClaimed, setJustClaimed] = useState(false);

  const currentDayIndex = streak % 7;
  const currentReward = STREAK_DAYS[currentDayIndex]?.coins || 10;

  const handleClaim = () => {
    if (claimedToday) return;

    // Play micro-interaction sound
    playSuccessChime();

    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setClaimedToday(true);
    setJustClaimed(true);

    onClaim?.(nextStreak, currentReward);
  };

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-surface/95 backdrop-blur-md p-5 shadow-sm transition-all ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-amber-500/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">باشگاه وفاداری فیروزو</h3>
            <p className="text-xs text-muted-foreground">
              زنجیره ورود: <span className="font-semibold text-primary">{toPersianDigits(streak)} روز متوالی</span>
            </p>
          </div>
        </div>

        {justClaimed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>+{toPersianDigits(currentReward)} سکه</span>
          </span>
        )}
      </div>

      {/* 7-Day Ladder Chips */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {STREAK_DAYS.map((item, idx) => {
          const isCompleted = idx < currentDayIndex || (idx === currentDayIndex && claimedToday);
          const isCurrent = idx === currentDayIndex && !claimedToday;

          return (
            <div
              key={item.day}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all ${
                isCompleted
                  ? "bg-primary/10 border-primary/30 text-primary font-bold"
                  : isCurrent
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-700 shadow-sm"
                  : "bg-surface-elevated/40 border-border/50 text-muted-foreground opacity-60"
              }`}
            >
              <span className="text-[10px] font-medium mb-1">{item.label}</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1">
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                ) : item.isSpecial ? (
                  <Gift className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <span className="text-[11px] font-bold">{toPersianDigits(item.coins)}</span>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">{toPersianDigits(item.coins)} سکه</span>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleClaim}
        disabled={claimedToday}
        aria-label={claimedToday ? "پاداش امروز دریافت شد" : "دریافت سکه‌های امروز"}
        className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all duration-150 ${
          claimedToday
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground active:scale-[0.98] shadow-sm hover:opacity-95"
        }`}
      >
        {claimedToday ? (
          <>
            <Check className="w-4 h-4" />
            <span>پاداش امروز دریافت شده است</span>
          </>
        ) : (
          <>
            <Gift className="w-4 h-4" />
            <span>دریافت {toPersianDigits(currentReward)} سکه سفر امروز</span>
          </>
        )}
      </button>
    </div>
  );
}
