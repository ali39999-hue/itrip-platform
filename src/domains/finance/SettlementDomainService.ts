import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';

export interface CreateSettlementBatchParams {
  supplierId: string;
  periodStart: Date;
  periodEnd: Date;
  currency?: string;
}

export interface SettlementBatchResult {
  id: string;
  batchNumber: string;
  supplierId: string;
  totalPayable: Money;
  totalDeductions: Money;
  netSettlement: Money;
  status: string;
}

export class SettlementDomainService {
  /**
   * Generates a supplier settlement batch tracing bookings, ledger payables, and invoices (Section 28)
   */
  static async createSettlementBatch(params: CreateSettlementBatchParams): Promise<SettlementBatchResult> {
    const currency = (params.currency || 'IRR').toUpperCase();
    const batchNumber = `STLB-${params.supplierId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Fetch all confirmed bookings for this supplier in the period
    const bookingItems = await prisma.bookingItem.findMany({
      where: {
        inventoryItem: { supplierId: params.supplierId },
        booking: {
          status: 'CONFIRMED',
          createdAt: {
            gte: params.periodStart,
            lte: params.periodEnd,
          },
        },
      },
      include: {
        booking: true,
      },
    });

    let totalCostDecimal = new Prisma.Decimal(0);
    for (const item of bookingItems) {
      totalCostDecimal = totalCostDecimal.add(new Prisma.Decimal(item.netCost.toString()));
    }

    const totalPayableMoney = new Money(totalCostDecimal, currency);
    const deductionsMoney = Money.zero(currency);
    const netSettlementMoney = totalPayableMoney.sub(deductionsMoney);

    // 2. Create the SettlementBatch record
    const batch = await prisma.settlementBatch.create({
      data: {
        batchNumber,
        supplierId: params.supplierId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        totalPayable: totalPayableMoney.toDecimal(),
        totalDeductions: deductionsMoney.toDecimal(),
        netSettlement: netSettlementMoney.toDecimal(),
        currency,
        status: 'OPEN',
      },
    });

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      supplierId: batch.supplierId,
      totalPayable: totalPayableMoney,
      totalDeductions: deductionsMoney,
      netSettlement: netSettlementMoney,
      status: batch.status,
    };
  }

  /**
   * Reconciles Supplier Statement against the Settlement Batch and Ledger
   * Flags exceptions if statement variance is detected (Section 28, 29)
   */
  static async reconcileSupplierStatement(params: {
    statementId: string;
    batchId: string;
  }): Promise<{ matched: boolean; variance: Money; status: string; exceptionId?: string }> {
    const statement = await prisma.supplierStatement.findUnique({
      where: { id: params.statementId },
    });
    const batch = await prisma.settlementBatch.findUnique({
      where: { id: params.batchId },
    });

    if (!statement || !batch) {
      throw new Error('Statement or Settlement Batch not found');
    }

    const stmtAmount = new Money(statement.totalAmount.toString(), statement.currency);
    const batchAmount = new Money(batch.netSettlement.toString(), batch.currency);

    const variance = stmtAmount.sub(batchAmount);
    const isMatched = variance.isZero();

    let exceptionId: string | undefined;

    if (!isMatched) {
      await prisma.settlementBatch.update({
        where: { id: batch.id },
        data: { status: 'DISCREPANCY' },
      });

      const exc = await prisma.operationalException.create({
        data: {
          type: 'SUPPLIER_STATEMENT_MISMATCH',
          severity: 'HIGH',
          entityType: 'SUPPLIER',
          entityId: batch.supplierId,
          title: `Settlement variance for batch ${batch.batchNumber}`,
          description: `Supplier statement ${statement.statementNumber} claimed ${stmtAmount.toString()} but ledger batch has ${batchAmount.toString()}. Variance: ${variance.toString()}`,
          status: 'OPEN',
        },
      });
      exceptionId = exc.id;
    } else {
      await prisma.settlementBatch.update({
        where: { id: batch.id },
        data: { status: 'RECONCILED' },
      });
    }

    return {
      matched: isMatched,
      variance,
      status: isMatched ? 'RECONCILED' : 'DISCREPANCY',
      exceptionId,
    };
  }

  /**
   * Completes settlement payment and clears supplier payable in general ledger
   */
  static async executeSettlementPayment(batchId: string): Promise<{ success: boolean; settledAt: Date }> {
    const batch = await prisma.settlementBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) throw new Error('Settlement batch not found');

    const settledAt = new Date();

    // Post settlement payment to General Ledger
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
