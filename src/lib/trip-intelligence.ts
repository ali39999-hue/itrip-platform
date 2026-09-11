/**
 * Trip Intelligence & Proactive Travel Concierge Engine (Section 16).
 *
 * Monitors real-time signals for active and upcoming trips:
 * - Flight statuses & delay disruptions
 * - Airport transfer alignment & auto-rescheduling recommendations
 * - Destination weather advisories & indoor/outdoor activity shifts
 * - Visa & immigration requirements
 * - Currency exchange guidance
 * - Offline ticket caching reminders
 */

import { getDestinationDailyWeather } from './weather-planner';
import { num } from './format';

export type TripAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type TripAlertCategory =
  | 'FLIGHT_DELAY'
  | 'TRANSFER_MISALIGN'
  | 'WEATHER_ADVISORY'
  | 'BOARDING_SOON'
  | 'OFFLINE_READY'
  | 'VISA_REQUIREMENT'
  | 'CURRENCY_TIP';

export interface TripAlertAction {
  label: { fa: string; en: string };
  actionType:
    | 'RESCHEDULE_TRANSFER'
    | 'SAVE_OFFLINE'
    | 'VIEW_WEATHER'
    | 'CONTACT_SUPPORT'
    | 'NAVIGATE';
  targetUrl?: string;
}

export interface TripAlert {
  id: string;
  category: TripAlertCategory;
  severity: TripAlertSeverity;
  title: { fa: string; en: string };
  description: { fa: string; en: string };
  action?: TripAlertAction;
  timestamp: string;
}

export interface ActiveTripContext {
  bookingId: string;
  reference: string;
  destinationCity: string;
  destinationCountry: string; // e.g. 'turkey', 'uae', 'iran'
  travelDate: string; // YYYY-MM-DD
  departureTime?: string; // HH:mm
  flightNo?: string;
  flightDelayMinutes?: number;
  hasTransferBooked?: boolean;
  transferPickupTime?: string; // HH:mm
  isOfflineSaved?: boolean;
  locale?: string;
}

