/**
 * Persian/Iranian form utilities that Firuzo lacked — شبا (IBAN) validation and
 * bank detection, the 3-6-1 national-ID display format, and Persian digit
 * helpers. Deliberately does NOT duplicate src/lib/iranian-commerce.ts: the
 * national-ID checksum delegates to validateNationalId there (single source of
 * truth), and digit conversion re-exports its toAsciiDigits/toPersianDigits.
 * Dependency-free; accepts Persian or Latin digits everywhere.
 * (Adapted from the vibefarsi.ir component registry, MIT-style copy-in.)
 */
import { toAsciiDigits, toPersianDigits, validateNationalId, getShetabBank, validateShetabCard } from "./iranian-commerce";

/** Latin digits for storage/validation: «۱۲۳»/«+۹۸…» → ASCII. */
export const en = toAsciiDigits;

/** Persian digits for display: «123» → «۱۲۳». */
export const fa = toPersianDigits;

/** 1234567 → «۱٬۲۳۴٬۵۶۷» — grouped with the Persian thousands separator. */
export function faNumber(n: number | string): string {
  const digits = typeof n === "number" ? (Number.isFinite(n) ? String(n) : "") : String(n);
  if (!/^\d+$/.test(digits)) return toPersianDigits(digits);
  return toPersianDigits(digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
}

/* ---------- کد ملی ---------- */

/** Digits only (Persian accepted), capped at 10. Keep it a string: codes may start with 0. */
export function normalizeNationalId(input: string): string {
  return en(input).replace(/\D/g, "").slice(0, 10);
}

/** «۰۰۱-۲۳۴۵۶۷-۸» — the 3-6-1 grouping printed on the card. */
export function formatNationalId(input: string): string {
  const d = normalizeNationalId(input);
  return fa([d.slice(0, 3), d.slice(3, 9), d.slice(9, 10)].filter(Boolean).join("-"));
}

/** Checksum lives in iranian-commerce.ts — re-exported here as the predicate name. */
export const isNationalId = validateNationalId;

/* ---------- شبا / IBAN ---------- */

/** Keeps «IR» + up to 24 digits, upper-cased, digits normalized. */
export function normalizeIban(input: string): string {
  const raw = en(input).toUpperCase().replace(/[^0-9A-Z]/g, "");
  const digits = raw.replace(/^IR/, "").replace(/\D/g, "").slice(0, 24);
  return "IR" + digits;
}

/** Standard IBAN mod-97 check for IR accounts (IR + 24 digits). */
export function isIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^IR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + "1827" + iban.slice(2, 4); // I=18, R=27
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** «IR12 0170 0000 0010 2345 6789 01» */
export function formatIban(input: string): string {
  const iban = normalizeIban(input);
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

const BANKS: Record<string, string> = {
  "010": "بانک مرکزی", "011": "صنعت و معدن", "012": "ملت", "013": "رفاه کارگران", "014": "مسکن", "015": "سپه", "016": "کشاورزی",
  "017": "ملی", "018": "تجارت", "019": "صادرات", "020": "توسعه صادرات", "021": "پست بانک", "022": "توسعه تعاون", "051": "مؤسسه توسعه",
  "053": "کارآفرین", "054": "پارسیان", "055": "اقتصاد نوین", "056": "سامان", "057": "پاسارگاد", "058": "سرمایه", "059": "سینا",
  "060": "قرض‌الحسنه مهر ایران", "061": "شهر", "062": "آینده", "064": "گردشگری", "066": "دی", "069": "ایران زمین", "070": "رسالت",
  "078": "خاورمیانه", "079": "مؤسسه ملل",
};

/** Bank name from the 3-digit bank code inside the IBAN, or null. */
export function ibanBank(input: string): string | null {
  const iban = normalizeIban(input);
  if (iban.length < 7) return null;
  return BANKS[iban.slice(4, 7)] ?? null;
}

/** «ملت» → «بانک ملت»; names that already carry بانک/مؤسسه («پست بانک», «مؤسسه ملل») are left alone. */
export function bankLabel(name: string): string {
  return /بانک|مؤسسه/.test(name) ? name : `بانک ${name}`;
}

/* ---------- card ---------- */

/** 16 Latin digits at most; Persian digits, spaces and dashes are stripped. */
export function normalizeCardNumber(input: string): string {
  return en(input).replace(/\D/g, "").slice(0, 16);
}

/** «۶۰۳۷ ۹۹۱۱ ۲۲۳۳ ۴۴۵۵» — Persian digits, four groups. */
export function formatCardNumber(input: string): string {
  const d = normalizeCardNumber(input);
  return fa(d.replace(/(.{4})/g, "$1 ").trim());
}

/** Bank name from the first six digits of the card, or null while fewer than six are typed / unknown. */
export function cardBank(input: string): string | null {
  const bank = getShetabBank(input);
  return bank ? bank.nameFa : null;
}

/** Luhn check for 16-digit bank cards. */
export function isCardNumber(input: string): boolean {
  return validateShetabCard(input).isValid;
}

/** Format percentage: 50 -> «۵۰٪» */
export function faPercent(n: number | string): string {
  return `${fa(n)}٪`;
}
