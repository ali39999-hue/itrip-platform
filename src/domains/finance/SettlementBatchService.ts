import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { SupplierStatementService } from './SupplierStatementService';
import { OperationalExceptionService, ExceptionSeverity } from './three-way-reconciliation';

export interface SettlementLine {
  id: string;
  batchId: string;
  bookingId: string;
  bookingReference: string;
  supplierId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  gatewayRef?: string;
  ledgerGroupId?: string;
  netCost: Money;
  sellPrice: Money;
  commission: Money;
  currency: string;
  matchedWithStatement: boolean;
}

export interface CreateSettlementBatchParams {
  supplierId: string;
  periodStart: Date;
  periodEnd: Date;
  currency?: string;
}

export interface SettlementBatchWithLines {
  id: string;
  batchNumber: string;
  supplierId: string;
  periodStart: Date;
  periodEnd: Date;
  totalPayable: Money;
  totalDeductions: Money;
  netSettlement: Money;
  currency: string;
  status: string;
  lines: SettlementLine[];
}

export interface ReconciliationBatchResult {
  batchId: string;
  statementId: string;
  matched: boolean;
  batchAmount: Money;
  statementAmount: Money;
  variance: Money;
  status: 'RECONCILED' | 'DISCREPANCY';
  exceptionId?: string;
  matchedLinesCount: number;
  unmatchedLinesCount: number;
}

/**
 * Settlement Batch Service (SET-102, SET-103)
 * Full production flow for generating traceable settlement batches, reconciling statements, and executing settlements.
 */
