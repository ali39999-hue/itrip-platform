import { describe, it, expect } from 'vitest';
import { evaluateUserKycTier, evaluateTransactionKycLimit } from './kyc-payment-rules';

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

  it('does NOT automatically grant Level 2 to admin without identity verification (Section 11)', () => {
    const adminWithoutDocs = evaluateUserKycTier({
      role: 'admin',
      kycApproved: false,
      nationalId: null,
      passportNo: null,
    });
    expect(adminWithoutDocs.tier).toBe('level_0_unverified');
    expect(adminWithoutDocs.allowsBnplInstallment).toBe(false);
  });

  it('grants Level 2 to admin ONLY when staffKycExemption is explicitly enabled in policy options', () => {
    const adminWithExemption = evaluateUserKycTier(
      {
        role: 'admin',
        kycApproved: false,
      },
      { staffKycExemption: true }
    );
    expect(adminWithExemption.tier).toBe('level_2_verified');
    expect(adminWithExemption.allowsBnplInstallment).toBe(true);
  });

  describe('Multi-Currency KYC Limit Evaluation (Section 12)', () => {
    it('evaluates transaction amounts in USD against user KYC tier limit', () => {
      const level1Tier = evaluateUserKycTier({
        kycApproved: true,
        nationalId: '0079279511',
      }); // 200,000,000 Toman cap

      // $2,000 * 60,000 = 120M Toman <= 200M Toman -> ALLOWED
      const allowedRes = evaluateTransactionKycLimit({
        amount: 2000,
        currency: 'USD',
        userKycTier: level1Tier,
        fxRateToToman: 60000,
      });
      expect(allowedRes.allowed).toBe(true);
      expect(allowedRes.equivalentToman).toBe(120_000_000);

      // $5,000 * 60,000 = 300M Toman > 200M Toman -> REJECTED
      const rejectedRes = evaluateTransactionKycLimit({
        amount: 5000,
        currency: 'USD',
        userKycTier: level1Tier,
        fxRateToToman: 60000,
      });
      expect(rejectedRes.allowed).toBe(false);
      expect(rejectedRes.reason).toBeDefined();
    });

    it('evaluates multi-currency transactions in AED, CNY, and EUR', () => {
      const unverifiedTier = evaluateUserKycTier(null); // 50,000,000 Toman cap

      // 15,000 AED * 16,000 = 240,000,000 Toman > 50M -> REJECTED
      const aedRes = evaluateTransactionKycLimit({
        amount: 15000,
        currency: 'AED',
        userKycTier: unverifiedTier,
        fxRateToToman: 16000,
      });
      expect(aedRes.allowed).toBe(false);

      // 2,000 CNY * 8,000 = 16,000,000 Toman <= 50M -> ALLOWED
      const cnyRes = evaluateTransactionKycLimit({
        amount: 2000,
        currency: 'CNY',
        userKycTier: unverifiedTier,
        fxRateToToman: 8000,
      });
      expect(cnyRes.allowed).toBe(true);
    });
  });
});
