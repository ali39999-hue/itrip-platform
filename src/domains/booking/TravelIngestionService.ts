import { prisma } from '@/lib/prisma';

export interface ParsedTravelDetails {
  serviceType: 'FLIGHT' | 'HOTEL' | 'TOUR';
  pnr?: string;
  airline?: string;
  flightNo?: string;
  hotelName?: string;
  origin?: string;
  originCity?: string;
  destination?: string;
  destinationCity?: string;
  travelDate?: string; // YYYY-MM-DD
  departureTime?: string;
  passengers: Array<{ firstName: string; lastName: string }>;
  seat?: string;
  confidenceScore: number; // 0.0 to 1.0
}

export class TravelIngestionService {
  /**
   * Airline patterns in Persian and English
   */
  private static AIRLINES = [
    { key: 'mahan', name: 'هواپیمایی ماهان', prefix: 'W5' },
    { key: 'iranair', name: 'ایران‌ایر (هما)', prefix: 'IR' },
    { key: 'meraj', name: 'هواپیمایی معراج', prefix: 'JI' },
    { key: 'kishair', name: 'کیش‌ایر', prefix: 'Y9' },
    { key: 'varesh', name: 'هواپیمایی وارش', prefix: 'VR' },
    { key: 'zagros', name: 'هواپیمایی زاگرس', prefix: 'ZV' },
    { key: 'qeshm', name: 'قشم‌ایر', prefix: 'QB' },
    { key: 'turkish', name: 'ترکیش ایرلاینز', prefix: 'TK' },
    { key: 'pegasus', name: 'پگاسوس', prefix: 'PC' },
    { key: 'flydubai', name: 'فلای‌دبی', prefix: 'FZ' },
    { key: 'emirates', name: 'امارات', prefix: 'EK' },
  ];

  /**
   * Common IATA city mapping
   */
  private static CITIES: Record<string, { code: string; name: string }> = {
    تهران: { code: 'THR', name: 'تهران' },
    مهرآباد: { code: 'THR', name: 'تهران' },
    امام: { code: 'IKA', name: 'تهران' },
    مشهد: { code: 'MHD', name: 'مشهد' },
    شیراز: { code: 'SYZ', name: 'شیراز' },
    اصفهان: { code: 'IFN', name: 'اصفهان' },
    کیش: { code: 'KIH', name: 'کیش' },
    استانبول: { code: 'IST', name: 'استانبول' },
    دبی: { code: 'DXB', name: 'دبی' },
    تفلیس: { code: 'TBS', name: 'تفلیس' },
    مسقط: { code: 'MCT', name: 'مسقط' },
  };

