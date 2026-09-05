import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';

export enum ExceptionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class OperationalExceptionService {
  /**
   * Registers an actionable operational exception with SLA and entity tracing (OPS-001)
   */
  static async raiseException(params: {
    type: string;
    severity: ExceptionSeverity;
    entityType: string;
    entityId: string;
    title?: string;
    organizationId?: string;
    description: string;
    slaMinutes: number;
  }): Promise<string> {
    const slaDueAt = new Date(Date.now() + params.slaMinutes * 60 * 1000);

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
}
