/**
 * Iranian Commerce & Form Validation Utilities for Firuzo Platform.
 * Adapted from aroux30/site for mobile travel booking and payments.
 *
 * Provides:
 * - Iranian National ID (کد ملی) modulo 11 checksum validation with repetitive digit rejection.
 * - Shetab Card Luhn validation + 18-bank BIN matching with branding colors & localized names.
 * - Shetab 4-4-4-4 block card formatting.
 * - Human-friendly Toman currency formatting (e.g. "۶۵ میلیون تومان").
 * - Persian text & digits normalization (Arabic Yeh/Kaf normalization, ZWNJ preservation).
 */

export interface ShetabBank {
  bin: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  color: string;
  bgColor: string;
}

/**
 * 6-digit Bank Identification Number (BIN) mapping for Iranian commercial banks.
 */
export const SHETAB_BANKS: Record<string, Omit<ShetabBank, "bin">> = {
  "603799": { nameFa: "بانک ملی ایران", nameEn: "Bank Melli Iran", slug: "melli", color: "#004B87", bgColor: "#E6F0FA" },
  "610433": { nameFa: "بانک ملت", nameEn: "Bank Mellat", slug: "mellat", color: "#C8102E", bgColor: "#FDE8EB" },
  "621986": { nameFa: "بانک سامان", nameEn: "Saman Bank", slug: "saman", color: "#005696", bgColor: "#E5F1FA" },
  "502229": { nameFa: "بانک پاسارگاد", nameEn: "Pasargad Bank", slug: "pasargad", color: "#D4AF37", bgColor: "#FAF7EE" },
  "627353": { nameFa: "بانک تجارت", nameEn: "Tejarat Bank", slug: "tejarat", color: "#003A70", bgColor: "#E6EFF7" },
  "589210": { nameFa: "بانک سپه", nameEn: "Bank Sepah", slug: "sepah", color: "#C69214", bgColor: "#F9F4E8" },
  "627412": { nameFa: "بانک اقتصاد نوین", nameEn: "EN Bank", slug: "eghtesad-novin", color: "#6A1A74", bgColor: "#F3E8F5" },
  "603769": { nameFa: "بانک صادرات ایران", nameEn: "Bank Saderat Iran", slug: "saderat", color: "#1D3B6C", bgColor: "#E8EEF7" },
  "622106": { nameFa: "بانک پارسیان", nameEn: "Parsian Bank", slug: "parsian", color: "#7B1113", bgColor: "#F7E8E9" },
  "636214": { nameFa: "بانک آینده", nameEn: "Ayandeh Bank", slug: "ayandeh", color: "#69331C", bgColor: "#F4ECE8" },
  "505416": { nameFa: "بانک گردشگری", nameEn: "Tourism Bank", slug: "tourism", color: "#54585A", bgColor: "#EEEEEE" },
  "639346": { nameFa: "بانک سینا", nameEn: "Sina Bank", slug: "sina", color: "#006F79", bgColor: "#E6F4F5" },
  "502938": { nameFa: "بانک دی", nameEn: "Dey Bank", slug: "dey", color: "#0083CA", bgColor: "#E6F4FA" },
  "504706": { nameFa: "بانک شهر", nameEn: "Shahr Bank", slug: "shahr", color: "#E03A3E", bgColor: "#FBEEEE" },
  "603770": { nameFa: "بانک کشاورزی", nameEn: "Keshavarzi Bank", slug: "keshavarzi", color: "#2D68C4", bgColor: "#EBF1FB" },
  "627488": { nameFa: "بانک کارآفرین", nameEn: "Karafarin Bank", slug: "karafarin", color: "#00805E", bgColor: "#E6F5F1" },
  "627760": { nameFa: "پست بانک ایران", nameEn: "Post Bank", slug: "postbank", color: "#007A3D", bgColor: "#E6F5EE" },
  "628023": { nameFa: "بانک مسکن", nameEn: "Bank Maskan", slug: "maskan", color: "#E4002B", bgColor: "#FCE6EA" },
  "502806": { nameFa: "بانک شهر", nameEn: "Shahr Bank", slug: "shahr-alt", color: "#E03A3E", bgColor: "#FBEEEE" },
};

/**
 * Normalizes Arabic-Indic (۰-۹) and Extended Eastern Arabic (٠-٩) digits to ASCII digits.
 */
export function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632));
}

/**
 * Converts ASCII digits to Persian digits.
 */
