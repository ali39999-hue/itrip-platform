import { describe, it, expect } from 'vitest';
import {
  LedgerInvariantValidator,
  UnbalancedLedgerInvariantException,
} from './LedgerInvariantValidator';
import { LeaderCommissionService } from '@/domains/referral/LeaderCommissionService';
import {
  PassengerManifestService,
  ManifestPassenger,
} from '@/domains/booking/PassengerManifestService';

describe('Phase 4: Atomic Ledger Invariants, Leader Settlements & Manifests', () => {
  describe('LedgerInvariantValidator (ShopVerse pattern)', () => {
    it('accepts perfectly balanced debit and credit entries', () => {
      const entries = [
        { direction: 'DEBIT', amount: 50_000_000, currency: 'IRR' },
        { direction: 'CREDIT', amount: 50_000_000, currency: 'IRR' },
      ];

      expect(() => {
        LedgerInvariantValidator.assertBalancedPosting(entries, 'test_group_1');
      }).not.toThrow();
    });

    it('throws UnbalancedLedgerInvariantException when debits do not match credits', () => {
      const entries = [
        { direction: 'DEBIT', amount: 50_000_000, currency: 'IRR' },
        { direction: 'CREDIT', amount: 48_000_000, currency: 'IRR' }, // 2M variance
      ];

      expect(() => {
        LedgerInvariantValidator.assertBalancedPosting(entries, 'test_group_2');
      }).toThrow(UnbalancedLedgerInvariantException);
    });

    it('rejects multi-currency unhedged postings', () => {
      const entries = [
        { direction: 'DEBIT', amount: 100, currency: 'USDT' },
        { direction: 'CREDIT', amount: 100, currency: 'AED' }, // Currency mismatch
      ];

      expect(() => {
        LedgerInvariantValidator.assertBalancedPosting(entries, 'test_group_fx_err');
      }).toThrow(UnbalancedLedgerInvariantException);
    });
  });

  describe('LeaderCommissionService (Voyant / Open Travel CRM pattern)', () => {
    it('evaluates tiered commission rates correctly based on passenger count', () => {
      expect(LeaderCommissionService.evaluateTierReward(5)).toBe(0.025); // Tier 1: 2.5%
      expect(LeaderCommissionService.evaluateTierReward(15)).toBe(0.05); // Tier 2: 5.0%
      expect(LeaderCommissionService.evaluateTierReward(30)).toBe(0.08); // Tier 3: 8.0%
    });

    it('computes reward amount accurately', () => {
      const reward = LeaderCommissionService.computeReward({
        referralCode: 'LEADER_KOOH',
        leaderId: 'usr_leader_1',
        bookingTotal: 100_000_000,
        paxCount: 12,
        currency: 'IRR',
      });

      expect(reward.rewardPercent).toBe(0.05);
      expect(reward.rewardAmount).toBe(5_000_000); // 5% of 100M
      expect(reward.isEligible).toBe(true);
    });
  });

  describe('PassengerManifestService (ToursAndTravels pattern)', () => {
    it('formats CSV output with correct headers and escaping', () => {
      const passengers: ManifestPassenger[] = [
        {
          index: 1,
          bookingRef: 'ITR-10023',
          fullName: 'Ali Rezaei',
          nationalId: '0012345678',
          passportNo: 'A12345678',
          birthDate: '1990-05-12',
          gender: 'MALE',
          nationality: 'IR',
          seat: '14A',
          status: 'CONFIRMED',
          contactPhone: '+989123456789',
          serviceType: 'FLIGHT',
        },
      ];

      const csv = PassengerManifestService.generateCsv(passengers);
      expect(csv).toContain('Index,Booking Reference,Full Name');
      expect(csv).toContain('"ITR-10023"');
      expect(csv).toContain('"Ali Rezaei"');
      expect(csv).toContain('"14A"');
    });
  });
});
