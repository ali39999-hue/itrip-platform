/**
 * Zod validation schemas for Firuzo/Firuzo travel platform.
 *
 * These schemas validate API request bodies and are the single source
 * of truth for the allowed values of string fields in the PostgreSQL schema.
 */

import { z } from "zod";
import { isValidPassportNo, normalizePassportNo } from "@/lib/passport-format";

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
  "CIP",
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
    CIP: "CIP",
    CIPS: "CIP",
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
    .transform((v) => normalizePassportNo(v))
    // Domestic (Iran) bookings identify passengers by national ID instead of a
    // passport — an empty number is accepted there; a provided one must still
    // be well-formed. The passport-OR-nationalId KYC rule is enforced on top.
    .refine((v) => v.length === 0 || v.length >= 6, "Passport number is too short")
    .refine((v) => v.length === 0 || isValidPassportNo(v), "Passport number format is invalid"),
  passportExpiryDate: z
    .string()
    .optional()
    .or(z.literal("")),
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

/**
 * Domestic (Iran) tour passengers: the national ID (کد ملی) is the identity
 * document — passport fields are not collected and must not block validation.
 */
export const domesticPassengerSchema = passengerSchema.extend({
  nationalId: z
    .string()
    .regex(/^\d{10}$/, "National ID must be exactly 10 digits"),
  passportNo: z.string().optional(),
  passportExpiryDate: z.string().optional(),
});

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
  // Aligned with referralCodeSchema: codes are created 3-20 chars,
  // [A-Za-z0-9_-] only. Anything else can never be VALID — reject early so
  // checkout and admin agree on what a code looks like.
  referralCode: z
    .string()
    .trim()
    .min(3, 'Referral code is too short')
    .max(20, 'Referral code is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Referral code has invalid characters')
    .optional(),
  // Client-generated key (e.g. one per checkout session). Replay with the same
  // key returns the original draft instead of creating a duplicate (BUG-003).
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
  source: z.string().optional(),
});
export type BookingRequest = z.infer<typeof bookingSchema>;

export const referralCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, hyphens and underscores"),
  leaderId: z.string().min(1, "Leader ID is required"),
  customTierConfig: z.string().nullable().optional(),
});
export type ReferralCodeInput = z.infer<typeof referralCodeSchema>;

// ─── Per-code referral overrides (stored as JSON in ReferralCode.customTierConfig) ──
// Everything optional: absent keys inherit the global REFERRAL_CONFIG.
export const referralTierOverrideSchema = z.object({
  minPax: z.number().int().min(1, 'Tier min pax must be at least 1'),
  maxPax: z.number().int().min(1, 'Tier max pax must be at least 1').nullable(),
  rewardPercent: z.number().min(0, 'Reward percent cannot be negative').max(1, 'Reward percent cannot exceed 100%'),
}).refine((t) => t.maxPax === null || t.maxPax >= t.minPax, {
  message: 'Tier max pax must be open-ended or >= min pax',
});

export const referralCodeConfigSchema = z.object({
  discountPercent: z.number().min(0, 'Discount cannot be negative').max(1, 'Discount cannot exceed 100%').optional(),
  maxDiscountCapIrr: z.number().int().min(0, 'Cap cannot be negative').nullable().optional(),
  maxUses: z.number().int().min(1, 'Max uses must be at least 1').nullable().optional(),
  tiers: z.array(referralTierOverrideSchema).min(1).max(10).optional(),
});
export type ReferralCodeConfig = z.infer<typeof referralCodeConfigSchema>;

export const updateReferralCodeSchema = z.object({
  id: z.string().min(1, 'Referral code ID is required'),
  isActive: z.boolean().optional(),
  leaderId: z.string().min(1).optional(),
  customTierConfig: z.string().nullable().optional(),
});
export type UpdateReferralCodeInput = z.infer<typeof updateReferralCodeSchema>;

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
  channel: z.enum(["phone", "email", "telegram", "whatsapp", "wechat", "bale"]).default("phone"),
});
export type OtpRequest = z.infer<typeof otpRequestSchema>;

// ─── Email Password Auth (login / registration on the email channel) ─────────

export const emailAuthSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});
export type EmailAuthInput = z.infer<typeof emailAuthSchema>;

export const emailRegisterSchema = emailAuthSchema.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/, "Username may only contain Latin letters, numbers, dots, hyphens and underscores"),
});
export type EmailRegisterInput = z.infer<typeof emailRegisterSchema>;

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

// ─── CMS (tours / experiences / travelogues / guides) ────────────────────────
// NOTE: these schemas live here (plain lib module) instead of
// `src/actions/content.ts` because a `"use server"` file may only export
// async functions — exporting zod objects from there breaks every importer
// with `invalid-use-server-value` (500 on /admin/content).

