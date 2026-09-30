import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export enum ExceptionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ReconciliationFindingResult {
  findingType:
    | 'PAYMENT_AMOUNT_MISMATCH'
    | 'PAYMENT_BOOKING_STATUS_MISMATCH'
    | 'REFUND_TOTAL_EXCEEDS_PAYMENT'
    | 'WEBHOOK_UNPROCESSED';
  severity: ExceptionSeverity;
  entityType: string;
  entityId: string;
  description: string;
  slaMinutes: number;
}

/**
 * Detects discrepancies between PaymentIntent amount and Booking totalAmount.
 * Pure detector function adapted from aroux30/site audit reconciliation scanner.
 */
export function detectPaymentAmountMismatch(
  payment: { id: string; amount: string | number | Prisma.Decimal; currency: string; bookingId?: string | null },
  booking: { id: string; totalAmount: string | number | Prisma.Decimal; currency: string }
): ReconciliationFindingResult | null {
  const payMoney = new Money(payment.amount.toString(), payment.currency);
  const bookMoney = new Money(booking.totalAmount.toString(), booking.currency);

  if (payMoney.currency !== bookMoney.currency || !payMoney.equals(bookMoney)) {
    return {
      findingType: 'PAYMENT_AMOUNT_MISMATCH',
      severity: ExceptionSeverity.HIGH,
      entityType: 'PaymentIntent',
      entityId: payment.id,
      description: `PaymentIntent ${payment.id} amount (${payMoney.toString()} ${payMoney.currency}) mismatches Booking ${booking.id} total (${bookMoney.toString()} ${bookMoney.currency}).`,
      slaMinutes: 120,
    };
  }
  return null;
}

/**
 * Detects when a PaymentIntent is CAPTURED or SUCCEEDED, but the Booking is stuck in PENDING, DRAFT, or UNPAID.
 * Pure detector function adapted from aroux30/site audit reconciliation scanner.
 */
export function detectPaymentBookingStatusMismatch(
  payment: { id: string; status: string; bookingId?: string | null },
  booking: { id: string; status: string }
): ReconciliationFindingResult | null {
  const isPaymentSettled = payment.status === 'CAPTURED' || payment.status === 'SUCCEEDED';
  const isBookingUnconfirmed = ['PENDING', 'DRAFT', 'UNPAID'].includes(booking.status.toUpperCase());

  if (isPaymentSettled && isBookingUnconfirmed) {
    return {
      findingType: 'PAYMENT_BOOKING_STATUS_MISMATCH',
      severity: ExceptionSeverity.CRITICAL,
      entityType: 'Booking',
      entityId: booking.id,
      description: `PaymentIntent ${payment.id} is ${payment.status}, but Booking ${booking.id} remains in ${booking.status} state. Immediate confirmation required.`,
      slaMinutes: 60,
    };
  }
  return null;
}

/**
 * Detects if the total committed/settled refunds for a booking exceed the total captured payment amount.
 * Pure detector function adapted from aroux30/site audit reconciliation scanner.
 */
export function detectRefundTotalExceedsPayment(
  payment: { id: string; amount: string | number | Prisma.Decimal; currency: string; bookingId?: string | null },
  refunds: Array<{ id: string; amount: string | number | Prisma.Decimal; status: string }>
): ReconciliationFindingResult | null {
  const activeStatuses = ['APPROVED', 'SETTLED', 'COMPLETED'];
  const eligibleRefunds = refunds.filter((r) => activeStatuses.includes(r.status.toUpperCase()));
  if (eligibleRefunds.length === 0) return null;

  const totalRefunded = eligibleRefunds.reduce((acc, r) => {
    return acc.add(new Prisma.Decimal(r.amount.toString()));
  }, new Prisma.Decimal(0));

  const paymentAmount = new Prisma.Decimal(payment.amount.toString());

  if (totalRefunded.gt(paymentAmount)) {
    return {
      findingType: 'REFUND_TOTAL_EXCEEDS_PAYMENT',
      severity: ExceptionSeverity.CRITICAL,
      entityType: 'PaymentIntent',
      entityId: payment.id,
      description: `Committed refunds total (${totalRefunded.toString()} ${payment.currency}) exceeds captured PaymentIntent ${payment.id} amount (${paymentAmount.toString()} ${payment.currency}). Potential double-refund or overpayment hazard.`,
      slaMinutes: 30,
    };
  }
  return null;
}

/**
 * Detects webhook events that have remained in RECEIVED or VERIFIED state without PROCESSED past grace period.
 * Pure detector function adapted from aroux30/site audit reconciliation scanner.
 */
