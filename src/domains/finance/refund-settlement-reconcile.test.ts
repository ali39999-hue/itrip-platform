import { describe, it, expect, afterAll } from 'vitest';
import { SettlementDomainService } from './SettlementDomainService';
import { prisma } from '@/lib/prisma';

describe('Refund, Settlement & Reconciliation Suite (REF-001, SET-001, RECON-001)', () => {
  const suffix = `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testSupplierId = '';
  let testBookingId = '';
  let testBatchId = '';

  afterAll(async () => {
    try {
      await prisma.operationalException.deleteMany({
        where: { title: { contains: suffix } },
      });
      await prisma.supplierStatement.deleteMany({
        where: { supplierId: testSupplierId },
      });
      await prisma.settlementBatch.deleteMany({
        where: { supplierId: testSupplierId },
      });
      await prisma.refundItem.deleteMany({
        where: { refund: { bookingId: testBookingId } },
      });
      await prisma.refund.deleteMany({
        where: { bookingId: testBookingId },
      });
      await prisma.bookingItem.deleteMany({
        where: { bookingId: testBookingId },
      });
      await prisma.booking.deleteMany({
        where: { id: testBookingId },
      });
      await prisma.inventoryItem.deleteMany({
        where: { supplierId: testSupplierId },
      });
      await prisma.supplier.deleteMany({
        where: { id: testSupplierId },
      });
    } catch (e) {
      console.error('Test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up a supplier, booking items, and confirmed booking for settlement tests', async () => {
    const supplier = await prisma.supplier.create({
      data: {
        id: `sup_${suffix}`,
        name: `Mahan Allotment ${suffix}`,
        type: 'AIRLINE',
      },
    });
    testSupplierId = supplier.id;

    const invItem = await prisma.inventoryItem.create({
      data: {
        id: `inv_${suffix}`,
        supplierId: testSupplierId,
        type: 'FLIGHT_SEAT',
        name: 'Mahan Economy Seat',
        basePrice: 12_000_000,
        currency: 'IRR',
      },
    });

    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `settle_usr_${suffix}@firuzo.com`,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-SET-${suffix.toUpperCase()}`,
        customerId: user.id,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        ticketStatus: 'ISSUED',
        totalAmount: 14_000_000,
        currency: 'IRR',
        items: {
          create: {
            type: 'FLIGHT',
            inventoryItemId: invItem.id,
            netCost: 12_000_000,
            markup: 1_000_000,
            taxAmount: 1_000_000,
            sellPrice: 14_000_000,
          },
        },
      },
    });
    testBookingId = booking.id;

    expect(booking.id).toBeDefined();
  });

  it('SET-001: Generates a supplier settlement batch aggregating supplier net payables', async () => {
    const periodStart = new Date(Date.now() - 7 * 86400000);
    const periodEnd = new Date(Date.now() + 86400000);

    const batch = await SettlementDomainService.createSettlementBatch({
      supplierId: testSupplierId,
      periodStart,
      periodEnd,
      currency: 'IRR',
    });
    testBatchId = batch.id;

    expect(batch.totalPayable.toString()).toBe('12000000');
    expect(batch.netSettlement.toString()).toBe('12000000');
    expect(batch.status).toBe('OPEN');
  });

  it('RECON-001: Reconciles matching supplier statement and marks batch RECONCILED', async () => {
    const statement = await prisma.supplierStatement.create({
      data: {
        supplierId: testSupplierId,
        statementNumber: `STMT_${suffix}_MATCH`,
        periodStart: new Date(Date.now() - 7 * 86400000),
        periodEnd: new Date(Date.now() + 86400000),
        totalAmount: 12_000_000, // Exact match with batch netSettlement
        currency: 'IRR',
        status: 'PENDING',
      },
    });

    const recon = await SettlementDomainService.reconcileSupplierStatement({
      statementId: statement.id,
      batchId: testBatchId,
    });

    expect(recon.matched).toBe(true);
    expect(recon.status).toBe('RECONCILED');
    expect(recon.variance.isZero()).toBe(true);

    const checkBatch = await prisma.settlementBatch.findUniqueOrThrow({
      where: { id: testBatchId },
    });
    expect(checkBatch.status).toBe('RECONCILED');
  });

  it('RECON-001, OPS-001: Flags operational exception on supplier statement variance', async () => {
    const mismatchStatement = await prisma.supplierStatement.create({
      data: {
        supplierId: testSupplierId,
        statementNumber: `STMT_${suffix}_MISMATCH`,
        periodStart: new Date(Date.now() - 7 * 86400000),
        periodEnd: new Date(Date.now() + 86400000),
        totalAmount: 15_000_000, // Over-billing: 15M claimed vs 12M in batch
        currency: 'IRR',
        status: 'PENDING',
      },
    });

    const recon = await SettlementDomainService.reconcileSupplierStatement({
      statementId: mismatchStatement.id,
      batchId: testBatchId,
    });

    expect(recon.matched).toBe(false);
    expect(recon.status).toBe('DISCREPANCY');
    expect(recon.exceptionId).toBeDefined();

    // Verify exception in Exception Center
    const exception = await prisma.operationalException.findUniqueOrThrow({
      where: { id: recon.exceptionId },
    });
    expect(exception.severity).toBe('HIGH');
    expect(exception.status).toBe('OPEN');
    expect(exception.type).toBe('SUPPLIER_STATEMENT_MISMATCH');
  });
});