  /**
   * Parses raw booking confirmation SMS, email, or pasted text (DaPlanStan pattern).
   */
  static parseRawConfirmation(text: string): ParsedTravelDetails {
    const raw = text || '';
    let confidence = 0.4;

    // Detect Service Type
    const isHotel = /هتل|hotel|رزرو اقامت|check-?in/i.test(raw);
    const serviceType = isHotel ? 'HOTEL' : 'FLIGHT';

    // Extract PNR
    const pnrMatch = raw.match(
      /(?:PNR|pnr|پی‌ان‌آر|کد رهگیری|شماره رزرو|کد رزرو|Reference)[\s:=#-]*([A-Z0-9-]{4,12})/i
    );
    const pnr = pnrMatch ? pnrMatch[1].toUpperCase() : undefined;
    if (pnr) confidence += 0.2;

    // Extract Flight Number
    const flightNoMatch = raw.match(
      /(?:پرواز|flight|flightno)[\s#:]*([A-Z0-9]{2}[- ]?[0-9]{3,4})/i
    );
    const flightNo = flightNoMatch ? flightNoMatch[1].replace(' ', '-') : undefined;
    if (flightNo) confidence += 0.15;

    // Extract Airline
    let matchedAirline = 'هواپیمایی معتبر';
    for (const air of this.AIRLINES) {
      if (raw.includes(air.name) || raw.toLowerCase().includes(air.key)) {
        matchedAirline = air.name;
        confidence += 0.15;
        break;
      }
    }

    // Extract Date (YYYY-MM-DD or YYYY/MM/DD)
    const dateMatch = raw.match(/(202[0-9])[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])/);
    const travelDate = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      : new Date().toISOString().slice(0, 10);

    // Extract Time (HH:mm)
    const timeMatch = raw.match(/(?:ساعت|time|at)?\s*([01]?[0-9]|2[0-3]):([0-5][0-9])/);
    const departureTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '08:30';

    // Extract Origin & Destination
    let origin = 'THR';
    let originCity = 'تهران';
    let destination = 'IST';
    let destinationCity = 'استانبول';

    // Scan for city mentions
    const foundCities: Array<{ code: string; name: string }> = [];
    for (const [cityName, meta] of Object.entries(this.CITIES)) {
      if (raw.includes(cityName)) {
        foundCities.push(meta);
      }
    }

    if (foundCities.length >= 2) {
      origin = foundCities[0].code;
      originCity = foundCities[0].name;
      destination = foundCities[1].code;
      destinationCity = foundCities[1].name;
      confidence += 0.1;
    } else if (foundCities.length === 1) {
      destination = foundCities[0].code;
      destinationCity = foundCities[0].name;
    }

    // Extract Passenger Names
    const passengers: Array<{ firstName: string; lastName: string }> = [];
    const passengerMatch = raw.match(/(?:مسافر|passenger|name)[\s:]*([^\d\n,.;]{3,30})/i);
    if (passengerMatch) {
      const parts = passengerMatch[1].trim().split(/\s+/);
      passengers.push({
        firstName: parts[0] || 'مسافر',
        lastName: parts.slice(1).join(' ') || 'محترم',
      });
      confidence += 0.1;
    } else {
      passengers.push({ firstName: 'مسافر', lastName: 'اصلی' });
    }

    // Extract Seat
    const seatMatch = raw.match(/(?:صندلی|seat)[\s:#]*([0-9]{1,2}[A-F])/i);
    const seat = seatMatch ? seatMatch[1].toUpperCase() : 'Auto';

    return {
      serviceType,
      pnr,
      airline: matchedAirline,
      flightNo: flightNo || 'W5-1152',
      hotelName: isHotel ? 'هتل رزرو شده مسافر' : undefined,
      origin,
      originCity,
      destination,
      destinationCity,
      travelDate,
      departureTime,
      passengers,
      seat,
      confidenceScore: Math.min(1.0, confidence),
    };
  }

  /**
   * Ingests and saves an external travel booking into the user's account (My Trips).
   */
  static async importExternalBooking(params: {
    userId: string;
    rawText: string;
  }): Promise<{ success: boolean; bookingId?: string; reference?: string; error?: string }> {
    if (!params.rawText || params.rawText.trim().length < 10) {
      return { success: false, error: 'متن بلیت برای استخراج اطلاعات کافی نیست.' };
    }

    const parsed = this.parseRawConfirmation(params.rawText);
    const reference = `ITR-EXT-${Date.now().toString().slice(-6)}`;

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            reference,
            customerId: params.userId,
            externalPnr: parsed.pnr || `EXT-${Date.now().toString().slice(-4)}`,
            status: 'CONFIRMED',
            paymentStatus: 'CAPTURED',
            fulfillmentStatus: 'CONFIRMED',
            ticketStatus: 'ISSUED',
            totalAmount: 0, // External import has 0 platform liability
            currency: 'IRR',
            travelDate: parsed.travelDate || null,
          },
        });

        const itemDetails = {
          itemTitle: `${parsed.originCity} به ${parsed.destinationCity} — ${parsed.airline}`,
          title: `${parsed.originCity} به ${parsed.destinationCity}`,
          type: parsed.serviceType,
          airline: parsed.airline,
          flightNo: parsed.flightNo,
          origin: parsed.origin,
          originCity: parsed.originCity,
          destination: parsed.destination,
          destinationCity: parsed.destinationCity,
          travelDate: parsed.travelDate,
          departureTime: parsed.departureTime,
          seat: parsed.seat,
          passengers: parsed.passengers,
          isImportedExternal: true,
        };

        await tx.bookingItem.create({
          data: {
            bookingId: b.id,
            type: parsed.serviceType,
            netCost: 0,
            markup: 0,
            sellPrice: 0,
            details: JSON.stringify(itemDetails),
          },
        });

        return b;
      });

      return {
        success: true,
        bookingId: booking.id,
        reference: booking.reference,
      };
    } catch (err: unknown) {
      console.error('importExternalBooking error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطا در ثبت بلیت خارجی',
      };
    }
  }
}
