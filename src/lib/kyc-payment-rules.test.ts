import { describe, it, expect } from 'vitest';
import { evaluateUserKycTier } from './kyc-payment-rules';

describe('KYC Payment Rules Evaluation', () => {
  it('identifies unverified guest user as Level 0', () => {
    const tier = evaluateUserKycTier(null);
    expect(tier.tier).toBe('level_0_unverified');
    expect(tier.allowsWallet).toBe(false);
    expect(tier.allowsBnplInstallment).toBe(false);
    expect(tier.requiresKycAction).toBe(true);
  });

  it('identifies basic verified national ID user as Level 1', () => {
    const tier = evaluateUserKycTier({
      kycApproved: true,
      nationalId: '0079279511',
      passportNo: null,
    });
    expect(tier.tier).toBe('level_1_basic');
    expect(tier.allowsShetab).toBe(true);
    expect(tier.allowsWallet).toBe(true);
    expect(tier.allowsBnplInstallment).toBe(false);
  });

  it('identifies fully verified user (national ID + passport) as Level 2 Gold with BNPL', () => {
    const tier = evaluateUserKycTier({
      kycApproved: true,
      nationalId: '0079279511',
      passportNo: 'L2948175',
    });
    expect(tier.tier).toBe('level_2_verified');
    expect(tier.allowsBnplInstallment).toBe(true);
    expect(tier.allowsInternationalCards).toBe(true);
    expect(tier.requiresKycAction).toBe(false);
  });

  it('identifies international foreign passport as international tier', () => {
    const tier = evaluateUserKycTier({
      kycApproved: true,
      nationalId: null,
      passportNo: 'U1839201',
    });
    expect(tier.tier).toBe('international');
    expect(tier.allowsInternationalCards).toBe(true);
    expect(tier.allowsCrypto).toBe(true);
  });

  it('grants full Level 2 privileges to admin users', () => {
    const tier = evaluateUserKycTier({
      role: 'admin',
    });
    expect(tier.tier).toBe('level_2_verified');
    expect(tier.allowsBnplInstallment).toBe(true);
  });
});
