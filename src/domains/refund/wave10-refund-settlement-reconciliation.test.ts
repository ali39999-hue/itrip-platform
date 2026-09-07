import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';
import { RefundDomainService, RefundAmountInvariantViolationError } from './RefundDomainService';
import { RefundStateMachine, InvalidRefundTransitionError } from './RefundStateMachine';
import { SupplierStatementService } from '../finance/SupplierStatementService';
import { SettlementBatchService } from '../finance/SettlementBatchService';
import {
  ReconciliationDomainService,
  ManualReconciliationQueueService,
} from '../finance/ReconciliationDomainService';
import { ExceptionSeverity } from '../finance/three-way-reconciliation';

describe('Wave 10: Refund, Settlement & Reconciliation Suite (REF-101 to REF-107, SET-101 to SET-103, REC-101 to REC-103)', () => {
  const suffix = `w10_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testSupplierId = '';
  let testBookingId = '';
  const testAmount = 8_000_000;
  const testCurrency = 'IRR';

  beforeAll(async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `wave10_${suffix}@itrip.test`,
        name: 'Wave 10 Tester',
      },
    });
    testUserId = user.id;

    // 2. Create test supplier
    const supplier = await prisma.supplier.create({
      data: {
        id: `sup_${suffix}`,
        name: `Supplier W10 ${suffix}`,
        type: 'HOTEL',
      },
    });
    testSupplierId = supplier.id;

    // 3. Create test booking
    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-W10-${suffix.toUpperCase()}`,
        customerId: testUserId,
        supplierId: testSupplierId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: testAmount,
        currency: testCurrency,
        items: {
          create: [
            {
              type: 'HOTEL',
              sellPrice: testAmount,
              netCost: 6_500_000,
              markup: 1_500_000,
            },
          ],
        },
      },
    });
    testBookingId = booking.id;
  });

  afterAll(async () => {
    try {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { entryNumber: { contains: suffix } } },
      });
      await prisma.journalEntry.deleteMany({
        where: { entryNumber: { contains: suffix } },
      });
      await prisma.ledgerEntry.deleteMany({
        where: { groupId: { contains: suffix } },
      });
      await prisma.refundAttempt.deleteMany({
        where: { refund: { bookingId: testBookingId } },
      });
      await prisma.refundApproval.deleteMany({
        where: { refund: { bookingId: testBookingId } },
      });
      await prisma.refundPolicySnapshot.deleteMany({
        where: { refund: { bookingId: testBookingId } },
      });
      await prisma.refundItem.deleteMany({
        where: { refund: { bookingId: testBookingId } },
      });
      await prisma.refund.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.bookingItem.deleteMany({ where: { booking: { customerId: testUserId } } });
      await prisma.bookingStatusHistory.deleteMany({ where: { booking: { customerId: testUserId } } });
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: { contains: suffix } } });
      await prisma.supplierStatement.deleteMany({ where: { supplierId: testSupplierId } });
      await prisma.settlementBatch.deleteMany({ where: { supplierId: testSupplierId } });
      await prisma.operationalException.deleteMany({ where: { entityId: { contains: suffix } } });
      await prisma.booking.deleteMany({ where: { customerId: testUserId } });
      await prisma.supplier.deleteMany({ where: { id: testSupplierId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (e) {
      console.error('Wave 10 cleanup error:', e);
    }
  });

  it('REF-101: Creating a refund request creates REQUESTED state, not immediately SETTLED', async () => {
    const res = await RefundDomainService.requestRefund({
      bookingId: testBookingId,
      idempotencyKey: `idem_lifecycle_${suffix}`,
      reason: 'Customer requested cancellation',
      penaltyPercentage: 0.10,
    });

    expect(res.success).toBe(true);
    expect(res.refundId).toBeDefined();
    expect(res.status).toBe('REQUESTED');

    // Verify booking in DB is not marked REFUNDED yet
    const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(booking?.status).toBe('CONFIRMED');
  });

  it('REF-102: RefundStateMachine enforces legal transitions and rejects invalid hops', () => {
    expect(RefundStateMachine.canTransition('REQUESTED', 'APPROVED')).toBe(true);
    expect(RefundStateMachine.canTransition('APPROVED', 'PROCESSING')).toBe(true);
    expect(RefundStateMachine.canTransition('PROCESSING', 'SETTLED')).toBe(true);

    // Direct jump from REQUESTED to SETTLED is illegal
    expect(RefundStateMachine.canTransition('REQUESTED', 'SETTLED')).toBe(false);
    expect(() => RefundStateMachine.assertTransition('REQUESTED', 'SETTLED')).toThrow(
      InvalidRefundTransitionError
    );

    // Terminal states cannot transition
    expect(RefundStateMachine.isTerminal('SETTLED')).toBe(true);
    expect(RefundStateMachine.isTerminal('FAILED')).toBe(true);
    expect(RefundStateMachine.canTransition('SETTLED', 'APPROVED')).toBe(false);
  });

  it('REF-103: Enforces refund amount invariant (pending + refunded cannot exceed booking amount)', async () => {
    // Current booking total is 8,000,000. We already requested a refund of 8,000,000 above.
    // Attempting another refund request for 1,000,000 must fail closed.
    await expect(
      RefundDomainService.requestRefund({
        bookingId: testBookingId,
        idempotencyKey: `idem_over_refund_${suffix}`,
        penaltyPercentage: 0.10,
      })
    ).rejects.toThrow(RefundAmountInvariantViolationError);
  });

  it('REF-104: Persists supplier refund result', async () => {
    const existingRefund = await prisma.refund.findFirstOrThrow({
      where: { bookingId: testBookingId },
    });

    const supRes = await RefundDomainService.persistSupplierRefund({
      refundId: existingRefund.id,
      supplierId: testSupplierId,
      supplierRef: `sup_ref_cnf_${suffix}`,
      grossAmount: new Money(6_500_000, 'IRR'),
      netAmount: new Money(5_850_000, 'IRR'),
      status: 'CONFIRMED',
    });

    expect(supRes.success).toBe(true);
    expect(supRes.supplierRef).toBe(`sup_ref_cnf_${suffix}`);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'SUPPLIER_REFUND_RECORDED', resourceId: existingRefund.id },
    });
    expect(audit).not.toBeNull();
  });

  it('REF-105, REF-106: Customer refund payout executes, persists RefundAttempt and wires once to ledger', async () => {
    const existingRefund = await prisma.refund.findFirstOrThrow({
      where: { bookingId: testBookingId },
    });

    // 1. Approve
    await RefundDomainService.approveRefund(existingRefund.id, 'FINANCE_MANAGER');

    // 2. Execute payout
    const payoutRes = await RefundDomainService.executeRefundPayout({
      refundId: existingRefund.id,
      channel: 'WALLET',
    });

    expect(payoutRes.success).toBe(true);
    expect(payoutRes.status).toBe('SETTLED');

    // 3. Verify RefundAttempt was recorded (REF-105)
    const attempts = await prisma.refundAttempt.findMany({
      where: { refundId: existingRefund.id },
    });
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts[0].status).toBe('SUCCESS');

    // 4. Verify General Ledger entry posted once (REF-106)
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { groupId: `rfd_grp_${existingRefund.id}` },
    });
    expect(ledgerEntries.length).toBe(2); // 1 debit Escrow, 1 credit Customer Wallet
  });

  it('REF-107: Test duplicate refund x3 returns idempotent identical outcome without duplicate ledger postings', async () => {
    // Create another booking for duplicate refund testing
    const dupBooking = await prisma.booking.create({
      data: {
        id: `bkg_dup_${suffix}`,
        reference: `ITR-DUP-${suffix.toUpperCase()}`,
        customerId: testUserId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: 4_000_000,
        currency: testCurrency,
        items: {
          create: [{ type: 'FLIGHT', sellPrice: 4_000_000, netCost: 3_500_000, markup: 500_000 }],
        },
      },
    });

    const dupKey = `idem_dup_refund_x3_${suffix}`;

    // Call 1
    const res1 = await RefundDomainService.processRefund({
      bookingId: dupBooking.id,
      idempotencyKey: dupKey,
      penaltyPercentage: 0.15,
    });
    expect(res1.success).toBe(true);
    expect(res1.status).toBe('SETTLED');

    // Call 2 (duplicate)
    const res2 = await RefundDomainService.processRefund({
      bookingId: dupBooking.id,
      idempotencyKey: dupKey,
      penaltyPercentage: 0.15,
    });
    expect(res2.success).toBe(true);
    expect(res2.refundId).toBe(res1.refundId);

    // Call 3 (duplicate)
    const res3 = await RefundDomainService.processRefund({
      bookingId: dupBooking.id,
      idempotencyKey: dupKey,
      penaltyPercentage: 0.15,
    });
    expect(res3.success).toBe(true);
    expect(res3.refundId).toBe(res1.refundId);

    // Verify exactly ONE refund row in database
    const refunds = await prisma.refund.findMany({ where: { idempotencyKey: dupKey } });
    expect(refunds.length).toBe(1);

    // Verify exactly ONE ledger group
    const ledger = await prisma.ledgerEntry.findMany({
      where: { groupId: `rfd_grp_${res1.refundId}` },
    });
    expect(ledger.length).toBe(2);
  });

  it('SET-101: SupplierStatementService normalizes and ingests supplier statement lines', async () => {
    const rawLines = [
      {
        booking_ref: `ITR-W10-${suffix.toUpperCase()}`,
        pnr: 'IR9928',
        flight_date: '2026-09-10',
        net_fare: 6_500_000,
        tax: 585_000,
        commission: 325_000,
        currency: 'IRR',
      },
    ];

    const statementNumber = `STMT-${suffix.toUpperCase()}-001`;
    const ingestRes = await SupplierStatementService.ingestStatement({
      supplierId: testSupplierId,
      statementNumber,
      periodStart: new Date(Date.now() - 7 * 86400000),
      periodEnd: new Date(),
      rawLines,
    });

    expect(ingestRes.statementNumber).toBe(statementNumber);
    expect(ingestRes.linesCount).toBe(1);
    expect(ingestRes.totalAmount.toNumber()).toBe(6_500_000);

    const parsedLines = await SupplierStatementService.getStatementLines(ingestRes.statementId);
    expect(parsedLines.length).toBe(1);
    expect(parsedLines[0].bookingReference).toBe(`ITR-W10-${suffix.toUpperCase()}`);
    expect(parsedLines[0].netAmount.toNumber()).toBe(6_500_000);
  });

  it('SET-102, SET-103: SettlementBatchService creates traceable settlement batch and executes settlement', async () => {
    // Ensure confirmed booking exists for this supplier in the settlement period
    const settleBooking = await prisma.booking.create({
      data: {
        id: `bkg_settle_${suffix}`,
        reference: `ITR-SETTLE-${suffix.toUpperCase()}`,
        customerId: testUserId,
        supplierId: testSupplierId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: testAmount,
        currency: testCurrency,
        items: {
          create: [
            {
              type: 'HOTEL',
              sellPrice: testAmount,
              netCost: 6_500_000,
              markup: 1_500_000,
            },
          ],
        },
      },
    });

    // 1. Create settlement batch
    const batch = await SettlementBatchService.createSettlementBatch({
      supplierId: testSupplierId,
      periodStart: new Date(Date.now() - 7 * 86400000),
      periodEnd: new Date(Date.now() + 86400000),
    });

    expect(batch.id).toBeDefined();
    expect(batch.batchNumber).toMatch(/^STLB-/);
    expect(batch.status).toBe('OPEN');
    expect(batch.lines.length).toBeGreaterThanOrEqual(1);

    const line = batch.lines[0];
    expect(line.bookingId).toBe(settleBooking.id);
    expect(line.netCost.toNumber()).toBe(6_500_000);
    expect(line.sellPrice.toNumber()).toBe(testAmount);

    // 2. Reconcile with statement
    const statementNumber = `STMT-${suffix.toUpperCase()}-001`;
    const statement = await prisma.supplierStatement.findUniqueOrThrow({
      where: { statementNumber },
    });

    const reconRes = await SettlementBatchService.reconcileBatchWithStatement({
      batchId: batch.id,
      statementId: statement.id,
    });

    expect(reconRes.matched).toBe(true);
    expect(reconRes.status).toBe('RECONCILED');

    // 3. Execute settlement payment and ledger posting
    const execRes = await SettlementBatchService.executeSettlement(batch.id);
    expect(execRes.success).toBe(true);

    const completedBatch = await prisma.settlementBatch.findUnique({ where: { id: batch.id } });
    expect(completedBatch?.status).toBe('COMPLETED');

    // Ledger posting verified
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { groupId: `stlb_pay_${batch.id}` },
    });
    expect(ledgerEntries.length).toBe(2);
  });

  it('REC-101: ReconciliationDomainService runs end-to-end reconciliation across all 4 domains', async () => {
    const report = await ReconciliationDomainService.reconcileEndToEnd({
      currency: 'IRR',
    });

    expect(report.reportId).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(report.currency).toBe('IRR');
    expect(report.payments).toBeDefined();
    expect(report.invoices).toBeDefined();
    expect(report.supplierStatements).toBeDefined();
    expect(typeof report.ledgerBalanced).toBe('boolean');
  });

  it('REC-102, REC-103: ManualReconciliationQueueService enqueues and deduplicates exceptions', async () => {
    const entityId = `queue_ent_${suffix}`;

    // 1. Enqueue item 1
    const id1 = await ManualReconciliationQueueService.enqueueItem({
      entityType: 'PAYMENT',
      entityId,
      title: 'Unmatched bank settlement transaction',
      description: 'First detection note',
      severity: ExceptionSeverity.HIGH,
    });

    expect(id1).toBeDefined();

    // 2. Enqueue item 2 with same entity (REC-103 Deduplication)
    const id2 = await ManualReconciliationQueueService.enqueueItem({
      entityType: 'PAYMENT',
      entityId,
      title: 'Unmatched bank settlement transaction',
      description: 'Updated detection note',
      severity: ExceptionSeverity.HIGH,
    });

    // Same exception ID returned — deduplicated onto existing open ticket
    expect(id2).toBe(id1);

    // 3. Read queue
    const queue = await ManualReconciliationQueueService.getQueue();
    const found = queue.find((q) => q.id === id1);
    expect(found).toBeDefined();
    expect(found?.description).toBe('Updated detection note');

    // 4. Resolve item
    await ManualReconciliationQueueService.resolveItem(id1, 'Manually matched with wire transfer ref 1092');
    const updated = await prisma.operationalException.findUnique({ where: { id: id1 } });
    expect(updated?.status).toBe('RESOLVED');
  });
});
