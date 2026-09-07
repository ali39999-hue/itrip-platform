/**
 * Eghamat24 / Regional BedBank Hotel Supplier Adapter (SUP-102, SUP-106)
 *
 * Implements hotel inventory search, room rate availability checks, and booking:
 * - Credentials encrypted & decrypted via CryptoVault (SUP-106).
 * - Centralized SupplierTransport for timeouts, retries, and correlation tracking (SUP-103).
 * - Canonical data normalization via SupplierNormalizer (SUP-104).
 * - Fail-closed secret checks in production.
 */

import {
  type HotelSupplierPort,
  type HotelSearchQuery,
  type HotelPropertyResult,
  type HotelBookingCommand,
  type HotelBookingResult,
} from '../hotel-supplier-port';
import { SupplierTransport } from '../SupplierTransport';
import { SupplierNormalizer } from '../SupplierNormalizer';
import { encryptSensitive, decryptSensitive } from '@/lib/security/crypto-vault';

export interface EghamatCredentials {
  apiKey: string;
  agencyCode: string;
  endpointUrl: string;
}

export class EghamatHotelSupplierAdapter implements HotelSupplierPort {
  readonly supplierCode: string = 'EGHAMAT_24';
  private encryptedCredentials?: string;
  private endpointUrl: string;

  constructor(options?: { credentials?: EghamatCredentials }) {
    if (options?.credentials) {
      this.encryptedCredentials = encryptSensitive(JSON.stringify(options.credentials));
      this.endpointUrl = options.credentials.endpointUrl;
    } else {
      const apiKey = process.env.EGHAMAT_API_KEY;
      const agencyCode = process.env.EGHAMAT_AGENCY_CODE || 'FIRUZO_IR';
      this.endpointUrl = process.env.EGHAMAT_ENDPOINT_URL || 'https://api.eghamat24.com/v1';

      if (apiKey) {
        this.encryptedCredentials = encryptSensitive(JSON.stringify({ apiKey, agencyCode, endpointUrl: this.endpointUrl }));
      }
    }
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private getDecryptedCredentials(): EghamatCredentials | null {
    if (!this.encryptedCredentials) return null;
    try {
      const decrypted = decryptSensitive(this.encryptedCredentials);
      return JSON.parse(decrypted) as EghamatCredentials;
    } catch {
      return null;
    }
  }

  async search(query: HotelSearchQuery): Promise<HotelPropertyResult[]> {
    const creds = this.getDecryptedCredentials();

    if (!creds || !creds.apiKey) {
      if (EghamatHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Eghamat24 credentials missing in production environment');
      }

      // Non-production fallback simulation
      const normalized = SupplierNormalizer.normalizeEghamatHotel({
        HotelId: `egh_${Date.now()}`,
        HotelName: `هتل بزرگ اسپیناس پالاس ${query.city}`,
        Stars: 5,
        Score: 9.3,
        CityName: query.city,
        Address: `${query.city}، میدان بهرود، خیابان ۳۳`,
        Rooms: [
          {
            RoomId: 'deluxe_twin',
            RoomTitle: 'اتاق دوتخته دلوکس با نمای شهر',
            Board: 'BREAKFAST',
            CancellationRule: 'کنسلی رایگان تا ۴۸ ساعت قبل از ورود',
            Refundable: true,
            PricePerNight: 8_500_000,
            TotalAmount: 17_000_000,
            Currency: 'IRR',
          },
        ],
      }, this.supplierCode);

      return [normalized];
    }

    const response = await SupplierTransport.request<{
      Hotels?: Array<{
        HotelId: string | number;
        HotelName: string;
        Stars: number;
        Score: number;
        CityName: string;
        Address: string;
        Rooms: Array<{
          RoomId: string | number;
          RoomTitle: string;
          Board: string;
          CancellationRule: string;
          Refundable: boolean;
          PricePerNight: number;
          TotalAmount: number;
          Currency: string;
        }>;
      }>;
    }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/hotels/search`,
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'X-Agency-Code': creds.agencyCode,
      },
      body: {
        City: query.city,
        CheckIn: query.checkIn,
        CheckOut: query.checkOut,
        RoomsCount: query.rooms,
        GuestsCount: query.guests,
      },
      timeoutMs: 8000,
    });

    if (!response.ok || !response.data?.Hotels) {
      return [];
    }

    return response.data.Hotels.map((h) => {
      return SupplierNormalizer.normalizeEghamatHotel(h, this.supplierCode);
    });
  }

  async checkAvailability(hotelId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const creds = this.getDecryptedCredentials();
    if (!creds || !creds.apiKey) {
      if (EghamatHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Eghamat24 credentials missing in production environment');
      }
      return true;
    }

    const res = await SupplierTransport.request<{ Available: boolean }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/hotels/check-availability`,
      headers: { 'Authorization': `Bearer ${creds.apiKey}` },
      body: { HotelId: hotelId, CheckIn: checkIn, CheckOut: checkOut },
      timeoutMs: 5000,
    });

    return res.data?.Available ?? res.ok;
  }

  async book(cmd: HotelBookingCommand): Promise<HotelBookingResult> {
    const creds = this.getDecryptedCredentials();
    if (!creds || !creds.apiKey) {
      if (EghamatHotelSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Eghamat24 credentials missing in production environment');
      }
      const vch = `VCH-${Date.now().toString(36).toUpperCase()}-${cmd.hotelId.slice(-4)}`;
      return {
        success: true,
        voucherNumber: vch,
        confirmationCode: `CONF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: 'CONFIRMED',
      };
    }

    const res = await SupplierTransport.request<{
      Success: boolean;
      VoucherNumber: string;
      ConfirmationCode: string;
      ErrorMessage?: string;
    }>({
      supplierCode: this.supplierCode,
      endpoint: `${creds.endpointUrl}/hotels/book`,
      headers: { 'Authorization': `Bearer ${creds.apiKey}` },
      body: cmd,
      timeoutMs: 15000,
    });

    if (!res.ok || !res.data?.Success) {
      return {
        success: false,
        voucherNumber: '',
        confirmationCode: '',
        status: 'FAILED',
        error: res.data?.ErrorMessage || `Eghamat24 error HTTP ${res.statusCode}`,
      };
    }

    return {
      success: true,
      voucherNumber: res.data.VoucherNumber,
      confirmationCode: res.data.ConfirmationCode,
      status: 'CONFIRMED',
    };
  }
}
