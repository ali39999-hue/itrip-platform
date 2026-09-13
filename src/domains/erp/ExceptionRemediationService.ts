import { prisma } from '@/lib/prisma';
import { RefundDomainService, RefundAmountInvariantViolationError } from '@/domains/refund/RefundDomainService';

export interface RemediationResult {
  success: boolean;
  message: string;
  exceptionStatus: string;
  details?: Record<string, unknown>;
}

/**
 * Operational-exception remediation actions (ops-facing, permission-gated at the
 * action layer).
 *
 * HARD RULES (production truth):
 * - No remediation path may fabricate a PNR, ticket number, supplier
 *   confirmation or payment capture. External truth must come from a wired
 *   provider; until an adapter exists, ticketing stays queued (ISSUING) and
 *   exceptions stay OPEN/IN_PROGRESS.
 * - Money-moving remediation is idempotent per exception (deterministic
 *   idempotency key) and routed through RefundDomainService so the REF-101..107
 *   invariants (refund cap, double-refund protection, inventory release) hold.
 */
export class ExceptionRemediationService {
  /**
   * Records a ticketing retry REQUEST for TICKET_NOT_ISSUED / SUPPLIER_TIMEOUT
   * exceptions. No supplier adapter is wired yet, so this can never mark a
   * ticket ISSUED — the booking stays queued (ticketStatus ISSUING) and the
   * exception moves to IN_PROGRESS awaiting a real provider attempt.
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

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
    });

    if (!booking) {
      throw new Error(`رزرو با شناسه ${exception.entityId} یافت نشد.`);
    }

    // Idempotent repeat: a retry request already recorded for this exception.
    if (exception.status === 'IN_PROGRESS') {
      return {
        success: true,
        message: 'درخواست صدور مجدد بلیت قبلاً ثبت شده و در انتظار تایید تامین‌کننده است.',
        exceptionStatus: exception.status,
      };
    }

    const previousTicketStatus = booking.ticketStatus;

    await prisma.$transaction(async (tx) => {
      // Queue the booking for issuing — never claim an issued ticket here.
      if (booking.ticketStatus === 'NOT_ISSUED') {
        await tx.booking.update({
          where: { id: booking.id },
          data: { ticketStatus: 'ISSUING' },
        });
      }

      const resolutionNote =
        'درخواست صدور مجدد بلیت ثبت شد. تا زمان اتصال آداپتور واقعی تامین‌کننده، وضعیت صدور در انتظار تایید ارائه‌دهنده باقی می‌ماند.';
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'IN_PROGRESS',
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_TICKETING_RETRY_REQUESTED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          newData: JSON.stringify({
            bookingId: booking.id,
            ticketStatusBefore: previousTicketStatus,
            ticketStatusAfter: booking.ticketStatus === 'NOT_ISSUED' ? 'ISSUING' : booking.ticketStatus,
          }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message:
        'درخواست صدور مجدد بلیت ثبت شد. تا اتصال آداپتور تامین‌کننده، صدور واقعی و شماره بلیت در انتظار تایید ارائه‌دهنده است.',
      exceptionStatus: 'IN_PROGRESS',
      details: { bookingId: booking.id },
    };
  }

  /**
   * Executes an immediate full wallet refund for stranded passengers. Routed
   * through RefundDomainService (REF-101..107) so refund-cap invariants,
   * double-refund protection, deterministic idempotency and inventory release
   * are enforced; only bookings with authoritative captured payment evidence
   * are refundable.
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

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
    });

    if (!booking) {
      throw new Error(`رزرو با شناسه ${exception.entityId} یافت نشد.`);
    }

    // Only money actually captured server-side may be refunded (§20).
    if (booking.paymentStatus !== 'CAPTURED') {
      const capturedPayment = await prisma.payment.findFirst({
        where: { bookingId: booking.id, status: 'SUCCESS' },
        select: { id: true },
      });
      if (!capturedPayment) {
        return {
          success: false,
          message:
            'هیچ تراکنش تأییدشده‌ای برای این رزرو در سیستم یافت نشد؛ استرداد بدون منبع مالی معتبر مجاز نیست.',
          exceptionStatus: exception.status,
        };
      }
    }

    const reasonText =
      customReason?.trim() ||
      `استرداد آنی توسط اپراتور در مرکز استثنائات به دلیل: ${exception.title}`;

    // Deterministic idempotency key (no timestamp): retrying a failed attempt
    // or re-clicking resolves to the SAME refund (REF-107) instead of a
    // duplicate payout.
    const idempotencyKey = `remediation_full_refund_${exceptionId}`;

    let refundResult;
    try {
      refundResult = await RefundDomainService.processRefund({
        bookingId: booking.id,
        reason: reasonText,
        idempotencyKey,
        approvedBy: operatorId,
        channel: 'WALLET',
      });
    } catch (err) {
      if (err instanceof RefundAmountInvariantViolationError) {
        return {
          success: false,
          message: `استرداد رد شد: ${err.message}`,
          exceptionStatus: exception.status,
        };
      }
      throw err;
    }

    if (!refundResult.success) {
      return {
        success: false,
        message: refundResult.error || 'استرداد انجام نشد؛ وضعیت رزرو بدون تغییر ماند.',
        exceptionStatus: exception.status,
      };
    }

    await prisma.$transaction(async (tx) => {
      const resolutionNote = `استرداد کامل به مبلغ ${booking.totalAmount.toString()} ${booking.currency} از طریق RefundDomainService (شناسه استرداد: ${refundResult.refundId}) اجرا شد.`;
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
          action: 'EXCEPTION_IMMEDIATE_REFUND_EXECUTED',
          resource: 'OperationalException',
          resourceId: exceptionId,
          newData: JSON.stringify({
            bookingId: booking.id,
            refundId: refundResult.refundId,
            refundNumber: refundResult.refundNumber,
            netRefundAmount: refundResult.netRefundAmount?.toString(),
            currency: booking.currency,
          }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: `استرداد کامل به مبلغ ${booking.totalAmount.toString()} ${booking.currency} با موفقیت ثبت و به مسیر کیف پول ارجاع شد.`,
      exceptionStatus: 'RESOLVED',
      details: {
        bookingId: booking.id,
        refundId: refundResult.refundId,
        refundNumber: refundResult.refundNumber,
      },
    };
  }

  /**
   * Aligns a booking's payment state with AUTHORITATIVE payment evidence only.
   * A booking is never flipped to captured/confirmed without a server-side
   * verified Payment row (webhook-verified SUCCESS).
   */
  static async syncPaymentStatus(
    exceptionId: string,
    operatorId: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) throw new Error('استثناء یافت نشد.');

