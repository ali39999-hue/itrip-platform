export type PassportStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'INSUFFICIENT_SIX_MONTHS';

export interface PassportValidationResult {
  isValidForTravel: boolean;
  status: PassportStatus;
  remainingDays: number;
  message: { fa: string; en: string };
}

export class PassportValidityGuard {
  /**
   * Evaluates international 6-month passport validity rule (Travel-CRM pattern).
   * Most destinations require at least 180 days of validity beyond travel date.
   */
  static verifyPassport(params: {
    passportExpiryDate: string; // YYYY-MM-DD
    travelDate: string; // YYYY-MM-DD
    requiredValidityDays?: number; // default 180 days (6 months)
  }): PassportValidationResult {
    const requiredDays = params.requiredValidityDays ?? 180;

    const expiry = new Date(params.passportExpiryDate);
    const travel = new Date(params.travelDate);

    if (isNaN(expiry.getTime()) || isNaN(travel.getTime())) {
      return {
        isValidForTravel: false,
        status: 'EXPIRED',
        remainingDays: 0,
        message: {
          fa: 'فرمت تاریخ انقضای گذرنامه یا تاریخ سفر نامعتبر است.',
          en: 'Invalid passport expiry or travel date format.',
        },
      };
    }

    const diffMs = expiry.getTime() - travel.getTime();
    const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) {
      return {
        isValidForTravel: false,
        status: 'EXPIRED',
        remainingDays,
        message: {
          fa: 'گذرنامه در تاریخ سفر منقضی شده است. امکان صدور بلیت خارجی وجود ندارد.',
          en: 'Passport is expired on the travel date. International ticket issuance prohibited.',
        },
      };
    }

    if (remainingDays < requiredDays) {
      return {
        isValidForTravel: false,
        status: 'INSUFFICIENT_SIX_MONTHS',
        remainingDays,
        message: {
          fa: `اعتبار گذرنامه (${remainingDays} روز) کمتر از حداقل ۶ ماه قانونی (۱۸۰ روز) است و پلیس مهاجرت مانع خروج خواهد شد.`,
          en: `Passport validity (${remainingDays} days) is less than the mandatory 6 months (180 days).`,
        },
      };
    }

    return {
      isValidForTravel: true,
      status: 'VALID',
      remainingDays,
      message: {
        fa: `گذرنامه دارای ${remainingDays} روز اعتبار مجاز است و برای سفر تایید شد.`,
        en: `Passport has ${remainingDays} days of validity and is approved for international travel.`,
      },
    };
  }
}