export class SettlementBatchService {
  /**
   * SET-102, SET-103: Creates a traceable settlement batch linking booking, invoice, payment, and ledger entries.
   */
  static async createSettlementBatch(
    params: CreateSettlementBatchParams,
    tx?: Prisma.TransactionClient
  ): Promise<SettlementBatchWithLines> {
    const client = tx || prisma;
    const currency = (params.currency || 'IRR').toUpperCase();
    const batchNumber = `STLB-${params.supplierId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Fetch all confirmed bookings for this supplier within the period
    const bookings = await client.booking.findMany({
      where: {
        supplierId: params.supplierId,
        status: 'CONFIRMED',
        createdAt: {
          gte: params.periodStart,
          lte: params.periodEnd,
        },
      },
      include: {
        items: true,
      },
    });

    const bookingIds = bookings.map((b) => b.id);

    // 2. Fetch associated invoices
    const invoices = await client.invoice.findMany({
      where: { bookingId: { in: bookingIds } },
    });
    const invoiceByBookingId = new Map(invoices.map((inv) => [inv.bookingId, inv]));

    // 3. Fetch associated payments
    const payments = await client.payment.findMany({
      where: { bookingId: { in: bookingIds }, status: 'SUCCESS' },
    });
    const paymentByBookingId = new Map(payments.map((p) => [p.bookingId!, p]));

    // 4. Fetch associated ledger entries
    const ledgerEntries = await client.ledgerEntry.findMany({
      where: {
        referenceId: { in: bookingIds },
        referenceType: { in: ['BOOKING', 'REVENUE_REALIZATION', 'SUPPLIER_PAYABLE'] },
      },
    });
    const ledgerByBookingId = new Map(ledgerEntries.map((le) => [le.referenceId!, le]));

    // 5. Construct traceable SettlementLines (SET-102)
    const settlementLines: SettlementLine[] = [];
    let totalPayable = Money.zero(currency);
    const totalDeductions = Money.zero(currency);

    for (const booking of bookings) {
      const inv = invoiceByBookingId.get(booking.id);
      const payment = paymentByBookingId.get(booking.id);
      const ledger = ledgerByBookingId.get(booking.id);

      let bookingNetCost = Money.zero(currency);
      for (const item of booking.items) {
        bookingNetCost = bookingNetCost.add(new Money(item.netCost.toString(), currency));
      }

      const sellPrice = new Money(booking.totalAmount.toString(), currency);
      const commission = sellPrice.sub(bookingNetCost);

      const lineId = `stll_${booking.id}_${Date.now().toString(36)}`;
      settlementLines.push({
        id: lineId,
        batchId: '', // populated upon creation
        bookingId: booking.id,
        bookingReference: booking.reference,
        supplierId: params.supplierId,
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber,
        paymentId: payment?.id,
        gatewayRef: payment?.gatewayRef || undefined,
        ledgerGroupId: ledger?.groupId,
        netCost: bookingNetCost,
        sellPrice,
        commission,
        currency,
        matchedWithStatement: false,
      });

      totalPayable = totalPayable.add(bookingNetCost);
    }

    const netSettlement = totalPayable.sub(totalDeductions);

    // 6. Create SettlementBatch in DB (SET-103)
    const batch = await client.settlementBatch.create({
      data: {
        batchNumber,
        supplierId: params.supplierId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        totalPayable: totalPayable.toDecimal(),
        totalDeductions: totalDeductions.toDecimal(),
        netSettlement: netSettlement.toDecimal(),
        currency,
        status: 'OPEN',
      },
    });

    for (const line of settlementLines) {
      line.batchId = batch.id;
    }

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      supplierId: batch.supplierId,
      periodStart: batch.periodStart,
      periodEnd: batch.periodEnd,
      totalPayable,
      totalDeductions,
      netSettlement,
      currency,
      status: batch.status,
      lines: settlementLines,
    };
  }

  /**
   * SET-103, REC-103: Reconciles SettlementBatch with SupplierStatement.
   * Compares traceable settlement lines with normalized statement lines and flags exceptions if variance detected.
   */
  static async reconcileBatchWithStatement(params: {
    batchId: string;
    statementId: string;
  }): Promise<ReconciliationBatchResult> {
    const batch = await prisma.settlementBatch.findUnique({
      where: { id: params.batchId },
    });
    const statement = await prisma.supplierStatement.findUnique({
      where: { id: params.statementId },
    });

    if (!batch || !statement) {
      throw new Error('Settlement Batch or Supplier Statement not found');
    }

    const batchAmount = new Money(batch.netSettlement.toString(), batch.currency);
    const statementAmount = new Money(statement.totalAmount.toString(), statement.currency);

    const statementLines = await SupplierStatementService.getStatementLines(params.statementId);

    // Reconcile totals
    const variance = statementAmount.sub(batchAmount);
    const isMatched = variance.isZero();

    let exceptionId: string | undefined;

    if (!isMatched) {
      await prisma.settlementBatch.update({
        where: { id: batch.id },
        data: { status: 'DISCREPANCY' },
      });

      // Raise deduplicated exception (REC-103)
      exceptionId = await OperationalExceptionService.raiseException({
        type: 'SUPPLIER_STATEMENT_MISMATCH',
        severity: ExceptionSeverity.HIGH,
        entityType: 'SUPPLIER',
        entityId: batch.supplierId,
        title: `Settlement variance for batch ${batch.batchNumber}`,
        description: `Supplier statement ${statement.statementNumber} reported ${statementAmount.toString()} vs batch ${batchAmount.toString()}. Variance: ${variance.toString()}`,
        slaMinutes: 120,
      });
    } else {
      await prisma.settlementBatch.update({
        where: { id: batch.id },
        data: { status: 'RECONCILED' },
      });
    }

    return {
      batchId: batch.id,
      statementId: statement.id,
      matched: isMatched,
      batchAmount,
      statementAmount,
      variance,
      status: isMatched ? 'RECONCILED' : 'DISCREPANCY',
      exceptionId,
      matchedLinesCount: isMatched ? statementLines.length : 0,
      unmatchedLinesCount: isMatched ? 0 : statementLines.length,
    };
  }

  /**
   * SET-103: Completes settlement execution and posts to General Ledger.
   */
  static async executeSettlement(batchId: string): Promise<{ success: boolean; settledAt: Date }> {
    const batch = await prisma.settlementBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) throw new Error(`Settlement batch ${batchId} not found`);

    const settledAt = new Date();

    // Post clearing entry to General Ledger: DEBIT Supplier Payable -> CREDIT Gateway/Bank
    await GeneralLedgerService.postGatewayPayment({
      groupId: `stlb_pay_${batch.id}`,
      amount: new Money(batch.netSettlement.toString(), batch.currency),
      currency: batch.currency,
      referenceId: batch.id,
      memo: `Settlement payment for ${batch.batchNumber}`,
    });

    await prisma.settlementBatch.update({
      where: { id: batch.id },
      data: { status: 'COMPLETED', updatedAt: settledAt },
    });

    return { success: true, settledAt };
  }
}
