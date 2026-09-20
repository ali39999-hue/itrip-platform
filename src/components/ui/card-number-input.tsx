"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Check, CreditCard, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { lt } from "@/lib/lt";
import { bankLabel, cardBank, formatCardNumber, isCardNumber, normalizeCardNumber } from "@/lib/persian";

export interface CardNumberInputProps {
  value?: string;
  /** Receives the 16 Latin digits, Luhn validity, and the detected bank (or null). */
  onChange?: (digits: string, valid: boolean, bank: string | null) => void;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * شماره‌ی کارت بانکی. Four groups of Persian digits laid out LTR, the bank
 * named from the first six digits (پیش‌شماره) while you type, and a Luhn
 * check that only complains once all sixteen digits are in.
 */
export function CardNumberInput({ value, onChange, className, id, autoFocus, disabled }: CardNumberInputProps) {
  const locale = useLocale();
  const [internal, setInternal] = React.useState("");
  const digits = normalizeCardNumber(value ?? internal);
  const complete = digits.length === 16;
  const valid = isCardNumber(digits);
  const invalid = complete && !valid;
  const bank = cardBank(digits);

  function set(next: string) {
    const d = normalizeCardNumber(next);
    if (value === undefined) setInternal(d);
    onChange?.(d, isCardNumber(d), cardBank(d));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-lg border bg-background/60 px-3 transition-colors focus-within:ring-2 focus-within:ring-ring/60",
          invalid ? "border-destructive/60" : "border-input",
          disabled && "opacity-50",
        )}
        dir="ltr"
      >
        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          inputMode="numeric"
          autoComplete="cc-number"
          autoFocus={autoFocus}
          disabled={disabled}
          value={formatCardNumber(digits)}
          onChange={(e) => set(e.target.value)}
          placeholder="۰۰۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰"
          maxLength={19}
          className="h-full min-w-0 flex-1 bg-transparent text-sm tracking-wide tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={id ? `${id}-hint` : undefined}
        />
        {valid && <Check className="size-4 shrink-0 text-success" />}
      </div>
      <p id={id ? `${id}-hint` : undefined} className="flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
        {invalid ? (
          <span className="text-destructive">
            {lt(locale, {
              fa: "شماره‌ی کارت معتبر نیست",
              en: "Invalid card number",
              ar: "رقم البطاقة غير صالح",
              zh: "卡号无效",
              ru: "Недействительный номер карты",
            })}
          </span>
        ) : bank ? (
          <>
            <Landmark className="size-3" />
            {lt(locale, {
              fa: bankLabel(bank),
              en: bank,
              ar: bankLabel(bank),
              zh: bank,
              ru: bank,
            })}
          </>
        ) : digits.length >= 6 ? (
          lt(locale, {
            fa: "بانک این کارت شناخته نشد",
            en: "Unknown card issuer",
            ar: "المصرف غير معروف",
            zh: "发卡银行未知",
            ru: "Банк не опознан",
          })
        ) : (
          lt(locale, {
            fa: "۱۶ رقم روی کارت",
            en: "16 digits on the card",
            ar: "١٦ رقماً على البطاقة",
            zh: "卡面 16 位数字",
            ru: "16 цифр на карте",
          })
        )}
      </p>
    </div>
  );
}
