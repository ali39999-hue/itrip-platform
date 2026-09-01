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
    .regex(/^\d{10}$/, "National ID must be exactly 10 digits"),
  passportNo: z
    .string()
    .min(5, "Passport number is too short")
    .max(20, "Passport number is too long")
    .optional(),
  birthDate: z
    .string()
    .date("Birth date must be a valid YYYY-MM-DD string"),
  gender: Gender,
});
export type Passenger = z.infer<typeof passengerSchema>;

// ─── Booking Request ──────────────────────────────────────────────────────────

export const bookingSchema = z.object({
  type: BookingType,
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
