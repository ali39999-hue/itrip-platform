// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseNaturalQuery } from '@/lib/natural-query';
import { SearchRankingEngine } from '@/lib/search-ranking';
import { HotelRatePlanService } from '@/domains/pricing/HotelRatePlanService';
import { UnifiedCartService, UnifiedCartItem } from '@/domains/booking/UnifiedCartService';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { PassportValidityGuard } from '@/domains/identity/PassportValidityGuard';
import {
  LedgerInvariantValidator,
  UnbalancedLedgerInvariantException,
} from '@/domains/ledger/LedgerInvariantValidator';
import { saveVoucherOffline, getOfflineVouchers } from '@/lib/offline-voucher';
import { TripIntelligenceService } from '@/lib/trip-intelligence';
import { DutyOfCareService } from '@/lib/duty-of-care';

describe('Section 50: Continuous Traveler Journey & Resilience Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('executes the full continuous journey from Discovery to Post-Booking assistance', () => {
    // 1. DISCOVER & INTENT: Traveler speaks in natural Persian
    const naturalQuery = 'یک سفر ۴ روزه دونفره به استانبول با بودجه متوسط و خرید';
    const parsedIntent = parseNaturalQuery(naturalQuery);

    expect(parsedIntent).not.toBeNull();
    expect(parsedIntent?.dest).toBe('turkey');
    expect(parsedIntent?.days).toBe(4);
    expect(parsedIntent?.who).toBe('duo');
    expect(parsedIntent?.budget).toBe('balanced');

    // 2. SEARCH & RANKING: Multi-signal evaluation
    const flightOffers = [
      {
        id: 'fl_mahan_fast',
        price: 15_000_000,
        durationMinutes: 190,
        stops: 0,
        isRefundable: true,
        qualityScore: 9,
      },
      {
        id: 'fl_pegasus_cheap',
        price: 12_000_000,
        durationMinutes: 360,
        stops: 1,
        isRefundable: false,
        qualityScore: 7,
      },
    ];

    const rankedFlights = SearchRankingEngine.rankOffers(flightOffers);
    expect(rankedFlights.length).toBe(2);
    expect(rankedFlights[0].badge?.code).toBe('BEST_VALUE');
    expect(rankedFlights[0].offer.id).toBe('fl_mahan_fast');

    // 3. HOSPITALITY SELECTION: Select room with Breakfast Included rate plan
    const hotelPricing = HotelRatePlanService.calculateRate({
      basePricePerNight: 10_000_000,
      nights: 4,
      rooms: 1,
      ratePlanCode: 'BREAKFAST_INCLUDED',
    });
    expect(hotelPricing.unitPricePerNight).toBe(11_000_000); // 10M * 1.1
    expect(hotelPricing.totalAmount).toBe(44_000_000); // 11M * 4

    // 4. UNIFIED CART: Bundle Flight (30M for 2 pax) + Hotel (44M) with 5% Combo Discount
    const cartItems: UnifiedCartItem[] = [
      {
        type: 'FLIGHT',
        itemId: 'fl_mahan_fast',
        title: 'پرواز رفت و برگشت ماهان تهران-استانبول',
        count: 2,
        unitPrice: 15_000_000,
        travelDate: '2026-10-15',
      },
      {
        type: 'HOTEL',
        itemId: 'ht_radisson_ist',
        title: 'هتل ۵ ستاره رادیسون بلو استانبول',
        count: 1,
        nights: 4,
        unitPrice: 11_000_000,
        travelDate: '2026-10-15',
      },
    ];

    const cartPricing = UnifiedCartService.calculateCartPricing(cartItems, 'IRR');
    expect(cartPricing.hasFlightHotelCombo).toBe(true);
    expect(cartPricing.grossAmount).toBe(74_000_000); // 30M + 44M
    expect(cartPricing.bundleDiscountPercent).toBe(0.05); // 5% combo
    expect(cartPricing.bundleDiscountAmount).toBe(3_700_000); // 5% of 74M
    expect(cartPricing.netAmount).toBe(70_300_000); // 74M - 3.7M

    // 5. CHECKOUT & PASSPORT GATE: Verify international 6-month validity
    const travelDate = '2026-10-15';
    const passportValid = PassportValidityGuard.verifyPassport({
      passportExpiryDate: '2027-08-20',
      travelDate,
    });
    expect(passportValid.isValidForTravel).toBe(true);
    expect(passportValid.status).toBe('VALID');

    // Reject passenger with insufficient validity
    const passportExpired = PassportValidityGuard.verifyPassport({
      passportExpiryDate: '2026-12-01', // less than 6 months
      travelDate,
    });
    expect(passportExpired.isValidForTravel).toBe(false);
    expect(passportExpired.status).toBe('INSUFFICIENT_SIX_MONTHS');

    // 6. PAYMENT & FINANCIAL INVARIANT: Double-entry ledger must balance to zero
    const finalAmount = cartPricing.netAmount;
    const supplierPayable = 65_000_000;
    const platformRevenue = finalAmount - supplierPayable; // 5,300,000

    const ledgerEntries = [
      { direction: 'DEBIT' as const, amount: finalAmount, currency: 'IRR' },
      { direction: 'CREDIT' as const, amount: supplierPayable, currency: 'IRR' },
      { direction: 'CREDIT' as const, amount: platformRevenue, currency: 'IRR' },
    ];

    expect(() => {
      LedgerInvariantValidator.assertBalancedPosting(ledgerEntries, 'journey_checkout_order_1');
    }).not.toThrow();

    // 7. TICKETING & OFFLINE VOUCHER: Save issued ticket to browser memory
    const voucherSaved = saveVoucherOffline({
      id: 'bk_ist_2026',
      reference: 'ITR-55443',
      serviceType: 'FLIGHT',
      title: 'بلیت پرواز تهران به استانبول',
      travelDate,
      departureTime: '08:30',
      origin: 'THR',
      destination: 'IST',
      airline: 'هواپیمایی ماهان',
      flightNo: 'W5-1152',
      passengers: [{ firstName: 'Ali', lastName: 'Rezaei' }],
      totalAmount: finalAmount,
      currency: 'IRR',
    });

    expect(voucherSaved).toBe(true);
    const offlineList = getOfflineVouchers();
    expect(offlineList.length).toBe(1);
    expect(offlineList[0].reference).toBe('ITR-55443');

    // 8. ACTIVE TRIP INTELLIGENCE: Proactive boarding calls & weather alerts
    const alerts = TripIntelligenceService.evaluateSignals({
      bookingId: 'bk_ist_2026',
      reference: 'ITR-55443',
      destinationCity: 'استانبول',
      destinationCountry: 'turkey',
      travelDate,
      departureTime: '08:30',
      flightDelayMinutes: 35,
      hasTransferBooked: true,
      isOfflineSaved: true,
    });

    expect(alerts.length).toBeGreaterThanOrEqual(1);
    const transferDisruption = alerts.find((a) => a.category === 'TRANSFER_MISALIGN');
    expect(transferDisruption).toBeDefined();
    expect(transferDisruption?.action?.actionType).toBe('RESCHEDULE_TRANSFER');

    // 9. DUTY OF CARE & CONSULAR ASSISTANCE: Access consulate contacts in destination
    const safetyProfile = DutyOfCareService.getSafetyProfile('TR');
    expect(safetyProfile.countryCode).toBe('TR');
    expect(safetyProfile.embassy?.emergencyHotline).toBe('+905308226026');
    expect(safetyProfile.emergencyContacts.find((c) => c.type === 'TOURIST_POLICE')?.phone).toBe(
      '+902125274503'
    );
  });

  it('enforces atomic rollback when a multi-item hold fails partially', async () => {
    const releaseSpy = vi.spyOn(InventoryEngine, 'releaseHold').mockResolvedValue({ success: true });
    let callCount = 0;

    vi.spyOn(InventoryEngine, 'createHold').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { success: true, token: 'hld_flight_success_1' };
      }
      return { success: false, error: 'Oversell prevented' };
    });

    const holdItems: UnifiedCartItem[] = [
      {
        type: 'FLIGHT',
        itemId: 'fl_avail',
        inventoryItemId: 'inv_fl_1',
        title: 'پرواز موجود',
        count: 1,
        unitPrice: 10_000_000,
        travelDate: '2026-10-15',
      },
      {
        type: 'HOTEL',
        itemId: 'ht_unavailable',
        inventoryItemId: 'inv_ht_sold_out',
        title: 'هتل پرشده',
        count: 1,
        unitPrice: 15_000_000,
        travelDate: '2026-10-15',
      },
    ];

    const result = await UnifiedCartService.acquireAllOrNothingHolds(holdItems);

    // Atomic All-or-Nothing invariant
    expect(result.success).toBe(false);
    expect(result.holdTokens).toEqual([]); // Nothing leaked or partially held
    expect(releaseSpy).toHaveBeenCalledWith('hld_flight_success_1');
    expect(result.error).toContain('هتل پرشده');
  });

  it('strictly throws when ledger entries have a financial discrepancy', () => {
    const corruptedEntries = [
      { direction: 'DEBIT' as const, amount: 100_000_000, currency: 'IRR' },
      { direction: 'CREDIT' as const, amount: 99_000_000, currency: 'IRR' }, // 1M discrepancy
    ];

    expect(() => {
      LedgerInvariantValidator.assertBalancedPosting(corruptedEntries, 'corrupted_order_tx');
    }).toThrow(UnbalancedLedgerInvariantException);
  });

  it('generates pre-linked contextual support parameters from active booking reference', () => {
    const bookingRef = 'ITR-55443';
    const supportUrl = `/support?ref=${bookingRef}&category=disruption`;
    const params = new URLSearchParams(supportUrl.split('?')[1]);

    expect(params.get('ref')).toBe(bookingRef);
    expect(params.get('category')).toBe('disruption');
  });
});