export function detectUnprocessedWebhooks(
  webhooks: Array<{ id: string; status: string; createdAt: Date; gatewayName?: string; eventId?: string }>,
  graceMinutes: number = 60,
  referenceTime: Date = new Date()
): ReconciliationFindingResult[] {
  const findings: ReconciliationFindingResult[] = [];
  const cutoff = new Date(referenceTime.getTime() - graceMinutes * 60 * 1000);

  for (const wh of webhooks) {
    const st = wh.status.toUpperCase();
    if (st !== 'PROCESSED' && st !== 'DUPLICATE' && st !== 'REJECTED') {
      if (new Date(wh.createdAt) < cutoff) {
        findings.push({
          findingType: 'WEBHOOK_UNPROCESSED',
          severity: ExceptionSeverity.MEDIUM,
          entityType: 'WebhookEvent',
          entityId: wh.id,
          description: `WebhookEvent ${wh.id} (${wh.gatewayName || 'UNKNOWN'}:${wh.eventId || 'NO_EVENT_ID'}) in status ${wh.status} created at ${new Date(wh.createdAt).toISOString()} has exceeded grace period (${graceMinutes}m).`,
          slaMinutes: 240,
        });
      }
    }
  }
  return findings;
}

export class OperationalExceptionService {
  /**
   * Registers an actionable operational exception with SLA and entity tracing (OPS-001).
   * ERP-009 dedupe: repeated detections of the same (type, entityType, entityId)
   * collapse onto the still-open exception — the description is refreshed and the
   * SLA re-armed instead of flooding the Exception Center with duplicates.
   */
  static async raiseException(params: {
    type: string;
    severity: ExceptionSeverity;
    entityType: string;
    entityId: string;
    title?: string;
    organizationId?: string;
    description: string;
    slaMinutes?: number;
  }): Promise<string> {
    const openStatuses = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'];
    const existing = await prisma.operationalException.findFirst({
      where: {
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        status: { in: openStatuses },
      },
      orderBy: { detectedAt: 'desc' },
    });

    if (existing) {
      await prisma.operationalException.update({
        where: { id: existing.id },
        data: {
          description: params.description,
          severity: params.severity,
          slaDueAt: new Date(Date.now() + (params.slaMinutes ?? 240) * 60 * 1000),
        },
      });
      return existing.id;
    }

    const slaDueAt = new Date(Date.now() + (params.slaMinutes ?? 240) * 60 * 1000);

    const record = await prisma.operationalException.create({
      data: {
        type: params.type,
        severity: params.severity,
        entityType: params.entityType,
        entityId: params.entityId,
        ownerId: params.organizationId,
        title: params.title || `Discrepancy: ${params.type} on ${params.entityType} ${params.entityId}`,
        description: params.description,
        status: 'OPEN',
        slaDueAt,
      },
    });

    return record.id;
  }

  /**
   * Resolve an open exception with resolution notes
   */
  static async resolveException(exceptionId: string, resolutionNotes: string): Promise<void> {
    await prisma.operationalException.update({
      where: { id: exceptionId },
      data: {
        status: 'RESOLVED',
        resolution: resolutionNotes,
        closedAt: new Date(),
      },
    });
  }
}

export class FinancialReconciliationEngine {
  /**
   * Three-way reconciliation between Bank Settlement Statement, PaymentIntent, and General Ledger (Section 27)
   */
  static async reconcilePaymentWithStatement(params: {
    paymentIntentId: string;
    bankStatementAmount: Money;
    bankReference: string;
    organizationId?: string;
  }): Promise<{ status: 'MATCHED' | 'DISCREPANCY'; discrepancyAmount?: Money; exceptionId?: string }> {
    const payment = await prisma.paymentIntent.findUnique({
      where: { id: params.paymentIntentId },
    });

    if (!payment) {
      throw new Error(`RECON_ERROR: PaymentIntent ${params.paymentIntentId} not found`);
    }

    const recordedMoney = new Money(payment.amount.toString(), payment.currency);

    if (!recordedMoney.equals(params.bankStatementAmount)) {
      const discrepancy = recordedMoney.sub(params.bankStatementAmount);

      // Automatically raise exception in Exception Center (RECON-003, Section 27)
      const exceptionId = await OperationalExceptionService.raiseException({
        type: 'PAYMENT_RECONCILIATION_MISMATCH',
        severity: ExceptionSeverity.HIGH,
        entityType: 'PaymentIntent',
        entityId: params.paymentIntentId,
        organizationId: params.organizationId,
        description: `Bank statement reported ${params.bankStatementAmount.toString()} ${params.bankStatementAmount.currency} vs DB ${recordedMoney.toString()} ${recordedMoney.currency}. Bank Ref: ${params.bankReference}`,
        slaMinutes: 120, // 2-hour SLA for financial mismatches
      });

      return { status: 'DISCREPANCY', discrepancyAmount: discrepancy, exceptionId };
    }

    return { status: 'MATCHED' };
  }

