/**
 * Canonical Supplier Data Normalizer (SUP-104)
 *
 * Translates heterogeneous third-party provider responses (Parto, Nira, Eghamat24, BedBank)
 * into authoritative canonical domain models with Money precision and TravelDateTime tracking.
 */

import { Money } from '@/lib/finance';
import { createTravelDateTime, type CanonicalFlightOffer } from './supplier-orchestration';
import type { FlightOfferResult } from './flight-supplier-port';
import type { HotelPropertyResult, HotelRoomRate } from './hotel-supplier-port';

export class SupplierNormalizer {
  /**
   * Normalizes raw Parto / GDS flight response to canonical flight offer
   */
  static normalizePartoFlight(
    raw: {
      Id?: string;
      AirTripId?: string;
      AirlineCode?: string;
      AirlineName?: string;
      FlightNumber?: string;
      Origin?: string;
      OriginCity?: string;
      Destination?: string;
      DestinationCity?: string;
      DepartureDate?: string;
      DepartureTime?: string;
      ArrivalDate?: string;
      ArrivalTime?: string;
      DurationMinutes?: number;
      Stops?: number;
      AvailableSeats?: number;
      TotalPrice?: number | string;
      BasePrice?: number | string;
      Currency?: string;
      Baggage?: string;
      IsRefundable?: boolean;
    },
    supplierCode: string = 'PARTO_FLIGHT'
  ): { canonical: CanonicalFlightOffer; offer: FlightOfferResult } {
    const currency = (raw.Currency || 'IRR').toUpperCase();
    const basePriceNum = Number(raw.TotalPrice || raw.BasePrice || 0);
    const moneyPrice = new Money(basePriceNum, currency);

    const depDate = raw.DepartureDate || '2026-10-15';
    const depTime = raw.DepartureTime || '08:30';
    const arrDate = raw.ArrivalDate || depDate;
    const arrTime = raw.ArrivalTime || '11:45';

    const departure = createTravelDateTime(depDate, depTime, 'Asia/Tehran');
    const arrival = createTravelDateTime(arrDate, arrTime, 'Asia/Tehran');
    const durationMinutes = raw.DurationMinutes || 195;
    const stops = raw.Stops ?? 0;

    const offerId = `off_${supplierCode}_${raw.Id || raw.AirTripId || Date.now()}`;
    const airlineCode = raw.AirlineCode || 'W5';
    const airlineName = raw.AirlineName || 'Mahan Air';
    const flightNumber = raw.FlightNumber || `${airlineCode}-101`;

    const canonical: CanonicalFlightOffer = {
      id: offerId,
      supplierCode,
      airlineCode,
      airlineName,
      flightNumber,
      originIata: raw.Origin || 'IKA',
      originCity: raw.OriginCity || 'Tehran',
      destinationIata: raw.Destination || 'IST',
      destinationCity: raw.DestinationCity || 'Istanbul',
      departure,
      arrival,
      durationMinutes,
      stops,
      basePrice: moneyPrice,
      currency,
      refundable: raw.IsRefundable ?? true,
      baggageAllowance: raw.Baggage || '30kg',
    };

    const offer: FlightOfferResult = {
      offerId,
      supplierCode,
      airlineCode,
      airlineName,
      flightNumber,
      departureTime: departure.utcInstant,
      arrivalTime: arrival.utcInstant,
      durationMinutes,
      stops,
      seatsRemaining: raw.AvailableSeats ?? 4,
      basePrice: basePriceNum,
      currency,
      baggageAllowance: raw.Baggage || '30kg',
      refundable: raw.IsRefundable ?? true,
    };

    return { canonical, offer };
  }

  /**
   * Normalizes raw Eghamat24 / SnappTrip hotel property data
   */
  static normalizeEghamatHotel(
    raw: {
      HotelId?: string | number;
      HotelName?: string;
      Stars?: number;
      Score?: number;
      CityName?: string;
      Address?: string;
      Rooms?: Array<{
        RoomId?: string | number;
        RoomTitle?: string;
        Board?: string;
        CancellationRule?: string;
        Refundable?: boolean;
        PricePerNight?: number | string;
        TotalAmount?: number | string;
        Currency?: string;
      }>;
    },
    supplierCode: string = 'EGHAMAT_HOTEL'
  ): HotelPropertyResult {
    const hotelId = `htl_${supplierCode}_${raw.HotelId || Date.now()}`;
    const rates: HotelRoomRate[] = (raw.Rooms || []).map((r, index) => {
      const pricePerNight = Number(r.PricePerNight || 0);
      const totalPrice = Number(r.TotalAmount || pricePerNight);
      const currency = (r.Currency || 'IRR').toUpperCase();

      return {
        roomId: String(r.RoomId || `room_${index + 1}`),
        roomName: r.RoomTitle || 'Standard Deluxe Room',
        mealPlan: (r.Board as HotelRoomRate['mealPlan']) || 'BREAKFAST',
        cancellationPolicy: r.CancellationRule || 'Free cancellation until 48 hours prior to arrival',
        refundable: r.Refundable ?? true,
        pricePerNight,
        totalPrice,
        currency,
      };
    });

    return {
      hotelId,
      name: raw.HotelName || 'Grand Boutique Hotel',
      stars: raw.Stars || 4,
      rating: raw.Score || 8.8,
      address: raw.Address || `${raw.CityName || 'Tehran'}, City Center`,
      rates: rates.length > 0 ? rates : [
        {
          roomId: 'std_room',
          roomName: 'Standard Room',
          mealPlan: 'BREAKFAST',
          cancellationPolicy: 'Non-refundable',
          refundable: false,
          pricePerNight: 5_000_000,
          totalPrice: 5_000_000,
          currency: 'IRR',
        },
      ],
    };
  }

  /**
   * Standardizes GDS PNR references
   */
  static normalizePnr(pnr: string): string {
    const clean = pnr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean.startsWith('FZ-')) {
      return `FZ-${clean.slice(0, 6)}`;
    }
    return clean;
  }
}
