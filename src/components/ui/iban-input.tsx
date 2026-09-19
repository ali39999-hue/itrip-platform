"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Check, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { lt } from "@/lib/lt";
import { bankLabel, formatIban, ibanBank, isIban, normalizeIban } from "@/lib/persian";

export interface IbanInputProps {
  value?: string;
  onChange?: (iban: string, valid: boolean) => void;
  className?: string;
  id?: string;
}

/** شماره‌ی شبا. Fixed «IR» prefix, digits grouped in fours, mod-97 validation and bank detection. */
export function IbanInput({ value, onChange, className, id }: IbanInputProps) {
  const locale = useLocale();
  const [internal, setInternal] = React.useState("IR");
  const iban = normalizeIban(value ?? internal);
  const digits = iban.slice(2);
  const valid = isIban(iban);
  const bank = ibanBank(iban);
  const complete = digits.length === 24;

  function set(next: string) {
    const n = normalizeIban("IR" + next);
    if (value === undefined) setInternal(n);
    onChange?.(n, isIban(n));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn("flex min-h-11 items-center gap-2 rounded-lg border bg-background/60 px-3 transition-colors focus-within:ring-2 focus-within:ring-ring/60", complete && !valid ? "border-destructive/60" : "border-input")} dir="ltr">
        <span className="font-mono text-sm text-muted-foreground">IR</span>
        <input
          id={id}
          inputMode="numeric"
          value={formatIban(iban).slice(3)}
          onChange={(e) => set(e.target.value)}
          placeholder="00 0000 0000 0000 0000 0000 00"
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
          aria-invalid={complete && !valid ? true : undefined}
        />
        {valid && <Check className="size-4 text-success" />}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {bank
          ? (<><Landmark className="size-3" />{lt(locale, { fa: bankLabel(bank), en: bank, ar: bankLabel(bank), zh: bank, ru: bank })}</>)
          : complete && !valid
            ? <span className="text-destructive">{lt(locale, { fa: "شماره‌ی شبا معتبر نیست", en: "Invalid IBAN", ar: "رقم الآيبان غير صحيح", zh: "IBAN 无效", ru: "Неверный IBAN" })}</span>
            : lt(locale, { fa: "۲۴ رقم بعد از IR", en: "24 digits after IR", ar: "٢٤ رقماً بعد من IR", zh: "IR 后 24 位数字", ru: "24 цифры после IR" })}
      </p>
    </div>
  );
}
