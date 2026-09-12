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
import { PARTO_CRS_SUPPLIER_CODE, type PartoPricedItinerary } from './adapters/PartoCrsApiClient';

/** Full mapping result for an official Parto CRS PricedItinerary (v3 API). */
export interface NormalizedPartoItinerary {
  canonical: CanonicalFlightOffer;
  offer: FlightOfferResult;
  fareSourceCode: string;
  isCharter: boolean;
  currency: string;
  baseFare: number;
  totalFare: number;
  totalTax: number;
  terminals: { departure: string | null; arrival: string | null };
  labelsFa: string[];
}

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
   * Normalizes an official Parto CRS v3 `PricedItinerary` (from AirLowFareSearch
   * or AirRevalidate) into the canonical flight offer plus every extra field the
   * flight cache needs. Returns null for unusable itineraries (missing fare
   * reference, missing first segment, or missing total fare).
   */
  static normalizePricedItinerary(raw: PartoPricedItinerary): NormalizedPartoItinerary | null {
    const fareSourceCode = raw.FareSourceCode;
    if (!fareSourceCode) return null;

    const firstOption = raw.OriginDestinationOptions?.[0];
    const segments = firstOption?.FlightSegments ?? [];
    const firstSegment = segments[0];
    if (!firstSegment?.DepartureDateTime || !firstSegment.ArrivalDateTime) return null;

    const itinFare = raw.AirItineraryPricingInfo?.ItinTotalFare;
    const totalFare = Number(itinFare?.TotalFare ?? 0);
    if (!Number.isFinite(totalFare) || totalFare <= 0) return null;

    const currency = (itinFare?.Currency || 'IRR').toUpperCase();
    const baseFare = Number(itinFare?.BaseFare ?? totalFare);
    const totalTax = Number(itinFare?.TotalTax ?? Math.max(0, totalFare - baseFare));

    const depIso = firstSegment.DepartureDateTime;
    const arrIso = firstSegment.ArrivalDateTime;
    const depDate = depIso.slice(0, 10);
    const depTime = depIso.slice(11, 16) || '00:00';
    const arrDate = arrIso.slice(0, 10) || depDate;
    const arrTime = arrIso.slice(11, 16) || '00:00';

    const departure = createTravelDateTime(depDate, depTime, 'Asia/Tehran');
    const arrival = createTravelDateTime(arrDate, arrTime, 'Asia/Tehran');

    const airlineCode = (firstSegment.MarketingAirlineCode || raw.ValidatingAirlineCode || 'XX').toUpperCase();
    const rawFlightNumber = (firstSegment.FlightNumber || '').trim();
    const flightNumber = rawFlightNumber.includes('-') ? rawFlightNumber : `${airlineCode}-${rawFlightNumber || '000'}`;

    const durationMinutes =
      firstOption?.JourneyDurationPerMinute ??
      firstSegment.JourneyDurationPerMinute ??
      Math.max(
        60,
        Math.round(
          (new Date(arrival.localDateTime).getTime() - new Date(departure.localDateTime).getTime()) / 60000
        )
      );

    const stops = Math.max(0, segments.length - 1);
    const seatsRemaining = firstSegment.SeatsRemaining ?? 9;
    const isCharter = firstSegment.IsCharter === true;
    const refundable = raw.NonRefundableType !== 1 && raw.RefundMethod !== 2;
    const baggage = firstSegment.Baggage || '20kg';

    const moneyPrice = new Money(totalFare, currency);
    const offerId = `off_${PARTO_CRS_SUPPLIER_CODE}_${Buffer.from(fareSourceCode, 'utf8').toString('base64url')}`;

    const canonical: CanonicalFlightOffer = {
      id: offerId,
      supplierCode: PARTO_CRS_SUPPLIER_CODE,
      airlineCode,
      airlineName: airlineCode,
      flightNumber,
      originIata: (firstSegment.DepartureAirportLocationCode || '').toUpperCase(),
      originCity: (firstSegment.DepartureAirportLocationCode || '').toUpperCase(),
      destinationIata: (firstSegment.ArrivalAirportLocationCode || '').toUpperCase(),
      destinationCity: (firstSegment.ArrivalAirportLocationCode || '').toUpperCase(),
      departure,
      arrival,
      durationMinutes,
      stops,
      basePrice: moneyPrice,
      currency,
      refundable,
      baggageAllowance: baggage,
    };

    const offer: FlightOfferResult = {
      offerId,
      supplierCode: PARTO_CRS_SUPPLIER_CODE,
      airlineCode,
      airlineName: airlineCode,
      flightNumber,
      departureTime: departure.utcInstant,
      arrivalTime: arrival.utcInstant,
      durationMinutes,
      stops,
      seatsRemaining,
      basePrice: totalFare,
      currency,
      baggageAllowance: baggage,
      refundable,
    };

    return {
      canonical,
      offer,
      fareSourceCode,
      isCharter,
      currency,
      baseFare,
      totalFare,
      totalTax,
      terminals: {
        departure: firstSegment.DepartureTerminal ?? null,
        arrival: firstSegment.ArrivalTerminal ?? null,
      },
      labelsFa: raw.LabelsFa ?? [],
    };
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
