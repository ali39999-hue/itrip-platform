import { describe, it, expect, beforeEach } from 'vitest';
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

    it('recognizes clr_admin_123 as admin', async () => {
      expect(await isUserAdmin('clr_admin_123')).toBe(true);
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
      await setSystemPaymentMode('demo', 'clr_admin_123');
      expect(await getSystemPaymentMode()).toBe('demo');

      await setSystemPaymentMode('real', 'clr_admin_123');
      expect(await getSystemPaymentMode()).toBe('real');
    });
  });

  describe('resolveEffectivePaymentMode resolution priority', () => {
    it('non-admin user gets system mode even if cookie override is attempted', async () => {
      await setSystemPaymentMode('real', 'clr_admin_123');

      const nonAdminId = 'cust_regular_non_admin';
      const resolved = await resolveEffectivePaymentMode({
        userId: nonAdminId,
        cookieOverride: 'demo',
      });

      // Since cust_regular_non_admin is not an admin, cookie override is ignored
      expect(resolved).toBe('real');
    });

    it('admin user can use cookie override to switch between real and demo on the fly', async () => {
      await setSystemPaymentMode('real', 'clr_admin_123');

      const resolvedDemo = await resolveEffectivePaymentMode({
        userId: 'clr_admin_123',
        cookieOverride: 'demo',
      });
      expect(resolvedDemo).toBe('demo');

      const resolvedReal = await resolveEffectivePaymentMode({
        userId: 'clr_admin_123',
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
