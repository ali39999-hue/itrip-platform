"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { lt } from "@/lib/lt";
import { en, fa, faNumber } from "@/lib/persian";
import { amountToWords } from "@/lib/number-to-words";

export interface AmountInputProps {
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  /** Unit shown at the end of the field and after the words. */
  unit?: string;
  min?: number;
  max?: number;
  /** Spell the amount out under the field (default true; Persian words — fa locale only). */
  words?: boolean;
  /** Preset chips that set the value, e.g. [100_000, 500_000, 1_000_000]. */
  quick?: number[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** 100000 → «۱۰۰ هزار», 2500000 → «۲٫۵ میلیون», 1200 → «۱٬۲۰۰». */
export function shortAmount(n: number) {
  if (n >= 1_000_000 && n % 100_000 === 0) return `${fa(String(n / 1_000_000).replace(".", "٫"))} میلیون`;
  if (n >= 1_000 && n % 1_000 === 0) return `${fa(n / 1_000)} هزار`;
  return faNumber(n);
}

/**
 * مبلغ. Thousands separator «٬» and Persian digits while you type, the unit
 * after the number, and the amount spelled out underneath (fa locale — the
 * words engine is Persian) so nobody pays ۱۲٬۵۰۰٬۰۰۰ when they meant ۱٬۲۵۰٬۰۰۰.
 * The value is a plain number.
 */
export function AmountInput({ value, defaultValue = null, onChange, unit = "تومان", min, max, words = true, quick, placeholder = "۰", disabled, className, id }: AmountInputProps) {
  const locale = useLocale();
  const [internal, setInternal] = React.useState<number | null>(defaultValue);
  const amount = value === undefined ? internal : value;
  const tooLow = amount !== null && min !== undefined && amount < min;
  const tooHigh = amount !== null && max !== undefined && amount > max;
  const invalid = tooLow || tooHigh;
  const showWords = words && locale === "fa";

  function set(next: number | null) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  function type(raw: string) {
    const digits = en(raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
    set(digits ? Number(digits) : null);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-lg border bg-background/60 px-3 transition-colors focus-within:ring-2 focus-within:ring-ring/60",
          invalid ? "border-destructive/60" : "border-input",
          disabled && "opacity-50",
        )}
      >
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={amount === null ? "" : faNumber(amount)}
          onChange={(e) => type(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={id ? `${id}-words` : undefined}
        />
        <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>
      </div>
      {(showWords || invalid) && (
        <p id={id ? `${id}-words` : undefined} className={cn("min-h-4 text-[11px]", invalid ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {tooLow
            ? lt(locale, { fa: `حداقل ${faNumber(min ?? 0)} ${unit}`, en: `Minimum ${min ?? 0} ${unit}`, ar: `الحد الأدنى ${min ?? 0} ${unit}`, zh: `最低 ${min ?? 0} ${unit}`, ru: `Минимум ${min ?? 0} ${unit}` })
            : tooHigh
              ? lt(locale, { fa: `حداکثر ${faNumber(max ?? 0)} ${unit}`, en: `Maximum ${max ?? 0} ${unit}`, ar: `الحد الأقصى ${max ?? 0} ${unit}`, zh: `最高 ${max ?? 0} ${unit}`, ru: `Максимум ${max ?? 0} ${unit}` })
              : amount !== null
                ? amountToWords(amount, unit)
                : " "}
        </p>
      )}
      {quick && quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => set(q)}
              className={cn(
                "cursor-pointer min-h-[44px] rounded-full border px-3 text-[11px] tabular-nums transition-colors disabled:cursor-not-allowed",
                amount === q ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {shortAmount(q)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
