/**
 * KYC-Based Payment Tier & Service Allocation Rules.
 * 
 * Maps user identity verification status to permissible payment instruments,
 * transaction caps, and credit/installment (BNPL) eligibility.
 */

export type KycTierLevel = 'level_0_unverified' | 'level_1_basic' | 'level_2_verified' | 'international';

export interface KycPaymentProfile {
  tier: KycTierLevel;
  tierNameFa: string;
  tierNameEn: string;
  badgeColor: string;
  dailyLimitToman: number;
  allowsShetab: boolean;
  allowsWallet: boolean;
  allowsCardTransfer: boolean;
  allowsBnplInstallment: boolean;
  allowsInternationalCards: boolean;
  allowsCrypto: boolean;
  requiresKycAction: boolean;
  upgradeMessageFa?: string;
  upgradeMessageEn?: string;
}

export function evaluateUserKycTier(user: {
  kycApproved?: boolean;
  nationalId?: string | null;
  passportNo?: string | null;
  role?: string;
} | null | undefined): KycPaymentProfile {
  if (!user) {
    return {
      tier: 'level_0_unverified',
      tierNameFa: 'سطح ۰ (کاربر مهمان / احراز نشده)',
      tierNameEn: 'Level 0 (Unverified Guest)',
      badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300',
      dailyLimitToman: 50_000_000,
      allowsShetab: true,
      allowsWallet: false,
      allowsCardTransfer: false,
      allowsBnplInstallment: false,
      allowsInternationalCards: false,
      allowsCrypto: false,
      requiresKycAction: true,
      upgradeMessageFa: 'برای پرداخت از کیف پول، پرداخت اقساطی و سقف‌های بالاتر، احراز هویت خود را تکمیل نمایید.',
      upgradeMessageEn: 'Complete KYC verification to unlock wallet payouts, installments, and higher limits.',
    };
  }

  const hasPassport = Boolean(user.passportNo && user.passportNo.trim().length >= 6);
  const hasNationalId = Boolean(user.nationalId && user.nationalId.trim().length === 10);
  const isApproved = Boolean(user.kycApproved || user.role === 'admin');

  // Admin or verified with both ID and Passport = Level 2 (Full Verified)
  if (user.role === 'admin' || (isApproved && hasNationalId && hasPassport)) {
    return {
      tier: 'level_2_verified',
      tierNameFa: 'سطح ۲ طلایی (احراز هویت کامل)',
      tierNameEn: 'Level 2 Gold (Full KYC Verified)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
      dailyLimitToman: 1_000_000_000,
      allowsShetab: true,
      allowsWallet: true,
      allowsCardTransfer: true,
      allowsBnplInstallment: true,
      allowsInternationalCards: true,
      allowsCrypto: true,
      requiresKycAction: false,
    };
  }

  // International passport verified
  if (isApproved && hasPassport && !hasNationalId) {
    return {
      tier: 'international',
      tierNameFa: 'احراز هویت بین‌المللی (گذرنامه)',
      tierNameEn: 'International KYC (Passport Verified)',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300',
      dailyLimitToman: 500_000_000,
      allowsShetab: true,
      allowsWallet: true,
      allowsCardTransfer: false,
      allowsBnplInstallment: false,
      allowsInternationalCards: true,
      allowsCrypto: true,
      requiresKycAction: false,
    };
  }

  // Basic verified (National ID or basic KYC approved)
  if (isApproved || hasNationalId) {
    return {
      tier: 'level_1_basic',
      tierNameFa: 'سطح ۱ (احراز هویت پایه شتاب)',
      tierNameEn: 'Level 1 (Basic Shetab Verified)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
      dailyLimitToman: 200_000_000,
      allowsShetab: true,
      allowsWallet: true,
      allowsCardTransfer: true,
      allowsBnplInstallment: false,
      allowsInternationalCards: false,
      allowsCrypto: false,
      requiresKycAction: true,
      upgradeMessageFa: 'با ثبت و استعلام گذرنامه، خدمات پرداخت اقساطی اسنپ‌پی و درگاه ارزی بین‌المللی برای شما فعال می‌شود.',
      upgradeMessageEn: 'Add a verified passport to unlock BNPL installments and international gateways.',
    };
  }

  return {
    tier: 'level_0_unverified',
    tierNameFa: 'سطح ۰ (کاربر احراز نشده)',
    tierNameEn: 'Level 0 (Unverified)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
    dailyLimitToman: 50_000_000,
    allowsShetab: true,
    allowsWallet: false,
    allowsCardTransfer: false,
    allowsBnplInstallment: false,
    allowsInternationalCards: false,
    allowsCrypto: false,
    requiresKycAction: true,
    upgradeMessageFa: 'جهت فعال‌سازی خدمات پیشرفته بانکی و کیف پول، احراز هویت اولیه را انجام دهید.',
    upgradeMessageEn: 'Complete basic identity verification to activate wallet and advanced financial services.',
  };
}
