/**
 * @packages/contracts
 *
 * Single source of truth for runtime boundary validation using Zod.
 * Enforces strict whitelisting to eliminate Mass Assignment vulnerabilities.
 */
import { z } from 'zod';
import {
  BOOKING_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  FULFILLMENT_STATUS_VALUES,
  TICKET_STATUS_VALUES,
} from '@packages/domain-types';

// 1. Status Schemas
export const BookingStatusSchema = z.enum(BOOKING_STATUS_VALUES);
export const PaymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);
export const FulfillmentStatusSchema = z.enum(FULFILLMENT_STATUS_VALUES);
export const TicketStatusSchema = z.enum(TICKET_STATUS_VALUES);

// 2. Currency Schema
export const SupportedCurrencySchema = z.enum(['IRR', 'TOMAN', 'USD', 'EUR', 'AED', 'CNY', 'RUB', 'OMR', 'TRY', 'GEL']);

// 3. Passenger DTO Schema
export const PassengerInputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  nationalId: z.string().regex(/^[0-9]{10}$/).optional(),
  passportNumber: z.string().min(5).max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['MALE', 'FEMALE']),
  nationality: z.string().length(2).default('IR'),
}).strict();

// 4. Booking Creation Request Schema
export const CreateBookingRequestSchema = z.object({
  tripId: z.string().optional(),
  productType: z.enum(['FLIGHT', 'HOTEL', 'TOUR', 'PACKAGE']),
  targetItemId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().positive().default(1),
  currency: SupportedCurrencySchema.default('IRR'),
  passengers: z.array(PassengerInputSchema).min(1),
  idempotencyKey: z.string().uuid(),
}).strict();

// 5. Standard API Response Contract
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId?: string;
  timestamp: string;
}

export function createSuccessResponse<T>(data: T, correlationId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(error: string, correlationId?: string): ApiResponse<never> {
  return {
    success: false,
    error,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}
