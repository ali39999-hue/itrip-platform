import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { InventoryEngine } from './InventoryEngine';
import { RefundDomainService } from '../refund/RefundDomainService';
import { prisma } from '@/lib/prisma';

/**
 * Hardening suite for the InventoryEngine authority boundary (INV-004/005/010):
 * capacity mutations only via the engine, compensation restores captured
 * capacity exactly once, and refunds release captured holds atomically.
 */
describe('Inventory Engine policy & compensation (INV-004, INV-005, INV-010)', () => {
  const suffix = `inv_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  const date = new Date().toISOString().split('T')[0];

  let supplierId = '';
  let itemId = '';
  let allotmentId = '';
  let userId = '';
  let bookingId = '';
  let holdToken = '';
  let escrowGroupId = '';
  let refundLedgerGroupId = '';

  afterAll(async () => {
    try {
      if (refundLedgerGroupId) {
        await prisma.ledgerEntry.deleteMany({ where: { groupId: refundLedgerGroupId } });
      }
      if (escrowGroupId) {
        await prisma.ledgerEntry.deleteMany({ where: { groupId: escrowGroupId } });
      }
      if (bookingId) {
        const refunds = await prisma.refund.findMany({ where: { bookingId } });
        for (const r of refunds) {
          await prisma.refundAttempt.deleteMany({ where: { refundId: r.id } });
          await prisma.refundApproval.deleteMany({ where: { refundId: r.id } });
          await prisma.refundPolicySnapshot.deleteMany({ where: { refundId: r.id } });
          await prisma.refundItem.deleteMany({ where: { refundId: r.id } });
        }
        await prisma.refund.deleteMany({ where: { bookingId } });
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId } });
        await prisma.bookingItem.deleteMany({ where: { bookingId } });
        await prisma.booking.deleteMany({ where: { id: bookingId } });
      }
      await prisma.inventoryHold.deleteMany({ where: { inventoryItemId: itemId || undefined } });
      await prisma.allotment.deleteMany({ where: { inventoryItemId: itemId || undefined } });
      if (itemId) await prisma.inventoryItem.deleteMany({ where: { id: itemId } });
      if (supplierId) await prisma.supplier.deleteMany({ where: { id: supplierId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    } catch (e) {
      console.error('Inventory policy test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up supplier, item, allotment (total=5, booked=2) and user', async () => {
    const user = await prisma.user.create({
      data: { id: `usr_${suffix}`, email: `inv_${suffix}@firuzo.test`, name: 'Inv Tester' },
    });
    userId = user.id;

    const supplier = await prisma.supplier.create({
      data: { name: `Supplier ${suffix}`, type: 'HOTEL' },
    });
    supplierId = supplier.id;

    const item = await prisma.inventoryItem.create({
      data: { supplierId, type: 'HOTEL_ROOM', name: `Room ${suffix}`, basePrice: 1_000_000 },
    });
    itemId = item.id;

    const allotment = await prisma.allotment.create({
      data: { inventoryItemId: itemId, date, total: 5, booked: 2, stopSell: false },
    });
    allotmentId = allotment.id;

    expect(allotment.total).toBe(5);
    expect(allotment.booked).toBe(2);
  });

  it('INV-005: setAllotmentPolicy rejects total below booked capacity and accepts valid updates', async () => {
    const rejected = await InventoryEngine.setAllotmentPolicy(allotmentId, { total: 1 });
    expect(rejected.success).toBe(false);
    expect(rejected.error).toMatch(/below already-booked/i);

    const accepted = await InventoryEngine.setAllotmentPolicy(allotmentId, {
      total: 6,
      stopSell: true,
    });
    expect(accepted.success).toBe(true);

    const updated = await prisma.allotment.findUniqueOrThrow({ where: { id: allotmentId } });
    expect(updated.total).toBe(6);
    expect(updated.stopSell).toBe(true);
    // booked is untouched by a policy update
    expect(updated.booked).toBe(2);

    // restore for the compensation tests
    await InventoryEngine.setAllotmentPolicy(allotmentId, { total: 5, stopSell: false });
  });

  it('INV-010: compensating an ACTIVE hold releases it without touching capacity', async () => {
    const token = `hld_${suffix}_active`;
    await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: date,
        token,
        quantity: 2,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const res = await InventoryEngine.compensateCapturedHold(token);
    expect(res.success).toBe(true);
    expect(res.capacityRestored).toBe(false);

    const hold = await prisma.inventoryHold.findUniqueOrThrow({ where: { token } });
    expect(hold.status).toBe('RELEASED');

    const allotment = await prisma.allotment.findUniqueOrThrow({ where: { id: allotmentId } });
    expect(allotment.booked).toBe(2); // unchanged — ACTIVE never consumed capacity
  });

  it('INV-010: compensating a CAPTURED hold restores capacity exactly once (idempotent)', async () => {
    const token = `hld_${suffix}_captured`;
    // Allotment reflects the capture: booked = 2 base + 2 captured.
    await prisma.allotment.update({ where: { id: allotmentId }, data: { booked: 4 } });
    await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: date,
        token,
        quantity: 2,
        status: 'CAPTURED',
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const first = await InventoryEngine.compensateCapturedHold(token);
    expect(first.success).toBe(true);
    expect(first.capacityRestored).toBe(true);

    const afterFirst = await prisma.allotment.findUniqueOrThrow({ where: { id: allotmentId } });
    expect(afterFirst.booked).toBe(2);

    // Duplicate compensation must not push booked negative or re-release.
    const second = await InventoryEngine.compensateCapturedHold(token);
    expect(second.success).toBe(true);
    expect(second.capacityRestored).toBe(false);

    const afterSecond = await prisma.allotment.findUniqueOrThrow({ where: { id: allotmentId } });
    expect(afterSecond.booked).toBe(2);
    const hold = await prisma.inventoryHold.findUniqueOrThrow({ where: { token } });
    expect(hold.status).toBe('RELEASED');
  });

  it('INV-010 e2e: refunding a booking releases its captured hold in the same transaction', async () => {
    // Fund escrow so the ledger reversal has a source (same pattern as refund-domain suite).
    const escrowAcc = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' },
    });
    const settlementAcc = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: '#platform', currency: 'IRR' },
    });
    escrowGroupId = `seed_escrow_${suffix}`;
    await prisma.ledgerEntry.createMany({
      data: [
        { groupId: escrowGroupId, accountId: settlementAcc.id, direction: 'DEBIT', amount: 1_000_000, currency: 'IRR', referenceType: 'TOPUP' },
        { groupId: escrowGroupId, accountId: escrowAcc.id, direction: 'CREDIT', amount: 1_000_000, currency: 'IRR', referenceType: 'TOPUP' },
      ],
    });

    holdToken = `hld_${suffix}_refund`;
    // Allotment: booked = 2 base + 1 captured-by-this-booking.
    await prisma.allotment.update({ where: { id: allotmentId }, data: { booked: 3 } });
    await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: date,
        token: holdToken,
        quantity: 1,
        status: 'CAPTURED',
        bookingId: null, // linked to the booking below via booking.holdToken
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-INV-${suffix}`,
        customerId: userId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: 1_000_000,
        currency: 'IRR',
        holdToken,
        items: {
          create: [{ type: 'HOTEL', netCost: 800_000, markup: 200_000, sellPrice: 1_000_000 }],
        },
      },
    });
    bookingId = booking.id;

    const result = await RefundDomainService.processRefund({
      bookingId,
      idempotencyKey: `idem_inv_refund_${suffix}`,
      reason: 'Inventory compensation e2e',
    });

    expect(result.success).toBe(true);

    const refundedBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(refundedBooking.status).toBe('REFUNDED');

    const hold = await prisma.inventoryHold.findUniqueOrThrow({ where: { token: holdToken } });
    expect(hold.status).toBe('RELEASED');

    const allotment = await prisma.allotment.findUniqueOrThrow({ where: { id: allotmentId } });
    expect(allotment.booked).toBe(2); // restored by the refund transaction

    const refundRow = await prisma.refund.findFirstOrThrow({ where: { bookingId } });
    refundLedgerGroupId = `rfd_grp_${refundRow.id}`;
    const attempts = await prisma.refundAttempt.findMany({ where: { refundId: refundRow.id } });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('SUCCESS');
  });
});
