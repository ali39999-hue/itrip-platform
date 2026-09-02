import { describe, it, expect } from 'vitest';
import { BookingStateMachine, BookingState } from '@/domains/booking/state-machine';
import { ROLE_DEFAULT_PERMISSIONS } from '@/domains/identity/permissions';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
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

    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(InventoryEngine.createHold({
        inventoryItemId: item.id,
        date: '2026-09-02',
        quantity: 1,
      }));
    }

    const results = await Promise.all(promises);
    const successfulHolds = results.filter(r => r.success);
    
    expect(successfulHolds.length).toBe(10);
  });
});
