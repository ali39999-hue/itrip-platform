/**
 * Parto / Nira GDS Real Flight Supplier Adapter (SUP-101, SUP-106)
 *
 * Implements real Iranian / regional flight inventory retrieval and booking:
 * - Decrypts credentials durably via CryptoVault (SUP-106).
 * - Enforces fail-closed secret checks in production.
 * - Uses centralized SupplierTransport for timeout, retry, and raw audit (SUP-103).
 * - Canonical data normalization via SupplierNormalizer (SUP-104).
 */

import {
  type FlightSupplierPort,
  type FlightSearchQuery,
  type FlightOfferResult,
  type FlightBookingCommand,
  type FlightBookingResult,
} from '../flight-supplier-port';
import { SupplierTransport } from '../SupplierTransport';
import { SupplierNormalizer } from '../SupplierNormalizer';
import { encryptSensitive, decryptSensitive } from '@/lib/security/crypto-vault';

export interface PartoCredentials {
  apiKey: string;
  officeId: string;
  endpointUrl: string;
}

export class PartoFlightSupplierAdapter implements FlightSupplierPort {
  readonly supplierCode: string = 'PARTO_GDS';
  private encryptedCredentials?: string;
  private endpointUrl: string;

  constructor(options?: { credentials?: PartoCredentials }) {
    if (options?.credentials) {
      this.encryptedCredentials = encryptSensitive(JSON.stringify(options.credentials));
      this.endpointUrl = options.credentials.endpointUrl;
    } else {
      const apiKey = process.env.PARTO_API_KEY;
      const officeId = process.env.PARTO_OFFICE_ID || 'THR-ITRIP-01';
      this.endpointUrl = process.env.PARTO_ENDPOINT_URL || 'https://api.partocrs.com/v2';

      if (apiKey) {
        this.encryptedCredentials = encryptSensitive(JSON.stringify({ apiKey, officeId, endpointUrl: this.endpointUrl }));
      }
    }
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Retrieve and decrypt credentials safely from CryptoVault (SUP-106)
   */
  private getDecryptedCredentials(): PartoCredentials | null {
    if (!this.encryptedCredentials) return null;
    try {
      const decrypted = decryptSensitive(this.encryptedCredentials);
      return JSON.parse(decrypted) as PartoCredentials;
    } catch {
      return null;
    }
  }

  async search(query: FlightSearchQuery): Promise<FlightOfferResult[]> {
    const creds = this.getDecryptedCredentials();

    if (!creds || !creds.apiKey) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto GDS credentials missing in production environment');
      }

      // Non-production simulated flight response
      const normalized = SupplierNormalizer.normalizePartoFlight({
        AirTripId: `parto_sim_${Date.now()}`,
        AirlineCode: 'W5',
        AirlineName: 'Mahan Air',
        FlightNumber: 'W5-112',
        Origin: query.origin,
        Destination: query.destination,
        DepartureDate: query.departureDate,
        DepartureTime: '08:30',
        ArrivalTime: '11:45',
        DurationMinutes: 195,
        Stops: 0,
        AvailableSeats: 5,
        TotalPrice: 14_500_000,
        Currency: 'IRR',
        Baggage: '30kg',
        IsRefundable: true,
      }, this.supplierCode);

      return [normalized.offer];
    }

    // Real API call via SupplierTransport
    const response = await SupplierTransport.request<{
      AirTrips?: Array<{
        Id: string;
        AirlineCode: string;
        AirlineName: string;
        FlightNumber: string;
        Origin: string;
        Destination: string;
        DepartureDate: string;
        DepartureTime: string;
        ArrivalTime: string;
        DurationMinutes: number;
        Stops: number;
        AvailableSeats: number;
        TotalPrice: number;
        Currency: string;
      }>;
    }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/AirSearch`,
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'X-Office-Id': creds.officeId,
      },
      body: {
        Origin: query.origin,
        Destination: query.destination,
        DepartureDate: query.departureDate,
        Adults: query.passengers.adults,
        Children: query.passengers.children || 0,
        Infants: query.passengers.infants || 0,
      },
      timeoutMs: 8000,
    });

    if (!response.ok || !response.data?.AirTrips) {
      return [];
    }

    return response.data.AirTrips.map((trip) => {
      return SupplierNormalizer.normalizePartoFlight(trip, this.supplierCode).offer;
    });
  }

  async price(offerId: string): Promise<{ valid: boolean; currentPrice: number; currency: string }> {
    const creds = this.getDecryptedCredentials();
    if (!creds || !creds.apiKey) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto credentials missing in production environment');
      }
      return { valid: true, currentPrice: 14_500_000, currency: 'IRR' };
    }

    const res = await SupplierTransport.request<{ Valid: boolean; TotalPrice: number; Currency: string }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/AirRevalidate`,
      headers: { 'Authorization': `Bearer ${creds.apiKey}` },
      body: { OfferId: offerId },
      timeoutMs: 5000,
    });

    return {
      valid: res.data?.Valid ?? res.ok,
      currentPrice: res.data?.TotalPrice ?? 14_500_000,
      currency: res.data?.Currency || 'IRR',
    };
  }

  async book(cmd: FlightBookingCommand): Promise<FlightBookingResult> {
    const creds = this.getDecryptedCredentials();
    if (!creds || !creds.apiKey) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto credentials missing in production environment');
      }
      const pnr = SupplierNormalizer.normalizePnr(Math.random().toString(36).slice(2, 8));
      return {
        success: true,
        externalBookingId: `ext_parto_${Date.now()}`,
        pnr,
        ticketNumbers: cmd.passengers.map((_, i) => `065-9988223${i}`),
        status: 'CONFIRMED',
      };
    }

    const res = await SupplierTransport.request<{
      Success: boolean;
      Pnr: string;
      BookingId: string;
      TicketNumbers?: string[];
      ErrorMessage?: string;
    }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/AirBook`,
      headers: { 'Authorization': `Bearer ${creds.apiKey}` },
      body: cmd,
      timeoutMs: 15000,
    });

    if (!res.ok || !res.data?.Success) {
      return {
        success: false,
        externalBookingId: res.data?.BookingId || '',
        pnr: '',
        status: 'FAILED',
        error: res.data?.ErrorMessage || `Parto error HTTP ${res.statusCode}`,
      };
    }

    return {
      success: true,
      externalBookingId: res.data.BookingId,
      pnr: SupplierNormalizer.normalizePnr(res.data.Pnr),
      ticketNumbers: res.data.TicketNumbers,
      status: 'CONFIRMED',
    };
  }
}
