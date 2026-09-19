import { describe, it, expect } from 'vitest';
import { CipService } from './cip-service';
import { normalizeBookingType, cipBookingSchema } from '@/lib/validations';

describe('CipService', () => {
  it('should list all supported CIP airports with IKA as flagship', () => {
    const airports = CipService.getAirports();
    expect(airports.length).toBeGreaterThanOrEqual(5);

    const ika = CipService.getAirportByCode('IKA');
    expect(ika).toBeDefined();
    expect(ika?.isFlagship).toBe(true);
    expect(ika?.basePriceAdult).toBe(9900000); // 9.9M Toman (official rate)
    expect(ika?.basePriceGuest).toBe(3300000); // 3.3M Toman
  });

  it('should correctly calculate basic CIP price for 2 adults and 1 infant (infant free)', () => {
    const result = CipService.calculatePrice({
      airportCode: 'IKA',
      adults: 2,
      children: 0,
      infants: 1,
    });

    expect(result.adultsCount).toBe(2);
    expect(result.infantsCount).toBe(1);
    expect(result.subtotalToman).toBe(2 * 9900000); // 19,800,000 Toman
    expect(result.totalRials).toBe(19800000 * 10); // 198,000,000 IRR

    const infantItem = result.lineItems.find((i) => i.key === 'infants');
    expect(infantItem).toBeDefined();
    expect(infantItem?.totalPriceToman).toBe(0);
  });

  it('should accurately calculate add-ons: escort, pet, wheelchair, suite, and transfer', () => {
    const result = CipService.calculatePrice({
      airportCode: 'IKA',
      adults: 1,
      accompanyingGuests: 2, // 2 * 3,300,000 = 6,600,000
      petCount: 1, // 3,740,000
      wheelchairCount: 1, // 2,970,000
      suiteType: '6_HOURS', // 5,200,000
      transferVehicleId: 'v_sedan_mid', // Camry in Tehran = 2,190,000
      transferAddress: 'تهران، سعادت آباد',
    });

    const expectedTotal =
      9900000 + // 1 adult
      6600000 + // 2 accompanying guests
      3740000 + // 1 pet
      2970000 + // 1 wheelchair
      5200000 + // 6-hour suite
      2190000; // Camry transfer Tehran

    expect(result.subtotalToman).toBe(expectedTotal);
    expect(result.totalToman).toBe(expectedTotal);
    expect(result.totalRials).toBe(expectedTotal * 10);
    expect(result.lineItems.length).toBe(6);
  });

  it('should correctly calculate suburb surcharge for transfer (Karaj/Lavasan)', () => {
    const tehranRes = CipService.calculatePrice({
      airportCode: 'IKA',
      adults: 1,
      transferVehicleId: 'v_sedan_eco',
      transferAddress: 'تهران، میدان آزادی',
    });

    const karajRes = CipService.calculatePrice({
      airportCode: 'IKA',
      adults: 1,
      transferVehicleId: 'v_sedan_eco',
      transferAddress: 'کرج، عظیمیه',
    });

    const tehranTransfer = tehranRes.lineItems.find((i) => i.key === 'transfer');
    const karajTransfer = karajRes.lineItems.find((i) => i.key === 'transfer');

    expect(tehranTransfer?.totalPriceToman).toBe(1800000);
    expect(karajTransfer?.totalPriceToman).toBe(2400000); // Suburb rate
  });
});

describe('CIP Validations', () => {
  it('should normalize CIP booking type correctly', () => {
    expect(normalizeBookingType('CIP')).toBe('CIP');
    expect(normalizeBookingType('cip')).toBe('CIP');
    expect(normalizeBookingType('CIPS')).toBe('CIP');
    expect(normalizeBookingType('cips')).toBe('CIP');
  });

  it('should validate cipBookingSchema with valid input', () => {
    const validData = {
      airportCode: 'IKA',
      flightDirection: 'DEPARTURE',
      airline: 'Mahan Air',
      flightNumber: 'W5-061',
      flightDate: '2026-10-15',
      flightTime: '14:30',
      adults: 2,
      children: 1,
      infants: 0,
      accompanyingGuests: 1,
      petCount: 0,
      wheelchairCount: 0,
      suiteType: 'NONE',
      transferVehicle: 'NONE',
      contactName: 'علی رضایی',
      contactPhone: '09121234567',
    };

    const parsed = cipBookingSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid flight date format', () => {
    const invalidData = {
      airportCode: 'IKA',
      airline: 'Mahan Air',
      flightNumber: 'W5-061',
      flightDate: '15-10-2026', // invalid YYYY-MM-DD
      flightTime: '14:30',
      adults: 1,
      contactName: 'علی رضایی',
      contactPhone: '09121234567',
    };

    const parsed = cipBookingSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
