/**
 * Nadia CRS Hotel Supplier Adapter (SUP-002 port implementation).
 *
 * Bridges the canonical HotelSupplierPort onto NadiaCrsClient:
 * - Fail-closed: production throws when credentials are missing; dev returns
 *   honest empty results (no fabricated inventory — see OTP/real-payment policy).
 * - Booking is double-gated: requires live credentials AND NADIA_CRS_ENABLE_BOOK=true,
 *   because the preBook → book contract could not be live-verified without a
 *   working demo account yet (docs/NADIA_CRS_INTEGRATION.fa.md).
 */

import {
  type HotelSupplierPort,
  type HotelSearchQuery,
  type HotelPropertyResult,
  type HotelRoomRate,
  type HotelBookingCommand,
  type HotelBookingResult,
} from '../hotel-supplier-port';
import {
  NadiaCrsClient,
  NadiaCrsApiError,
  type NadiaAvailabilityOption,
  type NadiaRoomPax,
} from './NadiaCrsClient';

export const NADIA_CRS_SUPPLIER_CODE = 'NADIA_CRS';

const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MEAL_PLAN_MAP: Array<[RegExp, HotelRoomRate['mealPlan']]> = [
  [/all\s*inclusive|all\s*inc|\bai\b/i, 'ALL_INCLUSIVE'],
  [/half\s*board|\bhb\b/i, 'HALF_BOARD'],
  [/breakfast|\bbb\b|bed\s*&?\s*breakfast|صبحانه/i, 'BREAKFAST'],
  [/room\s*only|\bro\b/i, 'ROOM_ONLY'],
];

