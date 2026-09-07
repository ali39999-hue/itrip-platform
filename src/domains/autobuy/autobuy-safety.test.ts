import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AutoBuyDomainService, AUTO_BUY_SAFETY } from './AutoBuyDomainService';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';

describe('Auto-Buy Safety & Governance Suite (AUTO-101 to AUTO-110)', () => {
  const suffix = `abs_${Date.now().toString(36)}`;
  let kycUser: { id: string };
  let unverifiedUser: { id: string };

  beforeEach(async () => {
    AutoBuyDomainService.setKillSwitch(false);

    // KYC-approved user (has nationalId)
    kycUser = await prisma.user.create({
      data: {
        id: `usr_kyc_${suffix}_${Math.random().toString(36).slice(2, 6)}`,
        email: `kyc_${Math.random().toString(36).slice(2, 6)}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'KYC Verified Traveler',
        nationalId: '0011223344',
        role: 'CUSTOMER',
      },
    });

    // Unverified user (no nationalId, no agency membership)
    unverifiedUser = await prisma.user.create({
      data: {
        id: `usr_unv_${suffix}_${Math.random().toString(36).slice(2, 6)}`,
        email: `unv_${Math.random().toString(36).slice(2, 6)}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'Unverified Traveler',
        nationalId: null,
        role: 'CUSTOMER',
      },
    });

    // Top up KYC user wallet with 500,000,000 IRR
    await GeneralLedgerService.postTopUp({
      groupId: `topup_autobuy_${suffix}_${Math.random().toString(36).slice(2, 6)}`,
      userId: kycUser.id,
      amount: new Money(500_000_000, 'IRR'),
      currency: 'IRR',
    });
  });

  afterEach(() => {
    AutoBuyDomainService.setKillSwitch(false);
  });

  it('AUTO-101: Rejects auto-buy rule creation for unverified users without KYC or agency credentials', async () => {
    // In test environment, temporarily turn off DEMO_MODE to test production authorization check
    const originalDemo = process.env.DEMO_MODE;
    const originalNodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.DEMO_MODE;

    try {
      await expect(
        AutoBuyDomainService.createRule(unverifiedUser.id, {
          title: 'Unverified Auto-Purchase',
          serviceType: 'TOURS',
          targetDate: '2026-10-15',
          maxPrice: 20_000_000,
        })
      ).rejects.toThrow('AUTO_BUY_UNAUTHORIZED');

      // KYC-approved user is authorized
      const rule = await AutoBuyDomainService.createRule(kycUser.id, {
        title: 'Verified Auto-Purchase',
        serviceType: 'TOURS',
        targetDate: '2026-10-15',
        maxPrice: 20_000_000,
      });
      expect(rule.id).toBeDefined();
    } finally {
      process.env.DEMO_MODE = originalDemo;
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    }
  });

  it('AUTO-102: Enforces per-rule spend ceiling (rejects rules exceeding maxSpendPerRule)', async () => {
    const excessivePrice = AUTO_BUY_SAFETY.DEFAULT_MAX_SPEND_PER_RULE + 10_000_000;

    await expect(
      AutoBuyDomainService.createRule(kycUser.id, {
        title: 'Overpriced Auto-Purchase',
        serviceType: 'FLIGHTS',
        targetDate: '2026-10-15',
        maxPrice: excessivePrice,
      })
    ).rejects.toThrow('SPEND_CEILING_EXCEEDED');
  });

  it('AUTO-106: Emergency Kill Switch immediately halts auto-buy evaluations and sweeps', async () => {
    const rule = await AutoBuyDomainService.createRule(kycUser.id, {
      title: 'Kill Switch Test Rule',
      serviceType: 'TOURS',
      targetDate: '2026-10-15',
      maxPrice: 50_000_000,
    });

    // Activate kill switch
    AutoBuyDomainService.setKillSwitch(true);

    const evalResult = await AutoBuyDomainService.evaluateRule(rule.id);
    expect(evalResult.executed).toBe(false);
    expect(evalResult.reason).toContain('KILL_SWITCH_ACTIVE');

    const sweepResult = await AutoBuyDomainService.runSweep();
    expect(sweepResult.executed).toBe(0);
    expect(sweepResult.scanned).toBe(0);
  });

  it('AUTO-105: Price deviation guard blocks auto-purchase when fare drops > 40% (potential bug)', async () => {
    // Target price is 50,000,000 IRR, but airline offer is 12,500,000 IRR (> 70% drop)
    const match = await AutoBuyDomainService.checkMatch({
      serviceType: 'FLIGHTS',
      targetId: null,
      origin: 'تهران',
      destination: 'مشهد',
      targetDate: '2026-10-15',
      maxPrice: new Prisma.Decimal(50_000_000),
      passengerCount: 1,
    });

    expect(match.matched).toBe(false);
    expect(match.blockedReason).toContain('PRICE_DEVIATION_SUSPICIOUS');
  });

  it('AUTO-109: High-value thresholds trigger human approval mode (PENDING_APPROVAL)', async () => {
    // Create rule for high-value tour package (e.g. 250M IRR)
    const rule = await AutoBuyDomainService.createRule(kycUser.id, {
      title: 'High-Value VIP Package',
      serviceType: 'TOURS',
      targetDate: '2026-10-15',
      maxPrice: 300_000_000,
      bypassSpendCeiling: true,
    });

    // Mock checkMatch to return a high-value match of 250,000,000 IRR
    const originalCheckMatch = AutoBuyDomainService.checkMatch;
    AutoBuyDomainService.checkMatch = async () => ({
      matched: true,
      pricePerPerson: 250_000_000,
      totalCost: 250_000_000,
      itemId: 'vip_tour_101',
      description: 'VIP Tour 250M',
      supplierCode: 'TOURS',
    });

    try {
      const res = await AutoBuyDomainService.evaluateRule(rule.id);
      expect(res.executed).toBe(false);
      expect(res.reason).toContain('HIGH_VALUE_PENDING_APPROVAL');

      // Verify status transitioned to PENDING_APPROVAL
      const updated = await prisma.autoBuyRule.findUnique({ where: { id: rule.id } });
      expect(updated?.status).toBe('PENDING_APPROVAL');

      // Human approval by staff
      const approvalRes = await AutoBuyDomainService.approveHighValueRule(rule.id, 'staff_admin_01');
      expect(approvalRes.executed).toBe(true);
      expect(approvalRes.success).toBe(true);

      const fulfilledRule = await prisma.autoBuyRule.findUnique({ where: { id: rule.id } });
      expect(fulfilledRule?.status).toBe('FULFILLED');
    } finally {
      AutoBuyDomainService.checkMatch = originalCheckMatch;
    }
  });

  it('AUTO-107 & AUTO-108: Execution is idempotent and records full audit trail', async () => {
    const rule = await AutoBuyDomainService.createRule(kycUser.id, {
      title: 'Audit & Idempotency Rule',
      serviceType: 'TOURS',
      targetId: 't2',
      targetDate: '2026-10-15',
      maxPrice: 60_000_000,
    });

    // Verify creation audit log
    const createLog = await prisma.auditLog.findFirst({
      where: { resourceId: rule.id, action: 'AUTO_BUY_RULE_CREATED' },
    });
    expect(createLog).not.toBeNull();

    // Execute once
    const res1 = await AutoBuyDomainService.evaluateRule(rule.id);
    expect(res1.executed).toBe(true);
    expect(res1.success).toBe(true);

    // Immediate second evaluation should be an idempotent no-op (rule is already FULFILLED)
    const res2 = await AutoBuyDomainService.evaluateRule(rule.id);
    expect(res2.executed).toBe(false);
    expect(res2.reason).toContain('not active');

    // Verify fulfillment audit log
    const fulfillLog = await prisma.auditLog.findFirst({
      where: { resourceId: rule.id, action: 'AUTO_BUY_PURCHASE_FULFILLED' },
    });
    expect(fulfillLog).not.toBeNull();
  });
});