    if (exception.status === 'RESOLVED' || exception.status === 'CLOSED') {
      return {
        success: true,
        message: 'این استثناء قبلاً حل‌وفصل شده است.',
        exceptionStatus: exception.status,
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
    });

    if (!booking) throw new Error('رزرو مرتبط یافت نشد.');

    // Authoritative evidence: a webhook-verified SUCCESS payment for this booking.
    const capturedPayment = await prisma.payment.findFirst({
      where: { bookingId: booking.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, currency: true, gatewayRef: true },
    });

    if (!capturedPayment) {
      return {
        success: false,
        message:
          'هیچ پرداخت تأییدشده‌ای (SUCCESS) از مسیر معتبر (webhook امضاشده) برای این رزرو یافت نشد؛ وضعیت مالی بدون تغییر ماند و نیازمند بررسی درگاه است.',
        exceptionStatus: exception.status,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'CAPTURED' },
      });

      const resolutionNote = `وضعیت پرداخت بر اساس شواهد معتبر درگاه همگام شد (Payment: ${capturedPayment.id}، مرجع درگاه: ${capturedPayment.gatewayRef ?? '—'}).`;
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
          newData: JSON.stringify({
            bookingId: booking.id,
            paymentId: capturedPayment.id,
            amount: capturedPayment.amount.toString(),
            currency: capturedPayment.currency,
          }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: true,
      message: 'وضعیت پرداخت رزرو با شواهد معتبر درگاه همگام شد.',
      exceptionStatus: 'RESOLVED',
      details: { paymentId: capturedPayment.id },
    };
  }

  /**
   * Requests a supplier PNR/status poll. No supplier adapter is wired yet, so
   * this performs NO state change on the booking and never fabricates a PNR —
   * it records the verification request and fails closed.
   */
  static async pollSupplierPnr(
    exceptionId: string,
    operatorId: string
  ): Promise<RemediationResult> {
    const exception = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) throw new Error('استثناء یافت نشد.');

    if (exception.status === 'RESOLVED' || exception.status === 'CLOSED') {
      return {
        success: true,
        message: 'این استثناء قبلاً حل‌وفصل شده است.',
        exceptionStatus: exception.status,
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: exception.entityId },
      select: { id: true, externalPnr: true, status: true, ticketStatus: true },
    });

    if (!booking) throw new Error('رزرو یافت نشد.');

    if (exception.status === 'IN_PROGRESS') {
      return {
        success: false,
        message:
          'آداپتور تامین‌کننده پیکربندی نشده است؛ استعلام واقعی PNR ممکن نیست و درخواست قبلی همچنان در انتظار است.',
        exceptionStatus: exception.status,
      };
    }

    await prisma.$transaction(async (tx) => {
      const resolutionNote =
        'درخواست استعلام از تامین‌کننده ثبت شد، اما هیچ آداپتور تامین‌کننده‌ای پیکربندی نشده است؛ وضعیت رزرو بدون تغییر ماند تا با شواهد واقعی ارائه‌دهنده همگام شود.';
      await tx.operationalException.update({
        where: { id: exceptionId },
        data: {
          status: 'IN_PROGRESS',
          resolution: resolutionNote,
          ownerId: operatorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'EXCEPTION_SUPPLIER_POLL_UNAVAILABLE',
          resource: 'OperationalException',
          resourceId: exceptionId,
          newData: JSON.stringify({
            bookingId: booking.id,
            externalPnrPresent: Boolean(booking.externalPnr),
          }),
          reason: resolutionNote,
        },
      });
    });

    return {
      success: false,
      message:
        'آداپتور تامین‌کننده پیکربندی نشده است؛ استعلام واقعی PNR ممکن نیست. درخواست ثبت شد و وضعیت رزرو بدون ادعای تأیید باقی ماند.',
      exceptionStatus: 'IN_PROGRESS',
      details: { bookingId: booking.id, externalPnrPresent: Boolean(booking.externalPnr) },
    };
  }
}
