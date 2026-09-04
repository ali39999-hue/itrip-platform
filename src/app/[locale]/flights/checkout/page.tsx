'use client';

import { useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { PassengerForm } from '@/components/flights/PassengerForm';
import { Plane, ShieldCheck, Wifi, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookingStore } from '@/stores/booking-store';
import { num } from '@/lib/format';
import { useLocale, useTranslations } from 'next-intl';
import { FLIGHTS } from '@/lib/data';
import { ESIM_PRICE, INSURANCE_PRICE } from '@/components/checkout/AddonsSection';

// Prices come from the selected booking context or the flight catalog —
// never from magic numbers that drift from the rest of the funnel.
const TAX_RATE = 0.09;

export default function FlightCheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('FlightCheckout');
  const bookingContext = useBookingStore((s) => s.bookingContext);

  const [hasEsim, setHasEsim] = useState(false);
  // Opt-in, not pre-ticked: addons must never be silently added to the bill.
  const [hasInsurance, setHasInsurance] = useState(false);

  const flight = useMemo(() => {
    const fromContext = bookingContext?.type === 'flights' ? bookingContext : null;
    if (fromContext) return fromContext;
    const f = FLIGHTS[0];
    return f
      ? {
          type: 'flights' as const,
          title: `${f.originCity} ✈ ${f.destinationCity} (${f.flightNo})`,
          subtitle: `${f.airline} • ${f.departureTime}`,
          amount: f.price,
          travelDate: '',
          id: f.id,
        }
      : null;
  }, [bookingContext]);

  const baseFare = flight?.amount ?? 0;
  const taxFare = Math.round(baseFare * TAX_RATE);
  const subtotal = baseFare + taxFare;
  const addonsTotal = (hasEsim ? ESIM_PRICE : 0) + (hasInsurance ? INSURANCE_PRICE : 0);
  const total = subtotal + addonsTotal;

  const handleProceed = () => {
    useBookingStore.getState().setBookingContext({
      type: 'flights',
      title: flight?.title || t('flightToMashhad'),
      subtitle: flight?.subtitle || 'Economy Class',
      amount: total,
      travelDate: flight?.travelDate || '',
    });
    router.push('/checkout');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
      <div className="mb-6 flex items-center text-sub text-sm gap-2">
        <span className="cursor-pointer hover:text-brand-dark transition-colors" onClick={() => router.push('/flights/search')}>{t('searchFlights')}</span> 
        <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180 transition-transform" />
        <span className="cursor-pointer hover:text-brand-dark transition-colors" onClick={() => router.push('/flights/search')}>{t('selectFlight')}</span> 
        <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180 transition-transform" />
        <span className="text-ink font-bold">{t('passengerInfoAndPayment')}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column (Forms & Extras) */}
        <div className="flex-1 space-y-6">
          <PassengerForm />

          {/* Unified Cart Extras */}
          <div className="bg-surface/95 backdrop-blur-xl rounded-3xl border border-line/80 p-6 shadow-elev-1">
            <h2 className="text-lg font-bold text-ink mb-6 border-b border-line pb-4">
              {t('recommendedExtras')}
            </h2>
            
            <div className="space-y-4">
              {/* eSIM */}
              <div className={`flex items-start md:items-center gap-4 p-4 border rounded-2xl transition-all ${hasEsim ? 'border-brand bg-mint/30 shadow-sm' : 'border-line hover:border-brand/40 bg-surface'}`}>
                <div className="bg-mint p-3 rounded-full text-brand-dark shrink-0">
                  <Wifi size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink flex items-center gap-2">
                    {t('esimTitle')}
                    {hasEsim && <CheckCircle2 size={16} className="text-brand" />}
                  </h3>
                  <p className="text-sm text-sub mt-1">{t('esimSubtitle')}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-brand-dark num">{num(ESIM_PRICE, locale)} <span className="text-xs">IRR</span></p>
                  <Button 
                    variant={hasEsim ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setHasEsim(!hasEsim)}
                    className={hasEsim ? "mt-2 w-full bg-brand hover:bg-brand-2 text-surface rounded-xl font-bold" : "mt-2 w-full rounded-xl font-bold"}
                  >
                    {hasEsim ? t('remove') : t('add')}
                  </Button>
                </div>
              </div>

              {/* Insurance */}
              <div className={`flex items-start md:items-center gap-4 p-4 border rounded-2xl transition-all ${hasInsurance ? 'border-brand bg-mint/30 shadow-sm' : 'border-line hover:border-brand/40 bg-surface'}`}>
                <div className="bg-mint p-3 rounded-full text-brand-dark shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink flex items-center gap-2">
                    {t('insuranceTitle')}
                    {hasInsurance && <CheckCircle2 size={16} className="text-brand" />}
                  </h3>
                  <p className="text-sm text-sub mt-1">{t('insuranceSubtitle')}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-brand-dark num">{num(INSURANCE_PRICE, locale)} <span className="text-xs">IRR</span></p>
                  <Button 
                    variant={hasInsurance ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setHasInsurance(!hasInsurance)}
                    className={hasInsurance ? "mt-2 w-full bg-brand hover:bg-brand-2 text-surface rounded-xl font-bold" : "mt-2 w-full rounded-xl font-bold"}
                  >
                    {hasInsurance ? t('remove') : t('add')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Price Summary & Booking) */}
        <aside className="lg:w-[350px] shrink-0">
          <div className="bg-surface/95 backdrop-blur-xl rounded-3xl border border-line/80 p-6 sticky top-24 shadow-elev-2">
            <h2 className="text-lg font-bold text-ink mb-6 border-b border-line pb-4">
              {t('priceDetails')}
            </h2>

            {/* Flight Summary */}
            <div className="mb-6 pb-6 border-b border-dashed border-line">
              <div className="flex items-center gap-2 font-bold mb-2 text-ink">
                <Plane size={18} className="text-brand"/>
                <span className="line-clamp-1">{flight?.title || t('flightToMashhad')}</span>
              </div>
              <div className="flex justify-between text-sm text-sub mb-2">
                <span>{t('adultPassengerCount')}</span>
                <span className="num">{num(baseFare, locale)} IRR</span>
              </div>
              <div className="flex justify-between text-sm text-sub">
                <span>{t('taxesAndFees')}</span>
                <span className="num">{num(taxFare, locale)} IRR</span>
              </div>
            </div>

            {/* Extras Summary */}
            {(hasEsim || hasInsurance) && (
              <div className="mb-6 pb-6 border-b border-dashed border-line space-y-2">
                <span className="text-xs font-bold text-sub block">{t('addedServices')}</span>
                {hasEsim && (
                  <div className="flex justify-between text-sm text-sub">
                    <span>{t('touristEsim')}</span>
                    <span className="num">{num(ESIM_PRICE, locale)} IRR</span>
                  </div>
                )}
                {hasInsurance && (
                  <div className="flex justify-between text-sm text-sub">
                    <span>{t('travelInsurance')}</span>
                    <span className="num">{num(INSURANCE_PRICE, locale)} IRR</span>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-ink">{t('amountPayable')}</span>
                <div className="text-start">
                  <p className="text-2xl font-black text-price num">{num(total, locale)}</p>
                  <p className="text-xs text-sub">IRR</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleProceed}
              className="w-full h-14 text-base font-black bg-action hover:bg-action-hover text-ink mb-4 shadow-elev-2 rounded-2xl transition-all"
            >
              {t('confirmAndProceed')}
            </Button>

            <div className="bg-gold-soft text-price p-3.5 rounded-2xl text-xs flex gap-2 border border-gold/20">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t('policyNotice')}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
