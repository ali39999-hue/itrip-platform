import { describe, it, expect, vi } from 'vitest';
import { UnifiedCartService, UnifiedCartItem } from './UnifiedCartService';
import { HotelRatePlanService } from '@/domains/pricing/HotelRatePlanService';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';

describe('Phase 3: Unified Cross-Product Cart & Hospitality Rate Plans', () => {
  describe('UnifiedCartService.calculateCartPricing', () => {
    it('calculates single item pricing without bundle discount', () => {
      const items: UnifiedCartItem[] = [
        {
          type: 'FLIGHT',
          itemId: 'fl_01',
          title: 'پرواز تهران به استانبول',
          count: 2,
          unitPrice: 15_000_000,
          travelDate: '2026-09-20',
        },
      ];

      const pricing = UnifiedCartService.calculateCartPricing(items, 'IRR');
      expect(pricing.grossAmount).toBe(30_000_000);
      expect(pricing.bundleDiscountAmount).toBe(0);
      expect(pricing.netAmount).toBe(30_000_000);
      expect(pricing.hasFlightHotelCombo).toBe(false);
    });

    it('applies 5% combo discount when both Flight and Hotel are in the cart', () => {
      const items: UnifiedCartItem[] = [
        {
          type: 'FLIGHT',
          itemId: 'fl_01',
          title: 'پرواز رفت و برگشت استانبول',
          count: 2,
          unitPrice: 20_000_000, // 40M
          travelDate: '2026-09-20',
        },
        {
          type: 'HOTEL',
          itemId: 'ht_01',
          title: 'هتل ۵ ستاره هیلتون بوسفوروس',
          count: 1, // 1 room
          nights: 3, // 3 nights
          unitPrice: 20_000_000, // 60M
          travelDate: '2026-09-20',
        },
      ];

      const pricing = UnifiedCartService.calculateCartPricing(items, 'IRR');
      expect(pricing.hasFlightHotelCombo).toBe(true);
      expect(pricing.grossAmount).toBe(100_000_000); // 40M + 60M
      expect(pricing.bundleDiscountPercent).toBe(0.05);
      expect(pricing.bundleDiscountAmount).toBe(5_000_000); // 5% of 100M
      expect(pricing.netAmount).toBe(95_000_000);
    });
  });

  describe('HotelRatePlanService', () => {
    it('calculates Breakfast Included rate plan (+10%)', () => {
      const res = HotelRatePlanService.calculateRate({
        basePricePerNight: 10_000_000,
        nights: 2,
        rooms: 1,
        ratePlanCode: 'BREAKFAST_INCLUDED',
      });

      expect(res.unitPricePerNight).toBe(11_000_000);
      expect(res.totalAmount).toBe(22_000_000);
      expect(res.plan.includesBreakfast).toBe(true);
      expect(res.plan.isRefundable).toBe(true);
    });

    it('calculates Non-Refundable discount rate plan (-8%)', () => {
      const res = HotelRatePlanService.calculateRate({
        basePricePerNight: 10_000_000,
        nights: 3,
        rooms: 1,
        ratePlanCode: 'NON_REFUNDABLE',
      });

      expect(res.unitPricePerNight).toBe(9_200_000);
      expect(res.totalAmount).toBe(27_600_000);
      expect(res.plan.isRefundable).toBe(false);
      expect(res.plan.cancellationHoursBefore).toBe(0);
    });
  });

  describe('All-or-Nothing Hold Coordination (Miracuves / Lulan)', () => {
    it('rolls back all acquired holds if a subsequent item in the batch fails', async () => {
      const releaseSpy = vi.spyOn(InventoryEngine, 'releaseHold').mockResolvedValue({ success: true });
      let callCount = 0;

      vi.spyOn(InventoryEngine, 'createHold').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { success: true, token: 'hld_flight_success_1' };
        }
        // Second item (hotel) fails due to sold out
        return { success: false, error: 'Oversell prevented' };
      });

      const items: UnifiedCartItem[] = [
        {
          type: 'FLIGHT',
          itemId: 'fl_01',
          inventoryItemId: 'inv_flight_1',
          title: 'پرواز تهران',
          count: 1,
          unitPrice: 10_000_000,
          travelDate: '2026-09-20',
        },
        {
          type: 'HOTEL',
          itemId: 'ht_01',
          inventoryItemId: 'inv_hotel_sold_out',
          title: 'هتل پرشده',
          count: 1,
          unitPrice: 20_000_000,
          travelDate: '2026-09-20',
        },
      ];

      const res = await UnifiedCartService.acquireAllOrNothingHolds(items);
      expect(res.success).toBe(false);
      expect(res.error).toContain('موجودی "هتل پرشده" به اتمام رسیده است');

      // Crucial invariant: releaseHold MUST be called on the first acquired token!
      expect(releaseSpy).toHaveBeenCalledWith('hld_flight_success_1');
    });
  });
});
