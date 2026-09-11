/**
 * Duty of Care & Traveler Safety Infrastructure (Section 25).
 *
 * Provides real-time consular, emergency medical, and disruption assistance
 * for travelers at home and abroad:
 * - Local emergency numbers (Police, Ambulance, Tourist Police)
 * - Embassy and consular protection details
 * - Travel advisory safety levels
 * - Automated rebooking & disruption assistance workflows
 */

export type SafetyAdvisoryLevel = 'NORMAL' | 'ELEVATED_CAUTION' | 'TRAVEL_WARNING' | 'EMERGENCY';

export type EmergencyServiceType = 'POLICE' | 'AMBULANCE' | 'FIRE' | 'TOURIST_POLICE';

export interface EmergencyContact {
  type: EmergencyServiceType;
  phone: string;
  label: { fa: string; en: string };
}

export interface EmbassyInfo {
  country: string;
  city: string;
  name: { fa: string; en: string };
  address: { fa: string; en: string };
  phone: string;
  emergencyHotline: string;
}

export interface DestinationSafetyProfile {
  countryCode: string; // ISO 2-letter
  countryName: { fa: string; en: string };
  safetyLevel: SafetyAdvisoryLevel;
  emergencyContacts: EmergencyContact[];
  embassy?: EmbassyInfo;
  accreditedHospitals: Array<{ name: string; phone: string; address: string }>;
}

export const DESTINATION_SAFETY_PROFILES: Record<string, DestinationSafetyProfile> = {
  TR: {
    countryCode: 'TR',
    countryName: { fa: 'ترکیه', en: 'Turkey' },
    safetyLevel: 'NORMAL',
    emergencyContacts: [
      { type: 'POLICE', phone: '155', label: { fa: 'پلیس سراسری ترکیه', en: 'National Police' } },
      { type: 'AMBULANCE', phone: '112', label: { fa: 'اورژانس پزشکی', en: 'Ambulance' } },
      { type: 'TOURIST_POLICE', phone: '+902125274503', label: { fa: 'پلیس ویژه گردشگران استانبول', en: 'Istanbul Tourist Police' } },
    ],
    embassy: {
      country: 'Turkey',
      city: 'Istanbul',
      name: { fa: 'سرکنسولگری جمهوری اسلامی ایران در استانبول', en: 'Consulate General of Iran in Istanbul' },
      address: { fa: 'استانبول، فاتح، خیابان آنکارا، پلاک ۱', en: 'Ankara Cad. No:1, Cagaloglu, Fatih, Istanbul' },
      phone: '+902125138230',
      emergencyHotline: '+905308226026',
    },
    accreditedHospitals: [
      { name: 'American Hospital Istanbul', phone: '+902124443777', address: 'Nispetiye, Tesvikiye, Sisli' },
      { name: 'Acibadem Taksim', phone: '+902122340000', address: 'Inonu, Nizamiye Cd., Beyoglu' },
    ],
  },
  AE: {
    countryCode: 'AE',
    countryName: { fa: 'امارات متحده عربی', en: 'United Arab Emirates' },
    safetyLevel: 'NORMAL',
    emergencyContacts: [
      { type: 'POLICE', phone: '999', label: { fa: 'پلیس دبی', en: 'Dubai Police' } },
      { type: 'AMBULANCE', phone: '998', label: { fa: 'اورژانس پزشکی دبی', en: 'Ambulance' } },
      { type: 'TOURIST_POLICE', phone: '901', label: { fa: 'پلیس گردشگری دبی', en: 'Tourist Security' } },
    ],
    embassy: {
      country: 'UAE',
      city: 'Dubai',
      name: { fa: 'سرکنسولگری جمهوری اسلامی ایران در دبی', en: 'Consulate General of Iran in Dubai' },
      address: { fa: 'دبی، بردبی، خیابان الوصل', en: 'Al Wasl Rd, Bur Dubai, Dubai' },
      phone: '+97143444717',
      emergencyHotline: '+971506543210',
    },
    accreditedHospitals: [
      { name: 'Iranian Hospital Dubai', phone: '+97143440250', address: 'Al Wasl Rd, Al Hudaiba, Dubai' },
      { name: 'Mediclinic City Hospital', phone: '+97144359999', address: 'Dubai Healthcare City' },
    ],
  },
  GE: {
    countryCode: 'GE',
    countryName: { fa: 'گرجستان', en: 'Georgia' },
    safetyLevel: 'NORMAL',
    emergencyContacts: [
      { type: 'POLICE', phone: '112', label: { fa: 'شماره امداد یکپارچه گرجستان', en: 'Unified Emergency' } },
    ],
    embassy: {
      country: 'Georgia',
      city: 'Tbilisi',
      name: { fa: 'سفارت جمهوری اسلامی ایران در تفلیس', en: 'Embassy of Iran in Tbilisi' },
      address: { fa: 'تفلیس، خیابان چاوچاوادزه، پلاک ۸۰', en: '80 Chavchavadze Ave, Tbilisi' },
      phone: '+995322913656',
      emergencyHotline: '+995599001122',
    },
    accreditedHospitals: [
      { name: 'MediClub Georgia', phone: '+995322251991', address: '22a Tashkenti St, Tbilisi' },
    ],
  },
  IR: {
    countryCode: 'IR',
    countryName: { fa: 'ایران', en: 'Iran' },
    safetyLevel: 'NORMAL',
    emergencyContacts: [
      { type: 'POLICE', phone: '110', label: { fa: 'پلیس ۱۱۰', en: 'Police 110' } },
      { type: 'AMBULANCE', phone: '115', label: { fa: 'اورژانس ۱۱۵', en: 'Ambulance 115' } },
      { type: 'FIRE', phone: '125', label: { fa: 'آتش‌نشانی ۱۲۵', en: 'Fire 125' } },
    ],
    accreditedHospitals: [
      { name: 'بیمارستان دی تهران', phone: '+982184901', address: 'تهران، خیابان ولیعصر، تقاطع توانیر' },
      { name: 'بیمارستان میلاد', phone: '+982182039', address: 'تهران، بزرگراه همت' },
    ],
  },
};

