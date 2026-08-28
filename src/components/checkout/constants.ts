import type { CheckoutStepItem, PassportScanResult } from './types';

/**
 * Standard Pricing Constants for Checkout Addons (in IRR)
 */
export const ESIM_PRICE = 450000;
export const INSURANCE_PRICE = 680000;

/**
 * Visual Workflow Stepper Stages
 */
export const CHECKOUT_STEPS: readonly CheckoutStepItem[] = [
  { id: 'passengers', labelFa: 'اطلاعات مسافر', labelEn: 'Passenger Info', num: 1 },
  { id: 'payment', labelFa: 'پرداخت و بازبینی', labelEn: 'Payment & Review', num: 2 },
  { id: 'issuing', labelFa: 'صدور و نهایی‌سازی', labelEn: 'Issuance & Voucher', num: 3 },
] as const;

/**
 * GDS / Airline Ticketing Issuance Steps
 */
export const ISSUING_STEPS: readonly string[] = [
  'در حال استعلام ظرفیت و برقراری ارتباط با ایرلاین/هتل...',
  'تخصیص صندلی و ثبت کد رهگیری PNR در سیستم رزرواسیون جهانی...',
  'صدور نهایی بلیط الکترونیکی و ثبت بیمه‌نامه...',
] as const;

/**
 * Issuance Countdown Timer (in seconds)
 */
export const DEFAULT_COUNTDOWN = 25;

/**
 * Simulated Passport OCR Scan Payload
 */
export const MOCK_PASSPORT_DATA: PassportScanResult = {
  firstName: 'ALI',
  lastName: 'MOHAMMADI',
  passportNo: 'L2948175',
  birthDate: '1988-06-15',
  nationalId: '0012345678',
  gender: 'MALE',
};