export function toPersianDigits(input: string | number | bigint): string {
  const str = String(input);
  return str.replace(/[0-9]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 1728));
}

/**
 * Normalizes Persian text:
 * - Folds Arabic Yeh (ي) to Persian Yeh (ی)
 * - Folds Arabic Kaf (ك) to Persian Kaf (ک)
 * - Normalizes Arabic-Indic digits to ASCII
 * - Strips redundant diacritics while preserving ZWNJ (\u200C)
 */
export function normalizePersianText(text: string): string {
  if (!text) return "";
  return toAsciiDigits(text)
    .replace(/\u064A/g, "\u06CC") // ي -> ی
    .replace(/\u0643/g, "\u06A9") // ك -> ک
    .replace(/\u0649/g, "\u06CC") // ى -> ی
    .replace(/\u0629/g, "\u0647") // ة -> ه
    .replace(/[\u064B-\u0652\u0670]/g, "") // Diacritics: tanwin, fatha, damma, kasra, sukun
    .trim();
}

/**
 * Validates a 10-digit Iranian National ID (کد ملی).
 * Uses modulo 11 checksum algorithm and rejects repetitive digit sequences.
 */
export function validateNationalId(nationalId: string): boolean {
  if (!nationalId) return false;
  const clean = toAsciiDigits(nationalId).replace(/\D/g, "");
  if (clean.length !== 10) return false;

  // Reject all repeated numbers: 0000000000, 1111111111, ..., 9999999999
  if (/^(\d)\1{9}$/.test(clean)) return false;

  const check = parseInt(clean[9]!, 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]!, 10) * (10 - i);
  }

  const remainder = sum % 11;
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

/**
 * Identifies the issuing bank from a 16-digit Shetab card number or 6-digit BIN.
 */
export function getShetabBank(cardNumberOrBin: string): ShetabBank | null {
  if (!cardNumberOrBin) return null;
  const clean = toAsciiDigits(cardNumberOrBin).replace(/\D/g, "");
  if (clean.length < 6) return null;

  const bin = clean.slice(0, 6);
  const bank = SHETAB_BANKS[bin];
  if (!bank) return null;

  return {
    bin,
    ...bank,
  };
}

/**
 * Validates a 16-digit Iranian Shetab debit card number using the Luhn algorithm.
 * Also returns bank metadata if matched against the BIN directory.
 */
export function validateShetabCard(cardNumber: string): { isValid: boolean; bank: ShetabBank | null } {
  if (!cardNumber) return { isValid: false, bank: null };
  const clean = toAsciiDigits(cardNumber).replace(/\D/g, "");
  if (clean.length !== 16) {
    return { isValid: false, bank: null };
  }

  // Luhn checksum algorithm
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let digit = parseInt(clean[i]!, 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const isValid = sum % 10 === 0;
  const bank = isValid ? getShetabBank(clean) : null;

  return { isValid, bank };
}

/**
 * Formats a 16-digit card number into 4-4-4-4 blocks (e.g. "6037-9918-1234-5678").
 */
export function formatShetabCard(cardNumber: string, separator: string = "-"): string {
  const clean = toAsciiDigits(cardNumber).replace(/\D/g, "").slice(0, 16);
  if (!clean) return "";
  const parts = clean.match(/(\d{1,4})/g);
  return parts ? parts.join(separator) : clean;
}

/**
 * Formats large amounts into readable Persian strings (e.g. 65000000 -> "۶۵ میلیون تومان").
 */
export function formatTomanHuman(amountInToman: number | bigint): string {
  const num = typeof amountInToman === "bigint" ? Number(amountInToman) : amountInToman;
  if (num === 0) return "۰ تومان";

  const abs = Math.abs(num);
  const sign = num < 0 ? "منفی " : "";

  if (abs >= 1_000_000_000) {
    const milliards = abs / 1_000_000_000;
    const formatted = milliards % 1 === 0 ? milliards.toFixed(0) : milliards.toFixed(1);
    return `${sign}${toPersianDigits(formatted)} میلیارد تومان`;
  }

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${sign}${toPersianDigits(formatted)} میلیون تومان`;
  }

  if (abs >= 1_000) {
    const thousands = abs / 1_000;
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${sign}${toPersianDigits(formatted)} هزار تومان`;
  }

  return `${sign}${toPersianDigits(abs.toLocaleString("en-US"))} تومان`;
}
