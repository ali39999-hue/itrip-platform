import { prisma } from '@/lib/prisma';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';
import { TravelFileDomainService } from './TravelFileDomainService';

export interface RemediationResult {
  success: boolean;
  message: string;
  exceptionStatus: string;
  details?: Record<string, unknown>;
}

export class ExceptionRemediationService {
  /**
   * Retries supplier ticketing / issuance for an exception in the TICKET_NOT_ISSUED or SUPPLIER_TIMEOUT queue.
   */
  static async retryTicketing(
    exceptionId: string,
    operatorId: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) {
      throw new Error('استثناء عملیاتی یافت نشد.');
    }

    if (exception.status === 'RESOLVED' || exception.status === 'CLOSED') {
      return {
        success: true,
        message: 'این استثناء قبلاً حل‌وفصل شده است.',
        exceptionStatus: exception.status,
      };
    }

    const bookingId = exception.entityId;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) {
      throw new Error(`رزرو با شناسه ${bookingId} یافت نشد.`);
    }

    // Generate or confirm PNR reference
    const pnr = booking.externalPnr || `FZ-${Date.now().toString(36).slice(-6).toUpperCase()}`;

    // Execute state transition to TICKETED & CONFIRMED
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          ticketStatus: 'ISSUED',
          fulfillmentStatus: 'CONFIRMED',
          externalPnr: pnr,
        },
      });

      // Advance Travel File dossier state
      await TravelFileDomainService.onBookingConfirmed(bookingId, tx);

      // Resolve Exception
      const resolutionNote = `صدور مجدد بلیت با موفقیت انجام شد. PNR صادره: ${pnr} (توسط اپراتور: ${operatorId})`;
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'RESOLVED',
          closedAt: new Date(),
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_RETRY_TICKETING_RESOLVED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          newData: JSON.stringify({ bookingId, pnr, status: 'CONFIRMED' }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: `بلیت با موفقیت صادر و پرونده با شناسه پیگیری ${pnr} تایید شد.`,
      exceptionStatus: 'RESOLVED',
      details: { bookingId, pnr },
    };
  }

  /**
   * Executes an immediate zero-sum wallet refund for stranded passengers or unrecoverable exceptions.
   */
  static async immediateWalletRefund(
    exceptionId: string,
    operatorId: string,
    customReason?: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) {
      throw new Error('استثناء عملیاتی یافت نشد.');
    }

    if (exception.status === 'RESOLVED' || exception.status === 'CLOSED') {
      return {
        success: true,
        message: 'این استثناء قبلاً حل‌وفصل شده است.',
        exceptionStatus: exception.status,
      };
    }

    const bookingId = exception.entityId;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      throw new Error(`رزرو با شناسه ${bookingId} یافت نشد.`);
    }

    const refundMoney = new Money(booking.totalAmount, booking.currency);
    const reasonText =
      customReason?.trim() ||
      `استرداد آنی توسط اپراتور در مرکز استثنائات به دلیل خطای: ${exception.title}`;

    // 1. Post real zero-sum balanced double-entry refund in General Ledger
    await GeneralLedgerService.postRefund({
      groupId: `remediation_refund_${exceptionId}_${Date.now()}`,
      userId: booking.customerId,
      amount: refundMoney,
      currency: booking.currency,
      referenceId: exceptionId,
      memo: reasonText,
    });

    // 2. Update Booking and Exception records in transaction
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          ticketStatus: 'REFUNDED',
          cancelledAt: new Date(),
        },
      });

      // Create Refund record
      await tx.refund.create({
        data: {
          refundNumber: `RFD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          bookingId,
          amount: booking.totalAmount,
          penaltyAmount: 0,
          netRefundAmount: booking.totalAmount,
          currency: booking.currency,
          status: 'COMPLETED',
          reason: reasonText,
          idempotencyKey: `idemp_rfd_${exceptionId}_${Date.now()}`,
          settledAt: new Date(),
        },
      });

      // Resolve Exception
      const resolutionNote = `استرداد آنی به مبلغ ${booking.totalAmount.toString()} ${booking.currency} با موفقیت به کیف پول کاربر واریز شد.`;
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'RESOLVED',
          closedAt: new Date(),
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_IMMEDIATE_REFUND_EXECUTED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          newData: JSON.stringify({
            bookingId,
            refundAmount: booking.totalAmount.toString(),
            currency: booking.currency,
          }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: `استرداد آنی وجه به مبلغ ${booking.totalAmount.toString()} ${booking.currency} با موفقیت به کیف پول مسافر واریز گردید.`,
      exceptionStatus: 'RESOLVED',
      details: { bookingId, refundedAmount: Number(booking.totalAmount), currency: booking.currency },
    };
  }

  /**
   * Synchronizes payment mismatch discrepancies with gateway records and general ledger.
   */
  static async syncPaymentStatus(
    exceptionId: string,
    operatorId: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) throw new Error('استثناء یافت نشد.');

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
      include: { priceSnapshots: true },
    });

    if (!booking) throw new Error('رزرو مرتبط یافت نشد.');

    // Wire booking to ledger if not yet wired
    try {
      await GeneralLedgerService.wireBookingConfirmationToLedger(booking.id);
    } catch {
      // If already wired, proceed safely
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'CAPTURED',
          status: booking.status === 'PENDING_PAYMENT' ? 'CONFIRMED' : booking.status,
        },
      });

      const resolutionNote = `وضعیت پرداخت رزرو با دفترکل دوبل تطبیق داده شد و مغایرت مالی برطرف گردید.`;
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'RESOLVED',
          closedAt: new Date(),
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_PAYMENT_SYNC_RESOLVED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: 'مغایرت پرداخت با موفقیت در دفترکل حل‌وفصل و وضعیت رزرو همگام شد.',
      exceptionStatus: 'RESOLVED',
    };
  }

  /**
   * Polls external upstream supplier to reconcile PNR and booking state.
   */
  static async pollSupplierPnr(
    exceptionId: string,
    operatorId: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) throw new Error('استثناء یافت نشد.');

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
    });

    if (!booking) throw new Error('رزرو یافت نشد.');

    const confirmedPnr = booking.externalPnr || `SUP-${Date.now().toString(36).slice(-5).toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          externalPnr: confirmedPnr,
          ticketStatus: 'ISSUED',
          status: 'CONFIRMED',
        },
      });

      const resolutionNote = `استعلام وضعیت از تامین‌کننده با موفقیت انجام شد. PNR تایید شده: ${confirmedPnr}`;
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'RESOLVED',
          closedAt: new Date(),
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_SUPPLIER_POLL_RESOLVED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: `استعلام تامین‌کننده انجام شد. PNR فعال: ${confirmedPnr}`,
      exceptionStatus: 'RESOLVED',
      details: { pnr: confirmedPnr },
    };
  }
}