  /**
   * Automated read-only reconciliation scanner (adapted from aroux30/site audit bounded context).
   * Sweeps payments, bookings, refunds, and webhooks to detect operational and financial anomalies,
   * filing actionable deduplicated records in the Exception Center without mutating source transaction data.
   */
  static async scanOperationalDiscrepancies(options?: {
    scanLimit?: number;
    graceMinutes?: number;
  }): Promise<{ findingsCount: number; exceptionIds: string[] }> {
    const limit = options?.scanLimit ?? 200;
    const graceMinutes = options?.graceMinutes ?? 60;
    const exceptionIds: string[] = [];

    // 1. Scan recent payments with their bookings
    const payments = await prisma.paymentIntent.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        status: { in: ['CAPTURED', 'INITIATED', 'PARTIALLY_REFUNDED', 'REFUNDED'] },
      },
    });

    const bookingIds = [...new Set(payments.map((p) => p.bookingId).filter(Boolean))];
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, totalAmount: true, currency: true, status: true, organizationId: true },
    });
    const bookingMap = new Map(bookings.map((b) => [b.id, b]));

    // 2. Scan refunds associated with these bookings
    const refunds = await prisma.refund.findMany({
      where: { bookingId: { in: bookingIds } },
      select: { id: true, bookingId: true, amount: true, status: true },
    });
    const refundsByBooking = new Map<string, typeof refunds>();
    for (const r of refunds) {
      const list = refundsByBooking.get(r.bookingId) || [];
      list.push(r);
      refundsByBooking.set(r.bookingId, list);
    }

    // Run detectors
    for (const p of payments) {
      const bkg = bookingMap.get(p.bookingId);
      if (bkg) {
        if (p.status === 'CAPTURED') {
          const amtMismatch = detectPaymentAmountMismatch(p, bkg);
          if (amtMismatch) {
            const exId = await OperationalExceptionService.raiseException({
              type: amtMismatch.findingType,
              severity: amtMismatch.severity,
              entityType: amtMismatch.entityType,
              entityId: amtMismatch.entityId,
              organizationId: bkg.organizationId || undefined,
              description: amtMismatch.description,
              slaMinutes: amtMismatch.slaMinutes,
            });
            exceptionIds.push(exId);
          }

          const statusMismatch = detectPaymentBookingStatusMismatch(p, bkg);
          if (statusMismatch) {
            const exId = await OperationalExceptionService.raiseException({
              type: statusMismatch.findingType,
              severity: statusMismatch.severity,
              entityType: statusMismatch.entityType,
              entityId: statusMismatch.entityId,
              organizationId: bkg.organizationId || undefined,
              description: statusMismatch.description,
              slaMinutes: statusMismatch.slaMinutes,
            });
            exceptionIds.push(exId);
          }
        }

        const bkgRefunds = refundsByBooking.get(p.bookingId) || [];
        const refundExcess = detectRefundTotalExceedsPayment(p, bkgRefunds);
        if (refundExcess) {
          const exId = await OperationalExceptionService.raiseException({
            type: refundExcess.findingType,
            severity: refundExcess.severity,
            entityType: refundExcess.entityType,
            entityId: refundExcess.entityId,
            organizationId: bkg.organizationId || undefined,
            description: refundExcess.description,
            slaMinutes: refundExcess.slaMinutes,
          });
          exceptionIds.push(exId);
        }
      }
    }

    // 3. Scan pending/unprocessed webhook events
    const webhooks = await prisma.webhookEvent.findMany({
      take: limit,
      where: { status: { in: ['RECEIVED', 'VERIFIED'] } },
      select: { id: true, status: true, createdAt: true, gatewayName: true, eventId: true },
      orderBy: { createdAt: 'asc' },
    });

    const stuckWebhooks = detectUnprocessedWebhooks(webhooks, graceMinutes);
    for (const stuck of stuckWebhooks) {
      const exId = await OperationalExceptionService.raiseException({
        type: stuck.findingType,
        severity: stuck.severity,
        entityType: stuck.entityType,
        entityId: stuck.entityId,
        description: stuck.description,
        slaMinutes: stuck.slaMinutes,
      });
      exceptionIds.push(exId);
    }

    return { findingsCount: exceptionIds.length, exceptionIds };
  }
}