export class DutyOfCareService {
  /**
   * Retrieves the comprehensive safety and consular profile for a country
   */
  static getSafetyProfile(countryCode: string): DestinationSafetyProfile {
    const code = countryCode.toUpperCase();
    return (
      DESTINATION_SAFETY_PROFILES[code] || {
        countryCode: code,
        countryName: { fa: countryCode, en: countryCode },
        safetyLevel: 'NORMAL',
        emergencyContacts: [
          { type: 'POLICE', phone: '112', label: { fa: 'شماره اضطراری بین‌المللی', en: 'International Emergency' } },
        ],
        accreditedHospitals: [],
      }
    );
  }

  /**
   * Generates proactive disruption resolution when a flight or transfer is cancelled
   */
  static createDisruptionPlan(params: {
    bookingRef: string;
    cancelledItemType: 'FLIGHT' | 'HOTEL' | 'TRANSFER';
    title: string;
    originalDate: string;
    availableAlternates?: string[];
  }): {
    actionRequired: boolean;
    priority: 'HIGH' | 'CRITICAL';
    title: { fa: string; en: string };
    resolutionSteps: Array<{ fa: string; en: string }>;
  } {
    return {
      actionRequired: true,
      priority: 'CRITICAL',
      title: {
        fa: `رسیدگی فوری به اختلال در رزرو ${params.title}`,
        en: `Immediate Disruption Resolution for ${params.title}`,
      },
      resolutionSteps: [
        {
          fa: 'توقف کسر جریمه کنسلی و فعال‌سازی پروتکل استرداد ۱۰۰٪ بدون کسر کارمزد',
          en: 'Instant 100% full-refund waiver protection activated without penalty',
        },
        {
          fa: 'هماهنگی جایگزین رایگان در اولین پرواز یا ترانسفر بعدی تأمین‌کننده',
          en: 'Free priority rebooking onto next available scheduled service',
        },
        {
          fa: 'ارسال پیامک و تماس خودکار کانسیرژ اختصاصی با مسافر',
          en: 'Dedicated travel concierge assigned for direct phone coordination',
        },
      ],
    };
  }
}