function mapMealPlan(mealType: string | undefined): HotelRoomRate['mealPlan'] {
  if (!mealType) return 'ROOM_ONLY';
  for (const [pattern, plan] of MEAL_PLAN_MAP) {
    if (pattern.test(mealType)) return plan;
  }
  return 'ROOM_ONLY';
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(checkOut) - Date.parse(checkIn);
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** Spread guests across rooms; every room needs at least one adult. */
export function distributeGuests(rooms: number, guests: number): NadiaRoomPax[] {
  const roomCount = Math.max(1, Math.floor(rooms));
  const guestCount = Math.max(roomCount, Math.floor(guests));
  const base = Math.floor(guestCount / roomCount);
  const remainder = guestCount % roomCount;
  return Array.from({ length: roomCount }, (_, i) => ({
    AdultCount: base + (i < remainder ? 1 : 0),
    ChildCount: 0,
    ChildAges: [],
  }));
}

export class NadiaHotelSupplierAdapter implements HotelSupplierPort {
  readonly supplierCode: string = NADIA_CRS_SUPPLIER_CODE;
  private readonly injectedClient?: NadiaCrsClient;
  private clientInstance?: NadiaCrsClient;
  private readonly cityIdCache = new Map<string, { id: number; at: number }>();

  constructor(options?: { client?: NadiaCrsClient }) {
    this.injectedClient = options?.client;
  }

  static isConfigured(): boolean {
    return NadiaCrsClient.isConfigured();
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private getClient(): NadiaCrsClient {
    if (this.injectedClient) return this.injectedClient;
    if (!NadiaCrsClient.isConfigured()) {
      throw new Error('FAIL_CLOSED: Nadia CRS credentials missing in production environment (NADIA_CRS_USERNAME / NADIA_CRS_PASSWORD)');
    }
    if (!this.clientInstance) {
      this.clientInstance = new NadiaCrsClient();
    }
    return this.clientInstance;
  }

  private nationalityId(): string {
    return process.env.NADIA_CRS_NATIONALITY || 'IR';
  }

  private async resolveCityId(client: NadiaCrsClient, city: string): Promise<number | null> {
    const key = city.trim().toLowerCase();
    if (!key) return null;
    const cached = this.cityIdCache.get(key);
    if (cached && Date.now() - cached.at < CITY_CACHE_TTL_MS) return cached.id;

    const matches = await client.searchCities(city, 1);
    const id = matches[0]?.id ?? null;
    if (id != null) {
      this.cityIdCache.set(key, { id, at: Date.now() });
    }
    return id;
  }

  async search(query: HotelSearchQuery): Promise<HotelPropertyResult[]> {
    const unconfigured = !this.injectedClient && !NadiaHotelSupplierAdapter.isConfigured();
    if (unconfigured) {
      if (NadiaHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Nadia CRS credentials missing in production environment');
      }
      // Dev without credentials: honest empty result, no fabricated hotels.
      return [];
    }

    const client = this.getClient();
    const cityId = await this.resolveCityId(client, query.city);
    if (cityId == null) return [];

    const data = await client.hotelAvailability({
      CityId: cityId,
      NationalityId: this.nationalityId(),
      CheckIn: query.checkIn,
      CheckOut: query.checkOut,
      Rooms: distributeGuests(query.rooms, query.guests),
    });

    const results: HotelPropertyResult[] = [];
    for (const hotel of data?.Hotels ?? []) {
      if (hotel.HotelId == null || !hotel.HotelName) continue;
      results.push({
        hotelId: String(hotel.HotelId),
        name: hotel.HotelName,
        stars: 0,
        rating: 0,
        address: '',
        rates: (hotel.Options ?? [])
          .filter((opt) => opt.OptionId)
          .map((opt) => this.mapOption(opt, query.checkIn, query.checkOut)),
      });
    }
    return results;
  }

  async checkAvailability(hotelId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const unconfigured = !this.injectedClient && !NadiaHotelSupplierAdapter.isConfigured();
    if (unconfigured) {
      if (NadiaHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Nadia CRS credentials missing in production environment');
      }
      return false;
    }

    const client = this.getClient();
    const numericId = Number(hotelId);
    if (!Number.isFinite(numericId)) return false;

    const data = await client.hotelAvailability({
      CityId: 0,
      HotelId: numericId,
      NationalityId: this.nationalityId(),
      CheckIn: checkIn,
      CheckOut: checkOut,
      Rooms: [{ AdultCount: 2, ChildCount: 0, ChildAges: [] }],
    });

    const options = data?.Hotels?.[0]?.Options ?? [];
    return options.length > 0;
  }

  async book(cmd: HotelBookingCommand): Promise<HotelBookingResult> {
    const unconfigured = !this.injectedClient && !NadiaHotelSupplierAdapter.isConfigured();
    if (unconfigured) {
      if (NadiaHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Nadia CRS credentials missing in production environment');
      }
      return {
        success: false,
        voucherNumber: '',
        confirmationCode: '',
        status: 'FAILED',
        error: 'Nadia CRS not configured',
      };
    }

    if (process.env.NADIA_CRS_ENABLE_BOOK !== 'true') {
      return {
        success: false,
        voucherNumber: '',
        confirmationCode: '',
        status: 'FAILED',
        error: 'Nadia CRS booking disabled (set NADIA_CRS_ENABLE_BOOK=true after live contract verification)',
      };
    }

    const client = this.getClient();
    const email = process.env.NADIA_CRS_BOOKING_EMAIL || 'booking@firuzo.ir';
    const prebook = await client.hotelPreBook({
      OptionId: cmd.roomId,
      PhoneNumber: cmd.guestPhone,
      Email: email,
    });

    const slug = typeof prebook?.slug === 'string' ? prebook.slug : undefined;
    const booked = await client.hotelBook(cmd.roomId, {
      slug,
      status: 'pending',
      passengers_info: [cmd.guestName],
    });

    const voucher = typeof booked?.voucher_number === 'string' ? booked.voucher_number : '';
    return {
      success: true,
      voucherNumber: voucher,
      confirmationCode: slug || cmd.roomId,
      status: 'CONFIRMED',
    };
  }

  private mapOption(opt: NadiaAvailabilityOption, checkIn: string, checkOut: string): HotelRoomRate {
    const nights = nightsBetween(checkIn, checkOut);
    const total = opt.Fare?.Price ?? 0;
    const mealType = opt.Rooms?.[0]?.MealType;
    const mealPlan = mapMealPlan(mealType);
    const policies = opt.Policies ?? [];
    const policyText = policies.length
      ? policies
          .map((p) => `از ${p.From ?? '؟'}: ${p.Cost ?? 0} ${p.Currency ?? ''}`.trim())
          .join(' | ')
      : 'قوانین کنسلی نامشخص';

    return {
      roomId: String(opt.OptionId),
      roomName: opt.Rooms?.[0]?.Name || (mealType ? `اتاق (${mealType})` : 'اتاق'),
      mealPlan,
      cancellationPolicy: policyText,
      refundable: opt.FreeCancellation === true,
      pricePerNight: Math.round(total / nights),
      totalPrice: total,
      currency: opt.Fare?.Currency || 'USD',
    };
  }
}

export { NadiaCrsApiError };
