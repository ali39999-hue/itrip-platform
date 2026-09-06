import { describe, it, expect } from 'vitest';
import { BookingStateMachine, BookingState } from '@/domains/booking/state-machine';
import { ROLE_DEFAULT_PERMISSIONS } from '@/domains/identity/permissions';
import { calculatePricing, roundCurrency } from '@/lib/pricing/engine';

describe('ERP Domain Tests: State Machine Transitions', () => {
  it('allows valid state machine progressions', () => {
    expect(BookingStateMachine.canTransition('DRAFT', 'HELD')).toBe(true);
    expect(BookingStateMachine.canTransition('HELD', 'PENDING_PAYMENT')).toBe(true);
    expect(BookingStateMachine.canTransition('PENDING_PAYMENT', 'PAYMENT_CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransition('PAYMENT_CONFIRMED', 'CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransition('CONFIRMED', 'CANCEL_REQUESTED')).toBe(true);
  });

  it('rejects invalid state machine skips', () => {
    expect(BookingStateMachine.canTransition('DRAFT', 'CONFIRMED')).toBe(false);
    expect(BookingStateMachine.canTransition('DRAFT', 'REFUNDED')).toBe(false);
    expect(BookingStateMachine.canTransition('CONFIRMED', 'DRAFT')).toBe(false);
  });

  it('throws an error on illegal transitions via assertTransition', () => {
    expect(() => {
      BookingStateMachine.assertTransition('DRAFT' as BookingState, 'CONFIRMED' as BookingState);
    }).toThrow(/Invalid state transition/);
  });
});

describe('ERP Domain Tests: RBAC Permissions', () => {
  it('assigns full operational and financial permissions to SUPER_ADMIN', () => {
    const adminPerms = ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN;
    expect(adminPerms).toContain('booking:view:all');
    expect(adminPerms).toContain('finance:reports:view');
    expect(adminPerms).toContain('booking:refund:approve');
    expect(adminPerms).toContain('inventory:manage');
  });

  it('restricts customer permissions to basic booking creations', () => {
    const customerPerms = ROLE_DEFAULT_PERMISSIONS.CUSTOMER;
    expect(customerPerms).toContain('booking:create');
    expect(customerPerms).not.toContain('finance:reports:view');
    expect(customerPerms).not.toContain('booking:refund:approve');
  });
});

describe('ERP Domain Tests: Pricing & Rounding Engine', () => {
  it('correctly rounds IRR amounts to nearest 10,000 Rial increments', () => {
    const { rounded } = roundCurrency(1234567, 'IRR');
    expect(rounded % 10000).toBe(0);
  });

  it('applies custom markup, taxes and discounts for B2B vs Customer', () => {
    const custPricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'HOTEL',
      basePrice: 10000000,
      currency: 'IRR',
    });
    const b2bPricing = calculatePricing({
      userRole: 'B2B',
      productType: 'HOTEL',
      basePrice: 10000000,
      currency: 'IRR',
    });
    expect(b2bPricing.sellPrice).toBeLessThan(custPricing.sellPrice);
  });
});

import * as fs from 'fs';
import * as path from 'path';

describe('ERP Domain Tests: No direct assignment of status or Date.now() used in keys', () => {
  function findFiles(dir: string, ext: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file: string) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(findFiles(file, ext));
        } else if (file.endsWith(ext)) {
            results.push(file);
        }
    });
    return results;
  }

  it('verifies that no Date.now() is used for idempotency keys or refund group ids', () => {
    const allFiles = findFiles(path.join(__dirname, '..'), '.ts');
    let hasDateNowInKey = false;
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.match(/`pay_.*\${Date\.now\(\)}`/)) {
        hasDateNowInKey = true;
      }
      if (content.match(/`refund_.*\${Date\.now\(\)}`/)) {
        hasDateNowInKey = true;
      }
    }
    expect(hasDateNowInKey).toBe(false);
  });
});

import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { prisma } from '@/lib/prisma';

describe('ERP Domain Tests: Inventory Holds', () => {
  it('prevents overselling (Hold atomicity test)', async () => {
    const supplier = await prisma.supplier.create({
      data: { name: 'Test Supplier', type: 'HOTEL' }
    });
    
    const item = await prisma.inventoryItem.create({
      data: { supplierId: supplier.id, type: 'HOTEL_ROOM', name: 'Deluxe Room', basePrice: 100 }
    });

    await prisma.allotment.create({
      data: { inventoryItemId: item.id, date: '2026-09-02', total: 10, booked: 0 }
    });

    const results = [];
    for (let i = 0; i < 15; i++) {
      const res = await InventoryEngine.createHold({
        inventoryItemId: item.id,
        date: '2026-09-02',
        quantity: 1,
      });
      results.push(res);
    }

    const successfulHolds = results.filter(r => r.success);
    
    expect(successfulHolds.length).toBe(10);
  });
});

import { TravelFileDomainService } from '@/domains/erp/TravelFileDomainService';
import { CommissionService } from '@/domains/finance/CommissionService';

describe('ERP Domain Tests: Travel Files (ERP-001)', () => {
  const suffix = `tf_${Date.now().toString(36)}`;
  let testUserId = '';
  let testBookingId = '';
  let testTripId = '';

  it('assigns booking to a new or open Trip dossier and updates status on confirmation', async () => {
    const user = await prisma.user.create({
      data: { id: `usr_${suffix}`, email: `tf_${suffix}@test.local`, name: 'Travel File Tester' },
    });
    testUserId = user.id;

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-TF-${suffix}`,
        customerId: user.id,
        status: 'PENDING_PAYMENT',
        totalAmount: 1_000_000,
        currency: 'IRR',
      },
    });
    testBookingId = booking.id;

    // 1. Assign booking to Trip dossier
    const { tripId, reference } = await TravelFileDomainService.assignBookingToTrip(user.id, booking.id, 'HOTEL');
    testTripId = tripId;
    expect(tripId).toBeDefined();
    expect(reference).toMatch(/^TRP-/);

    const linkedBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(linkedBooking.tripId).toBe(tripId);

    // 2. On booking confirmed, Trip advances to BOOKED
    await TravelFileDomainService.onBookingConfirmed(booking.id);
    const updatedTrip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(updatedTrip.status).toBe('BOOKED');

    // Cleanup
    await prisma.booking.deleteMany({ where: { id: testBookingId } });
    await prisma.trip.deleteMany({ where: { id: testTripId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });
});

describe('ERP Domain Tests: Commercial Commission Engine (FIN-013 to FIN-015)', () => {
  it('calculates baseline commission and prorates adjustment on refund', async () => {
    // 1. Accrue baseline commission for an agency (3% default)
    const accrued = await CommissionService.accrueCommission({
      bookingId: 'test_bkg_1',
      targetType: 'AGENCY',
      productType: 'HOTEL',
      bookingAmount: 10_000_000,
      currency: 'IRR',
    });

    expect(accrued.accrued).toBe(true);
    expect(accrued.appliedRate).toBe(0.03);
    // 10,000,000 * 3% = 300,000 IRR
    expect(accrued.commissionAmount.toNumber()).toBe(300_000);

    // 2. 50% cancellation refund adjusts commission by half
    const adjustment = CommissionService.adjustCommission({
      originalCommission: accrued.commissionAmount,
      refundRatio: 0.5,
    });

    expect(adjustment.clawbackAmount.toNumber()).toBe(150_000);
    expect(adjustment.adjustedCommission.toNumber()).toBe(150_000);
  });
});
