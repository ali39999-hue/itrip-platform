import { describe, expect, it } from 'vitest';
import { CheckoutApplicationService } from './CheckoutApplicationService';

describe('CheckoutApplicationService', () => {
  describe('calculateBreakdown', () => {
    it('calculates standard checkout totals without addons or discount', () => {
      const result = CheckoutApplicationService.calculateBreakdown({
        baseAmount: 10_000_000,
        addEsim: false,
        addInsurance: false,
        referralDiscountAmount: 0,
        country: 'iran',
        paymentMethod: 'gateway_shetab',
      });

      expect(result.addonsTotal).toBe(0);
      expect(result.subtotalBeforeFees).toBe(10_000_000);
      expect(result.totalPayable).toBeGreaterThanOrEqual(10_000_000);
      expect(result.effectiveDiscount).toBe(0);
    });

    it('adds eSIM and insurance addons correctly to subtotal', () => {
      const withoutAddons = CheckoutApplicationService.calculateBreakdown({
        baseAmount: 10_000_000,
        addEsim: false,
        addInsurance: false,
        referralDiscountAmount: 0,
        country: 'iran',
        paymentMethod: 'gateway_shetab',
      });

      const withAddons = CheckoutApplicationService.calculateBreakdown({
        baseAmount: 10_000_000,
        addEsim: true,
        addInsurance: true,
        referralDiscountAmount: 0,
        country: 'iran',
        paymentMethod: 'gateway_shetab',
      });

      expect(withAddons.addonsTotal).toBeGreaterThan(0);
      expect(withAddons.subtotalBeforeFees).toBe(
        withoutAddons.subtotalBeforeFees + withAddons.addonsTotal
      );
    });

    it('ensures subtotal cannot become negative if discount exceeds base price', () => {
      const result = CheckoutApplicationService.calculateBreakdown({
        baseAmount: 1_000_000,
        addEsim: false,
        addInsurance: false,
        referralDiscountAmount: 5_000_000,
        country: 'iran',
        paymentMethod: 'gateway_shetab',
      });

      expect(result.subtotalBeforeFees).toBe(0);
      expect(result.totalPayable).toBe(0);
    });

    it('handles NaN or negative base amount safely', () => {
      const result = CheckoutApplicationService.calculateBreakdown({
        baseAmount: -500_000,
        addEsim: false,
        addInsurance: false,
        referralDiscountAmount: 0,
        country: 'iran',
        paymentMethod: 'gateway_shetab',
      });

      expect(result.subtotalBeforeFees).toBe(0);
      expect(result.totalPayable).toBe(0);
    });
  });

  describe('normalizePassengerManifest', () => {
    it('slices and trims passenger records according to expected count', () => {
      const raw = [
        {
          firstName: '  Ali  ',
          lastName: ' Rezaei ',
          nationalId: '0012345678',
          passportNo: 'A12345678',
          gender: 'MALE' as const,
        },
        {
          firstName: 'Sara',
          lastName: 'Ahmadi',
          nationalId: '0087654321',
          passportNo: 'B87654321',
          gender: 'FEMALE' as const,
        },
        {
          firstName: 'Extra',
          lastName: 'Passenger',
          gender: 'MALE' as const,
        },
      ];

      const normalized = CheckoutApplicationService.normalizePassengerManifest(raw, 2, false);
      expect(normalized.passengers).toHaveLength(2);
      expect(normalized.passengers[0].firstName).toBe('Ali');
      expect(normalized.passengers[0].lastName).toBe('Rezaei');
      expect(normalized.hasIncompleteRequiredFields).toBe(false);
    });

    it('flags incomplete required fields when international passenger lacks passport number', () => {
      const raw = [
        {
          firstName: 'John',
          lastName: 'Doe',
          nationalId: '',
          passportNo: '',
          gender: 'MALE' as const,
        },
      ];

      const normalized = CheckoutApplicationService.normalizePassengerManifest(raw, 1, false);
      expect(normalized.hasIncompleteRequiredFields).toBe(true);
    });

    it('permits missing passport for domestic passengers when national ID is present', () => {
      const raw = [
        {
          firstName: 'Reza',
          lastName: 'Mohammadi',
          nationalId: '0012345678',
          passportNo: '',
          gender: 'MALE' as const,
        },
      ];

      const normalized = CheckoutApplicationService.normalizePassengerManifest(raw, 1, true);
      expect(normalized.hasIncompleteRequiredFields).toBe(false);
    });
  });

  describe('evaluatePriceDrift', () => {
    it('detects no drift when prices match exactly', () => {
      const drift = CheckoutApplicationService.evaluatePriceDrift({
        serverRepriceAmount: 10_000_000,
        checkoutExpectedAmount: 10_000_000,
        currency: 'IRR',
        acceptedByCustomer: false,
      });

      expect(drift.hasDrift).toBe(false);
      expect(drift.diff).toBe(0);
      expect(drift.requiresConfirmation).toBe(false);
    });

    it('requires confirmation when server price differs and customer has not accepted yet', () => {
      const drift = CheckoutApplicationService.evaluatePriceDrift({
        serverRepriceAmount: 12_000_000,
        checkoutExpectedAmount: 10_000_000,
        currency: 'IRR',
        acceptedByCustomer: false,
      });

      expect(drift.hasDrift).toBe(true);
      expect(drift.diff).toBe(2_000_000);
      expect(drift.requiresConfirmation).toBe(true);
    });

    it('does not require confirmation when customer already accepted the price change', () => {
      const drift = CheckoutApplicationService.evaluatePriceDrift({
        serverRepriceAmount: 12_000_000,
        checkoutExpectedAmount: 10_000_000,
        currency: 'IRR',
        acceptedByCustomer: true,
      });

      expect(drift.hasDrift).toBe(true);
      expect(drift.requiresConfirmation).toBe(false);
    });
  });
});
