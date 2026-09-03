/**
 * Zod validation schemas for Firuzo/Firuzo travel platform.
 *
 * These schemas validate API request bodies and are the single source
 * of truth for the allowed values of the string-based "enums" used in
 * the Prisma schema (SQLite doesn't support native enums).
 */

import { z } from "zod";

// ─── Shared Enums (mirroring Prisma string fields) ───────────────────────────

export const UserRole = z.enum(["CUSTOMER", "SUPER_ADMIN", "FINANCE", "OPS"]);
export type UserRole = z.infer<typeof UserRole>;

export const BookingType = z.enum([
  "FLIGHT",
  "HOTEL",
  "TOUR",
  "TRANSFER",
  "TRAIN",
  "INSURANCE",
  "ESIM",
  "VISA",
]);
export type BookingType = z.infer<typeof BookingType>;

/**
 * Client pages store plural, lowercase service types ('flights', 'hotels', …)
 * while the booking schema (and the database) uses the singular enum above.
 * Normalize every known client spelling to the canonical server value.
 */
export function normalizeBookingType(raw: string | null | undefined): BookingType | undefined {
  if (!raw) return undefined;
  const map: Record<string, BookingType> = {
    FLIGHT: "FLIGHT",
    FLIGHTS: "FLIGHT",
    HOTEL: "HOTEL",
    HOTELS: "HOTEL",
    TOUR: "TOUR",
    TOURS: "TOUR",
    TRANSFER: "TRANSFER",
    TRANSFERS: "TRANSFER",
    TRAIN: "TRAIN",
    TRAINS: "TRAIN",
    INSURANCE: "INSURANCE",
    ESIM: "ESIM",
    VISA: "VISA",
  };
  return map[raw.trim().toUpperCase()];
}

export const BookingStatus = z.enum([
  "DRAFT",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "REFUNDED",
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const TransactionType = z.enum(["TOPUP", "PAYMENT", "REFUND", "PENALTY"]);
export type TransactionType = z.infer<typeof TransactionType>;

export const Gender = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof Gender>;

// ─── Passenger ────────────────────────────────────────────────────────────────

/** Accepts Latin (a-z) and Persian/Arabic Unicode characters. */
const nameRegex = /^[\p{Script=Latin}\p{Script=Arabic}\s'-]+$/u;

export const passengerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .regex(nameRegex, "Only Latin and Persian characters are allowed"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .regex(nameRegex, "Only Latin and Persian characters are allowed"),
  nationalId: z
    .string()
    .regex(/^\d{10}$/, "National ID must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  passportNo: z
    .string()
    .min(5, "Passport number is too short")
    .max(20, "Passport number is too long"),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .transform((v) => {
      // Normalize MM/DD/YYYY to YYYY-MM-DD
      const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
      if (mdy) {
        const [, m, d, y] = mdy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Normalize YYYY/MM/DD to YYYY-MM-DD
      const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(v.trim());
      if (ymd) {
        const [, y, m, d] = ymd;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return v.trim();
    })
    .refine(
      (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime()),
      "Please pick your date of birth from the calendar"
    ),
  gender: Gender,
});
export type Passenger = z.infer<typeof passengerSchema>;

// ─── Booking Request ──────────────────────────────────────────────────────────

export const moneySchema = z.object({
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.enum(["IRR", "USDT", "AED"]),
});
export type Money = z.infer<typeof moneySchema>;

export const bookingSchema = z.object({
  type: z.preprocess((v) => normalizeBookingType(typeof v === "string" ? v : undefined), BookingType),
  itemId: z.string().optional(),
  itemTitle: z.string().optional(),
  count: z.number().int().positive().default(1),
  nights: z.number().int().positive().optional(),
  travelDate: z.string().optional(),
  addonIds: z.array(z.string()).default([]),
  addons: z.object({
    esim: z.boolean().optional(),
    insurance: z.boolean().optional(),
  }).optional(),
  details: z.record(z.string(), z.any()).optional(),
  passengers: z
    .array(passengerSchema)
    .min(1, "At least one passenger is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long"),
});
export type BookingRequest = z.infer<typeof bookingSchema>;

// ─── Wallet Top-up ────────────────────────────────────────────────────────────

export const walletTopupSchema = z.object({
  amount: z
    .number()
    .min(10_000, "Minimum top-up is 10,000"),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code")
    .default("IRR"),
});
export type WalletTopup = z.infer<typeof walletTopupSchema>;

// ─── Profile Update ──────────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  name: z.string().trim().max(80).optional(),
  firstNameFa: z.string().trim().max(40).optional(),
  lastNameFa: z.string().trim().max(40).optional(),
  firstNameEn: z.string().trim().max(40).regex(/^[A-Za-z\s'-]*$/, "Only Latin characters are allowed").optional(),
  lastNameEn: z.string().trim().max(40).regex(/^[A-Za-z\s'-]*$/, "Only Latin characters are allowed").optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  phone: z.string().trim().regex(/^\+?\d{7,15}$/, "Invalid phone number").optional(),
  nationalId: z.string().trim().regex(/^\d{10}$/, "National ID must be exactly 10 digits").optional(),
  passportNo: z.string().trim().min(5, "Passport number is too short").max(20, "Passport number is too long").optional(),
  passportExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry must be YYYY-MM-DD").optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// ─── OTP Request ─────────────────────────────────────────────────────────────

export const otpRequestSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(5, "Identifier is too short")
    .max(80, "Identifier is too long"),
  channel: z.enum(["phone", "email", "telegram", "whatsapp", "wechat"]).default("phone"),
});
export type OtpRequest = z.infer<typeof otpRequestSchema>;

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchSchema = z.object({
  from: z.string().min(2, "Origin is required"),
  to: z.string().min(2, "Destination is required"),
  departDate: z.string().date("Depart date must be YYYY-MM-DD"),
  returnDate: z
    .string()
    .date("Return date must be YYYY-MM-DD")
    .optional(),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(6).default(0),
  rooms: z.number().int().min(1).max(5).default(1),
});
export type SearchParams = z.infer<typeof searchSchema>;
