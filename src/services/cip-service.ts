import { CIP_AIRPORTS, CIP_VEHICLES } from '@/lib/cip-data';
import type { CipAirportOption, CipVehicleOption } from '@/lib/types';
import type { CipSuiteType } from '@/lib/validations';

export interface CipPriceCalculationInput {
  airportCode: string;
  adults: number;
  children?: number;
  infants?: number;
  accompanyingGuests?: number;
  petCount?: number;
  wheelchairCount?: number;
  suiteType?: CipSuiteType;
  transferVehicleId?: string;
  transferAddress?: string;
}

export interface CipPriceLineItem {
  key: string;
  titleFa: string;
  titleEn: string;
  count: number;
  unitPriceToman: number;
  totalPriceToman: number;
}

export interface CipPriceCalculationResult {
  airport: CipAirportOption;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  accompanyingCount: number;
  petCount: number;
  wheelchairCount: number;
  suiteType: CipSuiteType;
  selectedVehicle?: CipVehicleOption;
  lineItems: CipPriceLineItem[];
  subtotalToman: number;
  taxToman: number; // 9% or 0% depending on airport policy; here transparent VAT
  totalToman: number;
  totalRials: number;
}

export class CipService {
  static getAirports(countryCode?: string): CipAirportOption[] {
    if (!countryCode) return CIP_AIRPORTS;
    return CIP_AIRPORTS.filter((a) => a.countryCode.toUpperCase() === countryCode.toUpperCase());
  }

  static async getAirportsAsync(countryCode?: string): Promise<CipAirportOption[]> {
    try {
      const { SiteContentService } = await import('@/domains/content/SiteContentService');
      const custom = await SiteContentService.get<CipAirportOption[]>('services.cip').catch(() => null);
      if (custom && Array.isArray(custom) && custom.length > 0) {
        if (!countryCode) return custom;
        return custom.filter((a) => a.countryCode.toUpperCase() === countryCode.toUpperCase());
      }
    } catch {}
    return this.getAirports(countryCode);
  }

  static getAirportByCode(code: string): CipAirportOption | undefined {
    const clean = code.trim().toUpperCase();
    return CIP_AIRPORTS.find((a) => a.airportCode === clean || a.id === clean.toLowerCase());
  }

  static async getAirportByCodeAsync(code: string): Promise<CipAirportOption | undefined> {
    const list = await this.getAirportsAsync();
    const clean = code.trim().toUpperCase();
    return list.find((a) => a.airportCode === clean || a.id === clean.toLowerCase());
  }

  static getVehicles(): CipVehicleOption[] {
    return CIP_VEHICLES;
  }

  static getVehicleById(id: string): CipVehicleOption | undefined {
    return CIP_VEHICLES.find((v) => v.id === id);
  }