export class TripIntelligenceService {
  /**
   * Evaluates all live trip signals and generates actionable alerts
   */
  static evaluateSignals(ctx: ActiveTripContext): TripAlert[] {
    const alerts: TripAlert[] = [];
    const now = new Date();
    const [y, m, d] = ctx.travelDate.split('-').map(Number);
    const [hh, mm] = (ctx.departureTime || '08:00').split(':').map(Number);
    const tripDate = new Date(y, m - 1, d, hh, mm);
    const diffHours = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 1. Boarding Soon Signal (< 3 hours before flight)
    if (diffHours > 0 && diffHours <= 3) {
      alerts.push({
        id: `alt_boarding_${ctx.bookingId}`,
        category: 'BOARDING_SOON',
        severity: 'CRITICAL',
        title: {
          fa: 'زمان سوار شدن به هواپیما نزدیک است',
          en: 'Flight Boarding Call Approaching',
        },
        description: {
          fa: `کمتر از ۳ ساعت تا پرواز ${ctx.flightNo || ''} زمان باقی است. لطفاً کارت پرواز دیجیتال خود را باز نگه دارید و به گیت خروجی مراجعه فرمایید.`,
          en: `Less than 3 hours remaining before flight ${ctx.flightNo || ''}. Please have your digital boarding pass ready at the gate.`,
        },
        action: {
          label: { fa: 'نمایش کارت پرواز', en: 'View Boarding Pass' },
          actionType: 'NAVIGATE',
          targetUrl: `/my-trips/${ctx.bookingId}`,
        },
        timestamp: now.toISOString(),
      });
    }

    // 2. Flight Delay & Airport Transfer Misalignment Proactive Recommendation
    const delay = ctx.flightDelayMinutes ?? 0;
    if (delay > 20) {
      const delayFa = num(delay, 'fa');
      if (ctx.hasTransferBooked) {
        alerts.push({
          id: `alt_transfer_misalign_${ctx.bookingId}`,
          category: 'TRANSFER_MISALIGN',
          severity: 'CRITICAL',
          title: {
            fa: `تاخیر پرواز (${delayFa} دقیقه) و تداخل ساعت ترانسفر فرودگاهی`,
            en: `Flight Delayed by ${delay}m: Airport Transfer Misaligned`,
          },
          description: {
            fa: `پرواز شما دارای ${delayFa} دقیقه تاخیر است و ساعت استقبال راننده ترانسفر دیگر همخوانی ندارد. آیا مایلید ساعت ترانسفر را به صورت خودکار و رایگان هماهنگ کنیم؟`,
            en: `Your flight is delayed by ${delay} min. Your airport pickup may no longer match. Would you like us to automatically reschedule your transfer?`,
          },
          action: {
            label: { fa: 'هماهنگی خودکار ساعت ترانسفر', en: 'Reschedule Transfer' },
            actionType: 'RESCHEDULE_TRANSFER',
          },
          timestamp: now.toISOString(),
        });
      } else {
        alerts.push({
          id: `alt_flight_delay_${ctx.bookingId}`,
          category: 'FLIGHT_DELAY',
          severity: 'WARNING',
          title: {
            fa: `اعلام تاخیر پرواز ${ctx.flightNo || ''}`,
            en: `Flight ${ctx.flightNo || ''} Delayed`,
          },
          description: {
            fa: `طبق اعلام فرودگاه، پرواز شما با ${delay} دقیقه تاخیر حرکت خواهد کرد.`,
            en: `Airport operations report a ${delay} minute delay for your departure.`,
          },
          action: {
            label: { fa: 'پشتیبانی ۲۴ ساعته', en: 'Contact Support' },
            actionType: 'CONTACT_SUPPORT',
            targetUrl: `/support?ref=${ctx.reference}`,
          },
          timestamp: now.toISOString(),
        });
      }
    }

    // 3. Offline Access Advisory
    if (!ctx.isOfflineSaved && diffHours <= 24 && diffHours > 0) {
      alerts.push({
        id: `alt_offline_${ctx.bookingId}`,
        category: 'OFFLINE_READY',
        severity: 'INFO',
        title: {
          fa: 'ذخیره آفلاین واچر پیش از پرواز',
          en: 'Save Ticket Offline Before Flight',
        },
        description: {
          fa: 'برای جلوگیری از مشکلات ناشی از قطعی اینترنت و رومینگ در فرودگاه مقصد، واچر خود را با یک کلیک در حافظه آفلاین مرورگر ذخیره کنید.',
          en: 'Save your itinerary voucher offline to ensure gate barcode access even without roaming internet.',
        },
        action: {
          label: { fa: 'ذخیره در حافظه آفلاین', en: 'Save Offline' },
          actionType: 'SAVE_OFFLINE',
        },
        timestamp: now.toISOString(),
      });
    }

    // 4. Destination Weather Advisory
    try {
      const weather = getDestinationDailyWeather(ctx.destinationCountry || 'turkey', 1);
      if (weather.isRainy || weather.condition === 'rainy') {
        alerts.push({
          id: `alt_weather_${ctx.bookingId}`,
          category: 'WEATHER_ADVISORY',
          severity: 'WARNING',
          title: {
            fa: `پیش‌بینی بارندگی در ${ctx.destinationCity}`,
            en: `Precipitation Expected in ${ctx.destinationCity}`,
          },
          description: {
            fa: `هوای روز سفر در ${ctx.destinationCity} بارانی پیش‌بینی شده است (${weather.tempC}°C). پیشنهاد می‌کنیم بازدیدهای موزه و مراکز سرپوشیده را در اولویت قرار دهید.`,
            en: `Rainy conditions forecast in ${ctx.destinationCity} (${weather.tempC}°C). We recommend prioritizing indoor cultural activities.`,
          },
          action: {
            label: { fa: 'مشاهده برنامه آب‌وهوا', en: 'View Weather' },
            actionType: 'VIEW_WEATHER',
          },
          timestamp: now.toISOString(),
        });
      }
    } catch {
      // Graceful fallback if weather unavailable
    }

    // 5. Currency & FX Recommendation
    if (ctx.destinationCountry === 'turkey') {
      alerts.push({
        id: `alt_currency_${ctx.bookingId}`,
        category: 'CURRENCY_TIP',
        severity: 'INFO',
        title: {
          fa: 'راهنمای ارز مسافرتی ترکیه',
          en: 'Turkey Travel Currency Guide',
        },
        description: {
          fa: 'در استانبول بهتر است همراه خود دلار یا تتر داشته باشید و در صرافی‌های مرکز شهر (Döviz) به لیر تبدیل فرمایید.',
          en: 'In Istanbul, carry USD or cash to exchange at city-center Döviz offices for the best rates.',
        },
        timestamp: now.toISOString(),
      });
    }

    return alerts;
  }
}
