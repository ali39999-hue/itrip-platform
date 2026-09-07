import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';
import { Prisma } from '@prisma/client';

export type PaymentDiscrepancyType =
  | 'AMOUNT_MISMATCH'
  | 'ORPHANED_PAYMENT'
  | 'UNRESOLVED_GATEWAY_TIMEOUT'
  | 'LEDGER_MISSING'
  | 'GATEWAY_TRANSACTION_MISSING'
  | 'CURRENCY_MISMATCH';

export interface PaymentDiscrepancy {
  type: PaymentDiscrepancyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  paymentId?: string;
  paymentIntentId?: string;
  bookingId?: string;
  gatewayRef?: string;
  expectedAmount?: Money;
  actualAmount?: Money;
  description: string;
}

export interface PaymentReconciliationSummary {
  totalPaymentsCount: number;
  totalPaymentsAmount: Money;
  totalCapturedCount: number;
  totalCapturedAmount: Money;
  totalLedgerPostingsCount: number;
  totalLedgerAmount: Money;
  matchedCount: number;
  discrepancyCount: number;
  unresolvedTimeoutCount: number;
  isFullyBalanced: boolean;
}

export interface PaymentReconciliationReport {
  reportId: string;
  generatedAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
  currency: string;
  summary: PaymentReconciliationSummary;
  discrepancies: PaymentDiscrepancy[];
}

export interface ReconciliationFilterOptions {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
}

/**
 * Payment Reconciliation Report Service (PAY-110)
 * Reconciles Gateway Transactions, Payments, PaymentIntents, and Ledger Entries.
 */
export class PaymentReconciliationReportService {
  static async generateReport(options?: ReconciliationFilterOptions): Promise<PaymentReconciliationReport> {
    const currency = (options?.currency || 'IRR').toUpperCase();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (options?.startDate) dateFilter.gte = options.startDate;
    if (options?.endDate) dateFilter.lte = options.endDate;

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 1. Fetch payments in scope
    const payments = await prisma.payment.findMany({
      where: {
        currency,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        paymentIntent: {
          include: {
            attempts: {
              include: {
                transactions: true,
              },
            },
          },
        },
      },
    });

    // 2. Fetch ledger entries for booking payments
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        currency,
        referenceType: { in: ['BOOKING', 'TOPUP'] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const discrepancies: PaymentDiscrepancy[] = [];
    let totalPaymentsAmount = Money.zero(currency);
    let totalCapturedAmount = Money.zero(currency);
    let totalCapturedCount = 0;
    let unresolvedTimeoutCount = 0;

    // Index ledger entries by referenceId
    const ledgerByRef = new Map<string, Prisma.Decimal>();
    for (const entry of ledgerEntries) {
      if (entry.referenceId) {
        const current = ledgerByRef.get(entry.referenceId) || new Prisma.Decimal(0);
        ledgerByRef.set(entry.referenceId, current.add(entry.amount));
      }
    }

    for (const p of payments) {
      const paymentMoney = new Money(p.amount.toString(), p.currency);
      totalPaymentsAmount = totalPaymentsAmount.add(paymentMoney);

      if (p.status === 'SUCCESS' || p.status === 'CAPTURED') {
        totalCapturedCount++;
        totalCapturedAmount = totalCapturedAmount.add(paymentMoney);
      }

      // Check for orphan payment (no bookingId and no paymentIntent)
      if (!p.bookingId && !p.paymentIntentId) {
        discrepancies.push({
          type: 'ORPHANED_PAYMENT',
          severity: 'HIGH',
          paymentId: p.id,
          gatewayRef: p.gatewayRef || undefined,
          description: `Payment ${p.id} has no associated bookingId or paymentIntentId`,
        });
      }

      // Check gateway transactions for this payment intent
      if (p.paymentIntent) {
        const intentMoney = new Money(p.paymentIntent.amount.toString(), p.paymentIntent.currency);
        if (!paymentMoney.equals(intentMoney)) {
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            severity: 'CRITICAL',
            paymentId: p.id,
            paymentIntentId: p.paymentIntent.id,
            bookingId: p.bookingId || undefined,
            expectedAmount: intentMoney,
            actualAmount: paymentMoney,
            description: `Payment amount (${paymentMoney.toString()}) does not match PaymentIntent amount (${intentMoney.toString()})`,
          });
        }

        // Check for unresolved timeout / unknown transactions
        for (const attempt of p.paymentIntent.attempts) {
          if (attempt.status === 'PENDING_CUSTOMER' || attempt.status === 'PENDING') {
            const ageMs = Date.now() - new Date(attempt.createdAt).getTime();
            // Stale attempt older than 30 minutes
            if (ageMs > 30 * 60 * 1000) {
              unresolvedTimeoutCount++;
              discrepancies.push({
                type: 'UNRESOLVED_GATEWAY_TIMEOUT',
                severity: 'MEDIUM',
                paymentId: p.id,
                paymentIntentId: p.paymentIntent.id,
                bookingId: p.bookingId || undefined,
                gatewayRef: attempt.gatewayRef || undefined,
                description: `PaymentAttempt ${attempt.id} has been pending for over 30 minutes without resolution`,
              });
            }
          }
        }
      }

      // Check ledger synchronization for successful payments
      if (p.status === 'SUCCESS' || p.status === 'CAPTURED') {
        const bookingId = p.bookingId;
        if (bookingId) {
          const ledgerTotal = ledgerByRef.get(bookingId);
          if (!ledgerTotal || ledgerTotal.isZero()) {
            discrepancies.push({
              type: 'LEDGER_MISSING',
              severity: 'HIGH',
              paymentId: p.id,
              bookingId,
              expectedAmount: paymentMoney,
              description: `Payment ${p.id} is captured but has no corresponding LedgerEntry for booking ${bookingId}`,
            });
          }
        }
      }
    }

    let totalLedgerAmount = Money.zero(currency);
    for (const le of ledgerEntries) {
      if (le.direction === 'CREDIT') {
        totalLedgerAmount = totalLedgerAmount.add(new Money(le.amount.toString(), le.currency));
      }
    }

    const matchedCount = Math.max(0, totalCapturedCount - discrepancies.length);

    return {
      reportId: `pkr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      generatedAt: new Date(),
      periodStart: options?.startDate,
      periodEnd: options?.endDate,
      currency,
      summary: {
        totalPaymentsCount: payments.length,
        totalPaymentsAmount,
        totalCapturedCount,
        totalCapturedAmount,
        totalLedgerPostingsCount: ledgerEntries.length,
        totalLedgerAmount,
        matchedCount,
        discrepancyCount: discrepancies.length,
        unresolvedTimeoutCount,
        isFullyBalanced: discrepancies.length === 0,
      },
      discrepancies,
    };
  }
}
