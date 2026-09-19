import { describe, it, expect } from 'vitest';
import {
  getCapability,
  getAllCapabilities,
  isCapabilityLive,
  isCapabilityAvailable,
  getPublicCapabilitiesSummary,
} from './index';

describe('Product Capability Registry (CAP-001)', () => {
  it('loads all defined capabilities with valid metadata and evidence paths', () => {
    const all = getAllCapabilities();
    const keys = Object.keys(all);
    expect(keys.length).toBeGreaterThanOrEqual(23);

    for (const key of keys) {
      const cap = all[key as keyof typeof all];
      expect(cap.key).toBe(key);
      // Inline copy is OPTIONAL: entries without it (e.g. services.cip /
      // services.insurance) are enriched server-side from messages/*.json →
      // capabilityRegistry (I18N-103). What must always hold: either inline
      // copy or an evidence path backing the feature.
      expect(cap.evidencePath).toBeTruthy();
      expect(['LIVE', 'BETA', 'SIMULATED', 'MOCK', 'DISABLED', 'COMING_SOON']).toContain(cap.status);
      if (cap.name) {
        expect(cap.name.fa).toBeTruthy();
        expect(cap.name.en).toBeTruthy();
      }
      if (cap.description) {
        expect(cap.description.fa).toBeTruthy();
      }
    }
  });

  it('correctly tracks commerce capabilities (cardToCard, aiRouter, loyaltyStreak)', () => {
    const cardToCard = getCapability('payment.cardToCard');
    expect(['BETA', 'DISABLED']).toContain(cardToCard.status);
    expect(cardToCard.category).toBe('payment');

    const aiRouter = getCapability('ai.router');
    expect(aiRouter.status).toBe('LIVE');
    expect(aiRouter.isReal).toBe(true);

    const loyaltyStreak = getCapability('loyalty.streak');
    expect(loyaltyStreak.status).toBe('LIVE');
    expect(loyaltyStreak.isReal).toBe(true);

    const manualRefund = getCapability('refund.manual');
    expect(manualRefund.status).toBe('LIVE');

    const erpOps = getCapability('erp.operations');
    expect(erpOps.status).toBe('LIVE');
    expect(erpOps.evidencePath).toBe('src/domains/refund/RefundDomainService.ts');
  });

  it('correctly reports wallet as LIVE and real', () => {
    const wallet = getCapability('payment.wallet');
    expect(wallet.status).toBe('LIVE');
    expect(wallet.isReal).toBe(true);
    expect(isCapabilityLive('payment.wallet')).toBe(true);
    expect(isCapabilityAvailable('payment.wallet')).toBe(true);
  });

  it('correctly reports flight supplier as MOCK or SIMULATED catalog until live credentials connected', () => {
    const flightSupplier = getCapability('supplier.flights');
    expect(['MOCK', 'SIMULATED']).toContain(flightSupplier.status);
    expect(flightSupplier.isReal).toBe(false);
  });

  it('correctly reports visa/mastercard as COMING_SOON without fabricating live card processing', () => {
    const visa = getCapability('payment.visa');
    const mastercard = getCapability('payment.mastercard');
    expect(visa.status).toBe('COMING_SOON');
    expect(mastercard.status).toBe('COMING_SOON');
    expect(visa.isReal).toBe(false);
  });

  it('generates a clean public summary without leaking internal paths', () => {
    const summary = getPublicCapabilitiesSummary();
    expect(summary['payment.wallet']).toBeDefined();
    expect(summary['payment.wallet'].status).toBe('LIVE');
    expect(summary['payment.wallet'].badgeLabel.fa).toBe('فعال');
    expect((summary['payment.wallet'] as Record<string, unknown>).evidencePath).toBeUndefined();
  });
});
