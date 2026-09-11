/**
 * Hotel Rate Plan & Occupancy Pricing Engine.
 * Adapted from Kamra PMS / QloApps hospitality models.
 */

export type RatePlanCode = 'ROOM_ONLY' | 'BREAKFAST_INCLUDED' | 'FLEXIBLE_CANCEL' | 'NON_REFUNDABLE';

export interface RatePlanOption {
  code: RatePlanCode;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
  priceMultiplier: number; // e.g. 1.0, 1.10, 1.15, 0.92
  isRefundable: boolean;
  includesBreakfast: boolean;
  cancellationHoursBefore: number; // e.g. 24 or 0 (non-ref)
}

export const STANDARD_RATE_PLANS: Record<RatePlanCode, RatePlanOption> = {
  ROOM_ONLY: {
    code: 'ROOM_ONLY',
    name: { fa: 'اقامت بدون صبحانه', en: 'Room Only' },
    description: {
      fa: 'اقامت در اتاق استاندارد با قوانین کنسلی استاندارد هتل',
      en: 'Standard room stay with hotel regular cancellation policy',
    },
    priceMultiplier: 1.0,
    isRefundable: true,
    includesBreakfast: false,
    cancellationHoursBefore: 48,
  },
  BREAKFAST_INCLUDED: {
    code: 'BREAKFAST_INCLUDED',
    name: { fa: 'همراه با بوفه صبحانه', en: 'Breakfast Included' },
    description: {
      fa: 'شامل بوفه صبحانه کامل روزانه برای تمام مسافران اتاق',
      en: 'Includes daily full buffet breakfast for all registered room guests',
    },
    priceMultiplier: 1.1,
    isRefundable: true,
    includesBreakfast: true,
    cancellationHoursBefore: 48,
  },
  FLEXIBLE_CANCEL: {
    code: 'FLEXIBLE_CANCEL',
    name: { fa: 'کنسلی رایگان منعطف', en: 'Flexible Free Cancellation' },
    description: {
      fa: 'امکان لغو رایگان بدون جریمه تا ۲۴ ساعت قبل از تاریخ تحویل اتاق',
      en: 'Zero-fee cancellation up to 24 hours prior to check-in date',
    },
    priceMultiplier: 1.15,
    isRefundable: true,
    includesBreakfast: true,
    cancellationHoursBefore: 24,
  },
  NON_REFUNDABLE: {
    code: 'NON_REFUNDABLE',
    name: { fa: 'تخفیف ویژه غیرقابل استرداد', en: 'Special Non-Refundable' },
    description: {
      fa: 'تخفیف ۸ درصدی در ازای عدم امکان استرداد وجه پس از خرید',
      en: '8% instant discount in exchange for strict non-refundable terms',
    },
    priceMultiplier: 0.92,
    isRefundable: false,
    includesBreakfast: false,
    cancellationHoursBefore: 0,
  },
};

export class HotelRatePlanService {
  /**
   * Computes the final rate based on basePrice, nights, rooms, and selected rate plan
   */
  static calculateRate(params: {
    basePricePerNight: number;
    nights: number;
    rooms: number;
    ratePlanCode?: RatePlanCode;
  }): {
    plan: RatePlanOption;
    unitPricePerNight: number;
    totalAmount: number;
    savingsOrSurcharge: number;
  } {
    const plan = STANDARD_RATE_PLANS[params.ratePlanCode || 'BREAKFAST_INCLUDED'];
    const nights = Math.max(1, params.nights);
    const rooms = Math.max(1, params.rooms);

    const unitPrice = Math.round(params.basePricePerNight * plan.priceMultiplier);
    const totalAmount = unitPrice * nights * rooms;
    const baseTotal = params.basePricePerNight * nights * rooms;
    const diff = totalAmount - baseTotal;

    return {
      plan,
      unitPricePerNight: unitPrice,
      totalAmount,
      savingsOrSurcharge: diff,
    };
  }
}
