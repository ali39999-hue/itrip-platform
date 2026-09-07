import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { ReconciliationService } from '../ledger/ReconciliationService';
import { OperationalExceptionService, ExceptionSeverity } from './three-way-reconciliation';

export interface DomainReconciliationSummary {
  matched: boolean;
  expectedAmount: Money;
  actualAmount: Money;
  variance: Money;
}

export interface EndToEndReconciliationReport {
  reportId: string;
  timestamp: Date;
  currency: string;
  payments: DomainReconciliationSummary;
  invoices: DomainReconciliationSummary;
  supplierStatements: DomainReconciliationSummary;
  ledgerBalanced: boolean;
  totalDiscrepanciesCount: number;
  status: 'BALANCED' | 'DISCREPANCY';
}

export interface ManualQueueItem {
  id: string;
  type: string;
  severity: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  status: string;
  slaDueAt: Date | null;
  detectedAt: Date;
  resolution: string | null;
}

/**
 * Manual Reconciliation Queue Service (REC-102)
 * Manages human triage and resolution of unmatched reconciliation records.
 */
export class ManualReconciliationQueueService {
  /**
   * Enqueues an unmatched financial record for manual operator review (REC-102, REC-103)
   * Deduplicates onto existing open queue item if present.
   */
  static async enqueueItem(params: {
    entityType: string;
    entityId: string;
    title: string;
    description: string;
    severity?: ExceptionSeverity;
    slaMinutes?: number;
  }): Promise<string> {
    return OperationalExceptionService.raiseException({
      type: 'MANUAL_RECONCILIATION_ITEM',
      severity: params.severity || ExceptionSeverity.HIGH,
      entityType: params.entityType,
      entityId: params.entityId,
      title: params.title,
      description: params.description,
      slaMinutes: params.slaMinutes || 120,
    });
  }

  /**
   * Lists active queue items needing manual review
   */
  static async getQueue(status?: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED'): Promise<ManualQueueItem[]> {
    const records = await prisma.operationalException.findMany({
      where: {
        type: 'MANUAL_RECONCILIATION_ITEM',
        ...(status ? { status } : { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } }),
      },
      orderBy: { detectedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      entityType: r.entityType,
      entityId: r.entityId,
      title: r.title,
      description: r.description,
      status: r.status,
      slaDueAt: r.slaDueAt,
      detectedAt: r.detectedAt,
      resolution: r.resolution,
    }));
  }

  /**
   * Resolves a manual queue item with operator notes
   */
  static async resolveItem(exceptionId: string, resolutionNotes: string): Promise<void> {
    await OperationalExceptionService.resolveException(exceptionId, resolutionNotes);
  }
}

/**
 * End-to-End Reconciliation Domain Service (REC-101, REC-103)
 * Full reconciliation across Booking, Payment, Invoicing, Supplier Statement, and General Ledger.
 */
export class ReconciliationDomainService {
  /**
   * Performs end-to-end reconciliation across all financial domains (REC-101)
   */
  static async reconcileEndToEnd(options?: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
  }): Promise<EndToEndReconciliationReport> {
    const currency = (options?.currency || 'IRR').toUpperCase();
    const dateFilter: Prisma.DateTimeFilter = {};
    if (options?.startDate) dateFilter.gte = options.startDate;
    if (options?.endDate) dateFilter.lte = options.endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 1. Booking totals
    const bookings = await prisma.booking.findMany({
      where: {
        currency,
        status: { in: ['CONFIRMED', 'PAYMENT_CONFIRMED'] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        items: true,
      },
    });

    let totalBooked = Money.zero(currency);
    let totalNetCost = Money.zero(currency);
    for (const b of bookings) {
      totalBooked = totalBooked.add(new Money(b.totalAmount.toString(), currency));
      for (const item of b.items) {
        totalNetCost = totalNetCost.add(new Money(item.netCost.toString(), currency));
      }
    }

    // 2. Payments totals
    const payments = await prisma.payment.aggregate({
      where: {
        currency,
        status: 'SUCCESS',
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { amount: true },
    });
    const totalPaid = new Money(payments._sum.amount ? payments._sum.amount.toString() : 0, currency);
    const paymentsVariance = totalBooked.sub(totalPaid);
    const paymentsMatched = paymentsVariance.isZero();

    // 3. Invoices totals
    const invoices = await prisma.invoice.aggregate({
      where: {
        currency,
        status: { in: ['ISSUED', 'PAID'] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { totalAmount: true },
    });
    const totalInvoiced = new Money(invoices._sum.totalAmount ? invoices._sum.totalAmount.toString() : 0, currency);
    const invoicesVariance = totalBooked.sub(totalInvoiced);
    const invoicesMatched = invoicesVariance.isZero();

    // 4. Supplier Statement totals
    const statements = await prisma.supplierStatement.aggregate({
      where: {
        currency,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { totalAmount: true },
    });
    const totalStatements = new Money(statements._sum.totalAmount ? statements._sum.totalAmount.toString() : 0, currency);
    const statementsVariance = totalNetCost.sub(totalStatements);
    const statementsMatched = statementsVariance.isZero();

    // 5. Ledger Balance Verification
    const ledgerReport = await ReconciliationService.reconcileLedger();

    let discrepanciesCount = 0;
    if (!paymentsMatched) discrepanciesCount++;
    if (!invoicesMatched && !totalInvoiced.isZero()) discrepanciesCount++;
    if (!statementsMatched && !totalStatements.isZero()) discrepanciesCount++;
    if (!ledgerReport.isBalanced) discrepanciesCount++;

    // Deduplicated exception raising (REC-103)
    if (!paymentsMatched && !totalBooked.isZero()) {
      await OperationalExceptionService.raiseException({
        type: 'PAYMENT_RECONCILIATION_MISMATCH',
        severity: ExceptionSeverity.HIGH,
        entityType: 'RECONCILIATION_ENGINE',
        entityId: `system_${currency}`,
        title: `Payments reconciliation mismatch for ${currency}`,
        description: `Total booked: ${totalBooked.toString()} vs Total paid: ${totalPaid.toString()}. Variance: ${paymentsVariance.toString()}`,
        slaMinutes: 120,
      });
    }

    return {
      reportId: `e2e_rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      currency,
      payments: {
        matched: paymentsMatched,
        expectedAmount: totalBooked,
        actualAmount: totalPaid,
        variance: paymentsVariance,
      },
      invoices: {
        matched: invoicesMatched,
        expectedAmount: totalBooked,
        actualAmount: totalInvoiced,
        variance: invoicesVariance,
      },
      supplierStatements: {
        matched: statementsMatched,
        expectedAmount: totalNetCost,
        actualAmount: totalStatements,
        variance: statementsVariance,
      },
      ledgerBalanced: ledgerReport.isBalanced,
      totalDiscrepanciesCount: discrepanciesCount,
      status: discrepanciesCount === 0 ? 'BALANCED' : 'DISCREPANCY',
    };
  }
}
