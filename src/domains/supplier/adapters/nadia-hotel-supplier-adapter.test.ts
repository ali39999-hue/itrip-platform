import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NadiaHotelSupplierAdapter, distributeGuests } from './NadiaHotelSupplierAdapter';
import type { NadiaCrsClient } from './NadiaCrsClient';
import type { NadiaAvailabilityHotel, NadiaCity } from './NadiaCrsClient';

function fakeClient(overrides: {
  cities?: NadiaCity[];
  hotels?: NadiaAvailabilityHotel[];
  prebook?: Record<string, unknown>;
  book?: Record<string, unknown>;
} = {}): NadiaCrsClient {
  return {
    searchCities: vi.fn().mockResolvedValue(overrides.cities ?? [{ id: 302, name: 'Shiraz' }]),
    hotelAvailability: vi.fn().mockResolvedValue({ Hotels: overrides.hotels ?? [] }),
    hotelPreBook: vi.fn().mockResolvedValue(overrides.prebook ?? { slug: 'slug-1' }),
    hotelBook: vi.fn().mockResolvedValue(overrides.book ?? { voucher_number: 'VCH-9' }),
  } as unknown as NadiaCrsClient;
}

const AVAILABILITY_FIXTURE: NadiaAvailabilityHotel[] = [
  {
    HotelId: 1033979,
    HotelName: 'Grand Shiraz',
    Options: [
      {
        OptionId: 'opt-1',
        FreeCancellation: true,
        IsReserveOnline: true,
        Fare: { Currency: 'USD', Price: 200, Tax: { Included: 0, NonIncluded: 6.22 } },
        Rooms: [{ MealType: 'Breakfast', RoomId: 'r-1', Name: 'Standard double', Adults: 2, Children: 0 }],
        Policies: [{ Cost: 882.31, Currency: 'USD', From: '2026-10-01 17:00:00T01:00' }],
      },
      {
        OptionId: 'opt-2',
        FreeCancellation: false,
        IsReserveOnline: false,
        Fare: { Currency: 'IRR', Price: 9_000_000 },
        Rooms: [{ MealType: 'Room Only', RoomId: 'r-2', Name: 'Suite', Adults: 2, Children: 0 }],
        Policies: [],
      },
    ],
  },
];

