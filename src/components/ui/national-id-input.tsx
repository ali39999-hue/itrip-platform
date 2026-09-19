"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Check, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { lt } from "@/lib/lt";
import { formatNationalId, isNationalId, normalizeNationalId } from "@/lib/persian";

export interface NationalIdInputProps {
  value?: string;
  /** Receives the 10 raw digits (Latin, may start with 0) and validity. */
  onChange?: (digits: string, valid: boolean) => void;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * کد ملی. Persian digits shown in the 3-6-1 grouping printed on the card,
 * checksum validated only once all ten digits are in (via iranian-commerce —
 * single source of truth), and the value is kept as a string so a leading zero
 * survives.
 */
export function NationalIdInput({ value, onChange, className, id, autoFocus, disabled }: NationalIdInputProps) {
  const locale = useLocale();
  const [internal, setInternal] = React.useState("");
  const digits = normalizeNationalId(value ?? internal);
  const complete = digits.length === 10;
  const valid = isNationalId(digits);
  const invalid = complete && !valid;

  function set(next: string) {
    const d = normalizeNationalId(next);
    if (value === undefined) setInternal(d);
    onChange?.(d, isNationalId(d));
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
        <IdCard className="size-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          value={formatNationalId(digits)}
          onChange={(e) => set(e.target.value)}
          placeholder={lt(locale, { fa: "۰۰۱-۲۳۴۵۶۷-۸", en: "001-234567-8", ar: "٠٠١-٢٣٤٥٦٧-٨", zh: "001-234567-8", ru: "001-234567-8" })}
          maxLength={12}
          className="h-full min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={id ? `${id}-hint` : undefined}
        />
        {valid && <Check className="size-4 shrink-0 text-success" />}
      </div>
      <p id={id ? `${id}-hint` : undefined} className="text-[11px] text-muted-foreground" aria-live="polite">
        {valid
          ? lt(locale, { fa: "کد ملی معتبر است", en: "National ID is valid", ar: "الرقم الوطني صحيح", zh: "身份证号有效", ru: "Нац. ID корректен" })
          : invalid
            ? <span className="text-destructive">{lt(locale, { fa: "کد ملی معتبر نیست؛ رقم‌ها را دوباره بررسی کنید", en: "Invalid National ID — please re-check the digits", ar: "الرقم الوطني غير صحيح؛ راجع الأرقام", zh: "身份证号无效，请重新核对数字", ru: "Неверный Нац. ID — проверьте цифры" })}</span>
            : lt(locale, { fa: "ده رقم، همان‌طور که روی کارت ملی چاپ شده", en: "Ten digits, exactly as printed on the national card", ar: "عشرة أرقام كما هي مطبوعة على البطاقة", zh: "十位数字，与身份证上印刷一致", ru: "Десять цифр, как напечатано на карте" })}
      </p>
    </div>
  );
}
