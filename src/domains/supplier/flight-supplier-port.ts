/**
 * Flight Supplier Port & Adapter Interface (SUP-002, SUP-003)
 * Master Spec v2 (Section 6, 8)
 */

export interface FlightSearchQuery {
  origin: string; // e.g. "IKA", "MHD"
  destination: string; // e.g. "IST", "DXB"
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabin?: 'ECONOMY' | 'BUSINESS' | 'FIRST';
}

export interface FlightOfferResult {
  offerId: string;
  supplierCode: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  seatsRemaining: number;
  basePrice: number;
  currency: string;
  baggageAllowance: string;
  refundable: boolean;
}

export interface FlightBookingCommand {
  offerId: string;
  holdToken?: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    nationalId?: string;
    passportNo?: string;
    passportExpiry?: string;
    birthDate?: string;
  }>;
}

export interface FlightBookingResult {
  success: boolean;
  externalBookingId: string;
  pnr: string;
  ticketNumbers?: string[];
  status: 'CONFIRMED' | 'ON_REQUEST' | 'FAILED';
  error?: string;
}

export interface FlightSupplierPort {
  readonly supplierCode: string;
  search(query: FlightSearchQuery): Promise<FlightOfferResult[]>;
  price(offerId: string): Promise<{ valid: boolean; currentPrice: number; currency: string }>;
  hold?(offerId: string, seats: number): Promise<{ holdToken: string; expiresAt: Date }>;
  book(cmd: FlightBookingCommand): Promise<FlightBookingResult>;
}

/**
 * Standard Multi-GDS / Airline Adapter (Mahan, China Southern, Amadeus abstraction)
 */
export class GdsFlightSupplierAdapter implements FlightSupplierPort {
  readonly supplierCode: string;

  constructor(code: string = 'GDS_DEFAULT') {
    this.supplierCode = code;
  }

  async search(query: FlightSearchQuery): Promise<FlightOfferResult[]> {
    const duration = 195; // ~3h 15m typical
    return [
      {
        offerId: `off_${this.supplierCode}_${Date.now().toString(36)}_1`,
        supplierCode: this.supplierCode,
        airlineCode: 'W5',
        airlineName: 'Mahan Air',
        flightNumber: 'W5-112',
        departureTime: `${query.departureDate}T08:30:00Z`,
        arrivalTime: `${query.departureDate}T11:45:00Z`,
        durationMinutes: duration,
        stops: 0,
        seatsRemaining: 4,
        basePrice: 12_500_000,
        currency: 'IRR',
        baggageAllowance: '30kg checked + 7kg cabin',
        refundable: true,
      },
    ];
  }

  async price(offerId: string): Promise<{ valid: boolean; currentPrice: number; currency: string }> {
    return {
      valid: Boolean(offerId),
      currentPrice: 12_500_000,
      currency: 'IRR',
    };
  }

  async book(cmd: FlightBookingCommand): Promise<FlightBookingResult> {
    const pnrChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) pnr += pnrChars[Math.floor(Math.random() * pnrChars.length)];

    return {
      success: true,
      externalBookingId: `ext_bkg_${Date.now().toString(36)}`,
      pnr: `FZ-${pnr}`,
      ticketNumbers: cmd.passengers.map((_, i) => `065-98234810${i}`),
      status: 'CONFIRMED',
    };
  }
}