  static calculatePrice(input: CipPriceCalculationInput): CipPriceCalculationResult {
    const airport = this.getAirportByCode(input.airportCode) || CIP_AIRPORTS[0];
    const adults = Math.max(1, input.adults || 1);
    const children = Math.max(0, input.children || 0);
    const infants = Math.max(0, input.infants || 0);
    const accompanying = Math.max(0, input.accompanyingGuests || 0);
    const pets = Math.max(0, input.petCount || 0);
    const wheelchairs = Math.max(0, input.wheelchairCount || 0);
    const suite = input.suiteType || 'NONE';

    const lineItems: CipPriceLineItem[] = [];

    // 1. Adults CIP
    const adultsTotal = adults * airport.basePriceAdult;
    lineItems.push({
      key: 'adults',
      titleFa: `تشریفات CIP مسافر بزرگسال (${adults} نفر)`,
      titleEn: `Adult CIP Service (${adults} Pax)`,
      count: adults,
      unitPriceToman: airport.basePriceAdult,
      totalPriceToman: adultsTotal,
    });

    // 2. Children CIP (same base rate as adult in standard CIP)
    if (children > 0) {
      const childrenTotal = children * airport.basePriceAdult;
      lineItems.push({
        key: 'children',
        titleFa: `تشریفات CIP مسافر کودک ۲ تا ۱۲ سال (${children} نفر)`,
        titleEn: `Child CIP Service 2-12yo (${children} Pax)`,
        count: children,
        unitPriceToman: airport.basePriceAdult,
        totalPriceToman: childrenTotal,
      });
    }

    // 3. Infants (Free under 2 years)
    if (infants > 0) {
      lineItems.push({
        key: 'infants',
        titleFa: `نوزاد زیر ۲ سال (${infants} نفر - رایگان)`,
        titleEn: `Infant under 2yo (${infants} - Free)`,
        count: infants,
        unitPriceToman: 0,
        totalPriceToman: 0,
      });
    }

    // 4. Accompanying Guests (مشایعت‌کننده یا مستقبل)
    if (accompanying > 0) {
      const guestsTotal = accompanying * airport.basePriceGuest;
      lineItems.push({
        key: 'accompanying',
        titleFa: `همراه مسافر / مشایع یا مستقبل (${accompanying} نفر - تا ۳ ساعت)`,
        titleEn: `Accompanying Guest / Escort (${accompanying} Pax)`,
        count: accompanying,
        unitPriceToman: airport.basePriceGuest,
        totalPriceToman: guestsTotal,
      });
    }

    // 5. Pet Quarantine & Handling Service
    if (pets > 0) {
      const petsTotal = pets * airport.petServicePrice;
      lineItems.push({
        key: 'pets',
        titleFa: `خدمات پذیرش و قرنطینه حیوان خانگی (${pets} قلاده)`,
        titleEn: `Pet Handling & Quarantine (${pets})`,
        count: pets,
        unitPriceToman: airport.petServicePrice,
        totalPriceToman: petsTotal,
      });
    }

    // 6. Wheelchair & LOM Tarmac Lift
    if (wheelchairs > 0) {
      const wheelTotal = wheelchairs * airport.wheelchairPrice;
      lineItems.push({
        key: 'wheelchairs',
        titleFa: `خدمات ویژه توان‌خواه و بالابر اختصاصی LOM (${wheelchairs} نفر)`,
        titleEn: `Special Assistance & LOM Tarmac Lift (${wheelchairs})`,
        count: wheelchairs,
        unitPriceToman: airport.wheelchairPrice,
        totalPriceToman: wheelTotal,
      });
    }

    // 7. Day Suite or Airport Hotel Room
    let suitePrice = 0;
    if (suite === '6_HOURS') {
      suitePrice = airport.suite6hPrice;
      lineItems.push({
        key: 'suite_6h',
        titleFa: 'سوئیت اقامتی داخل سالن CIP (پکیج ۶ ساعته)',
        titleEn: 'CIP Lounge Day Suite (6 Hours)',
        count: 1,
        unitPriceToman: suitePrice,
        totalPriceToman: suitePrice,
      });
    } else if (suite === '10_HOURS') {
      suitePrice = airport.suite10hPrice;
      lineItems.push({
        key: 'suite_10h',
        titleFa: 'سوئیت اقامتی داخل سالن CIP (پکیج ۱۰ ساعته)',
        titleEn: 'CIP Lounge Day Suite (10 Hours)',
        count: 1,
        unitPriceToman: suitePrice,
        totalPriceToman: suitePrice,
      });
    } else if (suite === 'OVERNIGHT') {
      suitePrice = airport.suiteOvernightPrice;
      lineItems.push({
        key: 'suite_overnight',
        titleFa: 'اقامت شبانه هتل فرودگاهی (اتصال با پل اختصاصی CIP)',
        titleEn: 'Overnight Airport Hotel Room (Direct Bridge)',
        count: 1,
        unitPriceToman: suitePrice,
        totalPriceToman: suitePrice,
      });
    }

    // 8. Airport Transfer
    let selectedVehicle: CipVehicleOption | undefined;
    if (input.transferVehicleId && input.transferVehicleId !== 'NONE') {
      selectedVehicle = this.getVehicleById(input.transferVehicleId);
      if (selectedVehicle) {
        const address = (input.transferAddress || '').toLowerCase();
        const isSuburbs =
          address.includes('کرج') ||
          address.includes('لواسان') ||
          address.includes('پردیس') ||
          address.includes('شهریار') ||
          address.includes('ورامین') ||
          address.includes('karaj') ||
          address.includes('lavasan');

        const vehiclePrice = isSuburbs ? selectedVehicle.priceSuburbs : selectedVehicle.priceTehran;
        lineItems.push({
          key: 'transfer',
          titleFa: `ترانسفر اختصاصی فرودگاهی (${selectedVehicle.nameFa} - ${isSuburbs ? 'حومه' : 'تهران'})`,
          titleEn: `Airport Transfer (${selectedVehicle.nameEn})`,
          count: 1,
          unitPriceToman: vehiclePrice,
          totalPriceToman: vehiclePrice,
        });
      }
    }

    const subtotalToman = lineItems.reduce((sum, item) => sum + item.totalPriceToman, 0);
    // Standard VAT/tax (e.g. 0% for international transport support or transparent breakdown)
    const taxToman = 0;
    const totalToman = subtotalToman + taxToman;
    const totalRials = totalToman * 10;

    return {
      airport,
      adultsCount: adults,
      childrenCount: children,
      infantsCount: infants,
      accompanyingCount: accompanying,
      petCount: pets,
      wheelchairCount: wheelchairs,
      suiteType: suite,
      selectedVehicle,
      lineItems,
      subtotalToman,
      taxToman,
      totalToman,
      totalRials,
    };
  }
}
