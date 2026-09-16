import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  isUserAdmin,
  getSystemPaymentMode,
  setSystemPaymentMode,
  resolveEffectivePaymentMode,
  ADMIN_PAYMENT_MODE_KEY,
} from './admin-payment-mode';
import { EcardoGatewayAdapter } from './adapters/EcardoGatewayAdapter';
import { Money } from '@/lib/finance';

describe('Admin Payment Mode & Security Architecture', () => {
  // SEC: admin identity is a real DB user holding the relational SUPER_ADMIN role.
  // The suite previously asserted that the hardcoded id `clr_admin_123` was an
  // admin by itself — exactly the static bypass that was removed.
  const suffix = `paymode_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let adminId = '';
  let roleId = '';

  beforeAll(async () => {
    const role = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', permissions: '[]', description: 'SUPER_ADMIN Role' },
    });
    roleId = role.id;

    const admin = await prisma.user.create({
      data: { email: `paymode_admin_${suffix}@firuzo.com`, name: 'PayMode Admin', role: 'CUSTOMER', isActive: true },
    });
    adminId = admin.id;
    await prisma.userRole.create({ data: { userId: adminId, roleId } });
  });

  afterAll(async () => {
    try {
      await prisma.userRole.deleteMany({ where: { userId: adminId } });
      await prisma.user.deleteMany({ where: { id: adminId } });
    } catch {
      // best-effort cleanup
    }
  });

  beforeEach(async () => {
    // Clean up test key in SiteContent
    await prisma.siteContent.deleteMany({
      where: { key: ADMIN_PAYMENT_MODE_KEY },
    });
  });

  describe('isUserAdmin gate', () => {
    it('rejects empty or undefined userId', async () => {
      expect(await isUserAdmin(undefined)).toBe(false);
      expect(await isUserAdmin('')).toBe(false);
    });

    it('recognizes a live user holding the relational SUPER_ADMIN role', async () => {
      expect(await isUserAdmin(adminId)).toBe(true);
    });

    it('no longer recognizes the retired static id (bypass removed)', async () => {
      expect(await isUserAdmin('clr_admin_123')).toBe(false);
    });

    it('rejects a normal customer without admin roles', async () => {
      const customer = await prisma.user.create({
        data: {
          id: `test_cust_${Date.now()}`,
          phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
          role: 'CUSTOMER',
        },
      });

      expect(await isUserAdmin(customer.id)).toBe(false);

      await prisma.user.delete({ where: { id: customer.id } });
    });
  });

  describe('System Payment Mode & SiteContent persistence', () => {
    it('sets and reads system payment mode in SiteContent', async () => {
      await setSystemPaymentMode('demo', adminId);
      expect(await getSystemPaymentMode()).toBe('demo');

      await setSystemPaymentMode('real', adminId);
      expect(await getSystemPaymentMode()).toBe('real');
    });
  });

  describe('resolveEffectivePaymentMode resolution priority', () => {
    it('non-admin user gets system mode even if cookie override is attempted', async () => {
      await setSystemPaymentMode('real', adminId);

      const resolved = await resolveEffectivePaymentMode({
        userId: `cust_regular_non_admin_${suffix}`,
        cookieOverride: 'demo',
      });

      // Not an admin (no DB row, no relational ERP role) -> cookie override ignored
      expect(resolved).toBe('real');
    });

    it('admin user can use cookie override to switch between real and demo on the fly', async () => {
      await setSystemPaymentMode('real', adminId);

      const resolvedDemo = await resolveEffectivePaymentMode({
        userId: adminId,
        cookieOverride: 'demo',
      });
      expect(resolvedDemo).toBe('demo');

      const resolvedReal = await resolveEffectivePaymentMode({
        userId: adminId,
        cookieOverride: 'real',
      });
      expect(resolvedReal).toBe('real');
    });
  });

  describe('EcardoGatewayAdapter routing contract', () => {
    it('routes to demo simulator when paymentMode is explicitly "demo"', async () => {
      const adapter = new EcardoGatewayAdapter();
      const amount = new Money(1500000, 'IRR');

      const res = await adapter.createPayment({
        intentId: 'intent_test_1',
        bookingId: 'book_test_123',
        amount,
        callbackUrl: 'http://localhost:3000/callback',
        paymentMode: 'demo',
      });

      expect(res.success).toBe(true);
      expect(res.redirectUrl).toContain('/demo/ecardo-checkout');
      expect(res.redirectUrl).toContain('ref=FZ');
      expect(res.status).toBe('PENDING_CUSTOMER');
      expect(res.rawResponse?.demo).toBe(true);
    });

    it('attempts real gateway and rejects missing credentials when paymentMode is "real"', async () => {
      // With unconfigured keys and explicit real mode, it must fail-closed rather than fall back to demo
      const adapter = new EcardoGatewayAdapter({ publicKey: '' });
      const amount = new Money(1500000, 'IRR');

      await expect(
        adapter.createPayment({
          intentId: 'intent_test_2',
          bookingId: 'book_test_456',
          amount,
          callbackUrl: 'http://localhost:3000/callback',
          paymentMode: 'real',
        })
      ).rejects.toThrow('ECARDO_PUBLIC_KEY is required');
    });
  });
});
