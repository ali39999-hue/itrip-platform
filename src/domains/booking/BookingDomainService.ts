/**
 * Canonical Booking Domain Service (BOOK-001, MONEY-001)
 * Encapsulates price breakdowns and business validations.
 * Client-side mock booking confirmations and in-memory fund locks have been retired;
 * all bookings must be processed server-side through BookingStateMachine and BookingSagaOrchestrator.
 */

import type { Booking } from '@/lib/types';
import type { SupportedCurrency } from '../currency/CurrencyService';
import { TaxEngine } from '@/lib/finance/tax-engine';
import { prisma } from '@/lib/prisma';
import { BookingStateMachine, BookingState } from './state-machine';

export interface MoneyBreakdown {
  baseAmount: number;
  addonsAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: SupportedCurrency;
}

export interface BookingSummary {
  type: Booking['type'];
  title: string;
  subtitle: string;
  amount: number;
  currency?: SupportedCurrency;
  travelDate: string;
  meta?: Record<string, string>;
  id?: string;
}

export class BookingDomainService {
  /**
   * Calculate detailed price breakdown for a booking
   */
  static calculatePriceBreakdown(
    baseAmount: number,
    addons: { price: number }[] = [],
    discountRate: number = 0,
    currency: SupportedCurrency = 'IRR'
  ): MoneyBreakdown {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const gross = baseAmount + addonsTotal;
    const discountAmount = Math.round(gross * discountRate);
    const taxable = gross - discountAmount;

    // Use dynamic TaxEngine with Decimal arithmetic
    const taxCalc = TaxEngine.calculateTax({
      taxableAmount: taxable,
      currency,
      jurisdiction: 'IR',
      serviceType: 'GENERAL',
    });
    const taxAmount = taxCalc.taxAmount.toNumber();
    const totalAmount = taxable + taxAmount;

    return {
      baseAmount,
      addonsAmount: addonsTotal,
      taxAmount,
      discountAmount,
      totalAmount,
      currency,
    };
  }

  /**
   * Lifecycle hygiene (BOOK-002, INV-006 companion): abandon bookings that are
   * still awaiting payment long after their hold died. A HELD/PENDING_PAYMENT
   * booking older than the cutoff with no successful payment is dead weight —
   * it pollutes ops queues and its payment window no longer matches reality
   * (inventory was already released by the hold sweeper). Transitions are
   * asserted through the state machine; never touches confirmed/paid bookings.
   */
  static async expireStaleBookings(maxAgeMinutes: number = 30, take: number = 200): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const stale = await prisma.booking.findMany({
      where: {
        status: { in: ['HELD', 'PENDING_PAYMENT'] },
        createdAt: { lt: cutoff },
      },
      select: { id: true, status: true },
      take,
      orderBy: { createdAt: 'asc' },
    });

    let expired = 0;
    for (const booking of stale) {
      // Guard against any race with a payment that just landed.
      const successfulPayment = await prisma.payment.findFirst({
        where: { bookingId: booking.id, status: 'SUCCESS' },
        select: { id: true },
      });
      if (successfulPayment) continue;

      BookingStateMachine.assertTransition(booking.status as BookingState, 'EXPIRED');

      // The conditional update is the real race guard: if a saga moved the
      // booking on between the read and this write, count===0 and we skip —
      // the history row is only written for an actual transition.
      const outcome = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.updateMany({
          where: { id: booking.id, status: { in: ['HELD', 'PENDING_PAYMENT'] } },
          data: { status: 'EXPIRED' },
        });
        if (updated.count === 0) return false;
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: 'EXPIRED',
            actor: 'LIFECYCLE_SWEEPER',
            reason: `Abandoned in ${booking.status} beyond ${maxAgeMinutes}m TTL — hold no longer active`,
            correlationId: `corr_exp_${booking.id}`,
          },
        });
        return true;
      });

      if (outcome) expired++;
    }

    return expired;
  }
}