describe('Nadia hotel supplier adapter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NADIA_CRS_USERNAME;
    delete process.env.NADIA_CRS_PASSWORD;
    delete process.env.NADIA_CRS_TOKEN;
    delete process.env.NADIA_CRS_ENABLE_BOOK;
    delete process.env.NADIA_CRS_NATIONALITY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns honest empty results in dev when unconfigured (no fabricated inventory)', async () => {
    const adapter = new NadiaHotelSupplierAdapter();
    expect(NadiaHotelSupplierAdapter.isConfigured()).toBe(false);
    await expect(adapter.search({ city: 'Shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 })).resolves.toEqual([]);
    await expect(adapter.checkAvailability('1', '2026-10-01', '2026-10-03')).resolves.toBe(false);
  });

  it('is fail-closed in production when unconfigured', async () => {
    process.env.NODE_ENV = 'production';
    const adapter = new NadiaHotelSupplierAdapter();
    await expect(adapter.search({ city: 'Shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 })).rejects.toThrow('FAIL_CLOSED: Nadia CRS credentials missing');
    await expect(adapter.book({ hotelId: '1', roomId: 'opt-1', checkIn: '2026-10-01', checkOut: '2026-10-03', guestName: 'Ali', guestPhone: '0912' })).rejects.toThrow('FAIL_CLOSED');
  });

  it('resolves the city and maps availability options onto canonical rates', async () => {
    const client = fakeClient({ hotels: AVAILABILITY_FIXTURE });
    const adapter = new NadiaHotelSupplierAdapter({ client });
    const results = await adapter.search({ city: 'Shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 });

    expect(client.searchCities).toHaveBeenCalledWith('Shiraz', 1);
    const availabilityBody = (client.hotelAvailability as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(availabilityBody).toMatchObject({ CityId: 302, NationalityId: 'IR', CheckIn: '2026-10-01', CheckOut: '2026-10-03' });
    expect(availabilityBody.Rooms).toEqual([{ AdultCount: 2, ChildCount: 0, ChildAges: [] }]);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ hotelId: '1033979', name: 'Grand Shiraz', stars: 0 });
    expect(results[0].rates).toHaveLength(2);

    const [breakfastOption, roomOnlyOption] = results[0].rates;
    expect(breakfastOption).toMatchObject({
      roomId: 'opt-1',
      mealPlan: 'BREAKFAST',
      refundable: true,
      totalPrice: 200,
      pricePerNight: 100, // 2 nights
      currency: 'USD',
    });
    expect(breakfastOption.cancellationPolicy).toContain('882.31 USD');
    expect(roomOnlyOption).toMatchObject({ roomId: 'opt-2', mealPlan: 'ROOM_ONLY', refundable: false, currency: 'IRR' });
  });

  it('returns empty when the city cannot be resolved', async () => {
    const client = fakeClient({ cities: [] });
    const adapter = new NadiaHotelSupplierAdapter({ client });
    await expect(adapter.search({ city: 'Nowhere', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 })).resolves.toEqual([]);
    expect(client.hotelAvailability).not.toHaveBeenCalled();
  });

  it('caches resolved city ids across searches', async () => {
    const client = fakeClient({ hotels: AVAILABILITY_FIXTURE });
    const adapter = new NadiaHotelSupplierAdapter({ client });
    await adapter.search({ city: 'Shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 });
    await adapter.search({ city: 'shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 });
    expect(client.searchCities).toHaveBeenCalledTimes(1);
  });

  it('uses a custom nationality from env', async () => {
    process.env.NADIA_CRS_NATIONALITY = 'US';
    const client = fakeClient({ hotels: AVAILABILITY_FIXTURE });
    const adapter = new NadiaHotelSupplierAdapter({ client });
    await adapter.search({ city: 'Shiraz', checkIn: '2026-10-01', checkOut: '2026-10-03', rooms: 1, guests: 2 });
    expect((client.hotelAvailability as ReturnType<typeof vi.fn>).mock.calls[0][0].NationalityId).toBe('US');
  });

  it('spreads guests across rooms with at least one adult each', () => {
    expect(distributeGuests(1, 2)).toEqual([{ AdultCount: 2, ChildCount: 0, ChildAges: [] }]);
    expect(distributeGuests(2, 4)).toEqual([
      { AdultCount: 2, ChildCount: 0, ChildAges: [] },
      { AdultCount: 2, ChildCount: 0, ChildAges: [] },
    ]);
    expect(distributeGuests(2, 3)).toEqual([
      { AdultCount: 2, ChildCount: 0, ChildAges: [] },
      { AdultCount: 1, ChildCount: 0, ChildAges: [] },
    ]);
    expect(distributeGuests(3, 1)).toEqual([
      { AdultCount: 1, ChildCount: 0, ChildAges: [] },
      { AdultCount: 1, ChildCount: 0, ChildAges: [] },
      { AdultCount: 1, ChildCount: 0, ChildAges: [] },
    ]);
  });

  it('refuses to book unless NADIA_CRS_ENABLE_BOOK is explicitly enabled', async () => {
    const client = fakeClient();
    const adapter = new NadiaHotelSupplierAdapter({ client });
    const result = await adapter.book({ hotelId: '1', roomId: 'opt-1', checkIn: '2026-10-01', checkOut: '2026-10-03', guestName: 'Ali', guestPhone: '0912' });

    expect(result).toMatchObject({ success: false, status: 'FAILED', error: /NADIA_CRS_ENABLE_BOOK/ });
    expect(client.hotelPreBook).not.toHaveBeenCalled();
  });

  it('chains preBook → book and returns the voucher when enabled', async () => {
    process.env.NADIA_CRS_ENABLE_BOOK = 'true';
    const client = fakeClient({ prebook: { slug: 'slug-1', status: 'pending' }, book: { voucher_number: 'VCH-9', status: 'ok' } });
    const adapter = new NadiaHotelSupplierAdapter({ client });
    const result = await adapter.book({ hotelId: '1033979', roomId: 'opt-1', checkIn: '2026-10-01', checkOut: '2026-10-03', guestName: 'Ali Ahmadi', guestPhone: '09121234567' });

    expect(client.hotelPreBook).toHaveBeenCalledWith(expect.objectContaining({ OptionId: 'opt-1', PhoneNumber: '09121234567' }));
    expect(client.hotelBook).toHaveBeenCalledWith('opt-1', expect.objectContaining({ slug: 'slug-1', passengers_info: ['Ali Ahmadi'] }));
    expect(result).toMatchObject({ success: true, status: 'CONFIRMED', voucherNumber: 'VCH-9', confirmationCode: 'slug-1' });
  });

  it('checkAvailability is true only when at least one option exists', async () => {
    const withOptions = fakeClient({ hotels: AVAILABILITY_FIXTURE });
    const withoutOptions = fakeClient({ hotels: [{ HotelId: 1, HotelName: 'X', Options: [] }] });

    const adapterA = new NadiaHotelSupplierAdapter({ client: withOptions });
    const adapterB = new NadiaHotelSupplierAdapter({ client: withoutOptions });

    await expect(adapterA.checkAvailability('1033979', '2026-10-01', '2026-10-03')).resolves.toBe(true);
    await expect(adapterB.checkAvailability('1033979', '2026-10-01', '2026-10-03')).resolves.toBe(false);
  });
});
