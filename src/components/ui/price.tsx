"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { lt } from "@/lib/lt";
import { faNumber, faPercent } from "@/lib/persian";

export interface PriceProps {
  amount: number;
  /** Original price before discount; renders struck through with the computed percent. */
  original?: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "text-base", md: "text-2xl", lg: "text-4xl" };

/** قیمت. Thousands separator «٬», unit after the number, discount computed for you. */
export function Price({ amount, original, unit = "تومان", size = "md", className }: PriceProps) {
  const locale = useLocale();
  const off = original && original > amount ? Math.round((1 - amount / original) * 100) : 0;
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span className="flex items-baseline gap-1.5">
        <span className={cn("font-bold tabular-nums font-price", sizes[size])}>{faNumber(amount)}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </span>
      {off > 0 && (
        <span className="mt-0.5 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground line-through tabular-nums">{faNumber(original!)}</span>
          <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-px text-[11px] font-semibold">
            {faPercent(off)} {lt(locale, { fa: "تخفیف", en: "OFF", ar: "خصم", zh: "优惠", ru: "скидка" })}
          </span>
        </span>
      )}
    </div>
  );
}
