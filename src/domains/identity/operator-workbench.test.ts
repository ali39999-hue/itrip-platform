import { describe, it, expect } from 'vitest';
import { ROLE_DEFAULT_PERMISSIONS, ERP_STAFF_ROLES } from '@/domains/identity/permissions';
import { getLoyaltyTierView } from '@/lib/loyalty-tiers';
import { DEFAULT_ACCOUNT_SIDEBAR, DEFAULT_SUPPORT_PAGE } from '@/lib/account-panel-defaults';
import { SITE_CONTENT_SCHEMAS } from '@/domains/content/SiteContentService';

describe('Operator Role & Permissions (IAM-001 / پنل اپراتور)', () => {
  it('includes OPERATOR in ERP_STAFF_ROLES so back-office access is granted relationally', () => {
    expect(ERP_STAFF_ROLES).toContain('OPERATOR');
  });

  it('provisions front-line booking capabilities to OPERATOR without finance settlement rights', () => {
    const operatorPerms = ROLE_DEFAULT_PERMISSIONS.OPERATOR;
    expect(operatorPerms).toContain('booking:view:all');
    expect(operatorPerms).toContain('booking:confirm:on-request');
    expect(operatorPerms).toContain('ops:notify');
    expect(operatorPerms).toContain('traveler:pii:view');

    // Deliberate security invariants: operators cannot touch finance reconciliation or role management
    expect(operatorPerms).not.toContain('finance:settlement:match');
    expect(operatorPerms).not.toContain('role:manage');
    expect(operatorPerms).not.toContain('supplier:contract:manage');
  });
});

describe('Dynamic Customer Panel (پنل مشتری داینامیک)', () => {
  it('validates account.sidebar schema correctly', () => {
    const valid = SITE_CONTENT_SCHEMAS['account.sidebar'].safeParse(DEFAULT_ACCOUNT_SIDEBAR);
    expect(valid.success).toBe(true);

    const invalid = SITE_CONTENT_SCHEMAS['account.sidebar'].safeParse({
      links: [{ href: 'invalid-url', label: { fa: 'تست', en: 'Test' } }],
    });
    expect(invalid.success).toBe(false);
  });

  it('validates support.page schema correctly', () => {
    const valid = SITE_CONTENT_SCHEMAS['support.page'].safeParse(DEFAULT_SUPPORT_PAGE);
    expect(valid.success).toBe(true);
  });

  it('computes loyalty tiers and progression accurately from coin balance', () => {
    // Bronze
    const bronze = getLoyaltyTierView(0);
    expect(bronze.tier.key).toBe('BRONZE');
    expect(bronze.nextTier?.key).toBe('SILVER');
    expect(bronze.progress).toBe(0);

    // Silver mid-way (150..400)
    const midSilver = getLoyaltyTierView(275);
    expect(midSilver.tier.key).toBe('SILVER');
    expect(midSilver.nextTier?.key).toBe('GOLD');
    expect(midSilver.progress).toBeCloseTo(0.5, 2);

    // Platinum cap (>= 1000)
    const plat = getLoyaltyTierView(1500);
    expect(plat.tier.key).toBe('PLATINUM');
    expect(plat.nextTier).toBeNull();
    expect(plat.progress).toBe(1);
  });
});