export const tourInputSchema = z.object({
  title: z.string().trim().min(2, 'عنوان تور باید حداقل ۲ کاراکتر باشد').max(200),
  titleEn: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, 'نام شهر الزامی است').max(100),
  cityEn: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  countryEn: z.string().trim().max(100).optional(),
  durationDays: z.coerce.number().int().min(1, 'مدت تور باید حداقل ۱ روز باشد').max(90).optional(),
  durationNights: z.coerce.number().int().min(0).max(90).optional(),
  currency: z.string().trim().max(10).optional(),
  price: z.coerce.number().min(0, 'قیمت نمی‌تواند منفی باشد'),
  childPrice: z.coerce.number().min(0).nullable().optional(),
  originalPrice: z.coerce.number().min(0).nullable().optional(),
  discountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  category: z.string().trim().max(50).optional(),
  heroImage: z.string().trim().nullable().optional().or(z.literal('')),
  gallery: z.array(z.string().trim()).optional(),
  summary: z.string().trim().max(1000).optional(),
  summaryEn: z.string().trim().max(1000).optional(),
  description: z.string().trim().max(10000).nullable().optional().or(z.literal('')),
  descriptionEn: z.string().trim().max(10000).optional(),
  highlights: z.array(z.string().trim()).optional(),
  includes: z.array(z.string().trim()).optional(),
  excludes: z.array(z.string().trim()).optional(),
  hotelName: z.string().trim().max(150).nullable().optional().or(z.literal('')),
  hotelStars: z.coerce.number().int().min(1).max(5).optional(),
  transportType: z.string().trim().max(100).nullable().optional().or(z.literal('')),
  transportTypeEn: z.string().trim().max(100).optional(),
  groupSize: z.string().trim().max(100).optional(),
  guideLanguages: z.array(z.string().trim()).optional(),
  isPublished: z.boolean().optional(),
  departureDates: z.array(z.any()).optional(),
  itineraryDays: z.array(z.any()).optional(),
});

export const tourUpdateSchema = tourInputSchema.partial();

export const experienceInputSchema = z.object({
  countryId: z.string().trim().default('iran').optional(),
  category: z.string().trim().default('cultural').optional(),
  title: z.string().trim().min(2, 'عنوان تجربه باید حداقل ۲ کاراکتر باشد'),
  titleEn: z.string().trim().optional(),
  desc: z.string().trim().min(2, 'توضیحات تجربه الزامی است'),
  descEn: z.string().trim().optional(),
  where: z.string().trim().default('ایران').optional(),
  whereEn: z.string().trim().optional(),
  when: z.string().trim().default('تمام ایام سال').optional(),
  whenEn: z.string().trim().optional(),
  fromPrice: z.coerce.number().min(0).default(0),
  image: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const experienceUpdateSchema = experienceInputSchema.partial();

const travelogueRawObject = z.object({
  title: z.string().trim().optional(),
  titleFa: z.string().trim().optional(),
  titleEn: z.string().trim().optional(),
  destFa: z.string().trim().optional(),
  city: z.string().trim().optional(),
  cityEn: z.string().trim().optional(),
  userName: z.string().trim().optional(),
  author: z.string().trim().optional(),
  authorEn: z.string().trim().optional(),
  authorAvatar: z.string().trim().nullable().optional(),
  country: z.string().trim().optional(),
  countryId: z.string().trim().optional(),
  countryEn: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  summaryEn: z.string().trim().optional(),
  contentFa: z.string().trim().optional(),
  content: z.string().trim().optional(),
  contentEn: z.string().trim().optional(),
  image: z.string().trim().nullable().optional(),
  coverImage: z.string().trim().nullable().optional(),
  readTime: z.string().trim().optional(),
  likesCount: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const travelogueInputSchema = travelogueRawObject.refine((d) => Boolean(d.title || d.titleFa), {
  message: 'عنوان سفرنامه الزامی است',
  path: ['titleFa'],
});

export const travelogueUpdateSchema = travelogueRawObject.partial();

const guideRawObject = z.object({
  title: z.string().trim().optional(),
  titleFa: z.string().trim().optional(),
  titleEn: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categoryFa: z.string().trim().optional(),
  categoryEn: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  countryId: z.string().trim().optional(),
  readTime: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  summaryEn: z.string().trim().optional(),
  excerptFa: z.string().trim().optional(),
  excerptEn: z.string().trim().optional(),
  content: z.string().trim().optional(),
  contentEn: z.string().trim().optional(),
  bodyFa: z.string().trim().optional(),
  bodyEn: z.string().trim().optional(),
  image: z.string().trim().nullable().optional(),
  coverImage: z.string().trim().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const guideInputSchema = guideRawObject.refine((d) => Boolean(d.title || d.titleFa), {
  message: 'عنوان راهنما الزامی است',
  path: ['titleFa'],
});

export const guideUpdateSchema = guideRawObject.partial();

// ─── CIP (Commercial Important Person) Airport Services ───────────────────────

export const FlightDirection = z.enum(["DEPARTURE", "ARRIVAL", "TRANSIT"]);
export type FlightDirection = z.infer<typeof FlightDirection>;

export const CipSuiteType = z.enum(["NONE", "6_HOURS", "10_HOURS", "OVERNIGHT"]);
export type CipSuiteType = z.infer<typeof CipSuiteType>;

export const cipBookingSchema = z.object({
  airportCode: z.string().trim().min(3).max(4),
  flightDirection: FlightDirection.default("DEPARTURE"),
  airline: z.string().trim().min(2, "Airline name is required"),
  flightNumber: z.string().trim().min(2, "Flight number is required"),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid flight date (must be YYYY-MM-DD)"),
  flightTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid flight time (must be HH:MM)"),
  originCity: z.string().trim().optional(),
  destinationCity: z.string().trim().optional(),
  adults: z.coerce.number().int().min(1, "At least one adult passenger is required").max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
  infants: z.coerce.number().int().min(0).max(10).default(0),
  accompanyingGuests: z.coerce.number().int().min(0).max(20).default(0),
  petCount: z.coerce.number().int().min(0).max(5).default(0),
  wheelchairCount: z.coerce.number().int().min(0).max(10).default(0),
  suiteType: CipSuiteType.default("NONE"),
  transferVehicle: z.string().trim().optional().default("NONE"),
  transferAddress: z.string().trim().optional(),
  contactName: z.string().trim().min(2, "Contact name is required"),
  contactPhone: z.string().trim().min(10, "Contact phone is required"),
  contactEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  specialRequests: z.string().trim().max(500).optional(),
});
export type CipBookingInput = z.infer<typeof cipBookingSchema>;

