/**
 * Hotel Supplier Port & Adapter Interface (SUP-002, SUP-004)
 * Master Spec v2 (Section 6, 9)
 */

export interface HotelSearchQuery {
  city: string; // e.g. "Istanbul", "Dubai", "Tehran"
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  rooms: number;
  guests: number;
}

export interface HotelRoomRate {
  roomId: string;
  roomName: string;
  mealPlan: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | 'ALL_INCLUSIVE';
  cancellationPolicy: string;
  refundable: boolean;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
}

export interface HotelPropertyResult {
  hotelId: string;
  name: string;
  stars: number;
  rating: number;
  address: string;
  rates: HotelRoomRate[];
}

export interface HotelBookingCommand {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestPhone: string;
}

export interface HotelBookingResult {
  success: boolean;
  voucherNumber: string;
  confirmationCode: string;
  status: 'CONFIRMED' | 'ON_REQUEST' | 'FAILED';
  error?: string;
}

export interface HotelSupplierPort {
  readonly supplierCode: string;
  search(query: HotelSearchQuery): Promise<HotelPropertyResult[]>;
  checkAvailability(hotelId: string, checkIn: string, checkOut: string): Promise<boolean>;
  book(cmd: HotelBookingCommand): Promise<HotelBookingResult>;
}

/**
 * Standard Multi-BedBank / Direct Allotment Hotel Adapter
 */
export class BedBankHotelSupplierAdapter implements HotelSupplierPort {
  readonly supplierCode: string;

  constructor(code: string = 'BEDBANK_DEFAULT') {
    this.supplierCode = code;
  }

  async search(query: HotelSearchQuery): Promise<HotelPropertyResult[]> {
    return [
      {
        hotelId: `htl_${this.supplierCode}_1`,
        name: `Grand Palace ${query.city}`,
        stars: 5,
        rating: 9.1,
        address: `City Center, ${query.city}`,
        rates: [
          {
            roomId: 'deluxe_king',
            roomName: 'Deluxe King Room with City View',
            mealPlan: 'BREAKFAST',
            cancellationPolicy: 'Free cancellation until 48 hours prior to arrival',
            refundable: true,
            pricePerNight: 4_500_000,
            totalPrice: 13_500_000,
            currency: 'IRR',
          },
        ],
      },
    ];
  }

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async book(cmd: HotelBookingCommand): Promise<HotelBookingResult> {
    const vch = `VCH-${Date.now().toString(36).toUpperCase()}-${cmd.hotelId.slice(0, 4)}`;
    return {
      success: true,
      voucherNumber: vch,
      confirmationCode: `CONF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'CONFIRMED',
    };
  }
}
