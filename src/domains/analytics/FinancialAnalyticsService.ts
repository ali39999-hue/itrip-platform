import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';

export interface FinancialMetricsSummary {
  period: {
    start: Date;
    end: Date;
  };
  gmv: Money; // Total gross booking amount
  netRevenue: Money; // Platform markup + service fees
  supplierPayable: Money; // Supplier cost liabilities
  taxesCollected: Money; // Tax liability collected
  totalRefunded: Money; // Total refunded to customers
  takeRatePercentage: number; // netRevenue / GMV
  ledgerReconciled: boolean;
  ledgerDiscrepancy: Money;
  bookingCounts: {
    confirmed: number;
    refunded: number;
    cancelled: number;
  };
}

export class FinancialAnalyticsService {
  /**
   * Generates GMV, Revenue, Margin and Ledger-reconciled metrics (ANALYTICS-101)
   */
  static async getFinancialMetrics(options?: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
  }): Promise<FinancialMetricsSummary> {
    const currency = options?.currency || 'IRR';
    const end = options?.endDate || new Date();
    const start = options?.startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default

    // 1. Fetch bookings in date window
    const [confirmedBookings, refundedBookings, cancelledBookings] = await Promise.all([
      prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          createdAt: { gte: start, lte: end },
          currency,
        },
        include: { items: true },
      }),
      prisma.booking.findMany({
        where: {
          status: 'REFUNDED',
          createdAt: { gte: start, lte: end },
          currency,
        },
      }),
      prisma.booking.findMany({
        where: {
          status: 'CANCELLED',
          createdAt: { gte: start, lte: end },
          currency,
        },
      }),
    ]);

    // Calculate GMV from confirmed bookings
    let gmvTotal = 0;
    let netCostTotal = 0;
    let markupTotal = 0;
    let taxTotal = 0;

    for (const b of confirmedBookings) {
      gmvTotal += Number(b.totalAmount);
      for (const item of b.items) {
        netCostTotal += Number(item.netCost);
        markupTotal += Number(item.markup);
        taxTotal += Number(item.taxAmount);
      }
    }

    // 2. Fetch settled refunds in date window
    const settledRefunds = await prisma.refund.findMany({
      where: {
        status: { in: ['SETTLED', 'COMPLETED'] },
        createdAt: { gte: start, lte: end },
        currency,
      },
    });

    const totalRefundedNum = settledRefunds.reduce((sum, r) => sum + Number(r.netRefundAmount), 0);

    // 3. Reconcile with General Ledger entries
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        currency,
      },
      include: { account: true },
    });

    let ledgerCreditTotal = 0;
    let ledgerDebitTotal = 0;

    for (const entry of ledgerEntries) {
      const amt = Number(entry.amount);
      if (entry.direction === 'CREDIT') {
        ledgerCreditTotal += amt;
      } else {
        ledgerDebitTotal += amt;
      }
    }

    const variance = Math.abs(ledgerDebitTotal - ledgerCreditTotal);
    const ledgerReconciled = variance === 0;

    const takeRatePercentage = gmvTotal > 0 ? (markupTotal / gmvTotal) * 100 : 0;

    return {
      period: { start, end },
      gmv: new Money(gmvTotal, currency),
      netRevenue: new Money(markupTotal, currency),
      supplierPayable: new Money(netCostTotal, currency),
      taxesCollected: new Money(taxTotal, currency),
      totalRefunded: new Money(totalRefundedNum, currency),
      takeRatePercentage: Number(takeRatePercentage.toFixed(2)),
      ledgerReconciled,
      ledgerDiscrepancy: new Money(variance, currency),
      bookingCounts: {
        confirmed: confirmedBookings.length,
        refunded: refundedBookings.length,
        cancelled: cancelledBookings.length,
      },
    };
  }
}
