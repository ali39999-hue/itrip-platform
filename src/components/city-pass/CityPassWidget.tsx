'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { MapPin, CreditCard, RefreshCw } from 'lucide-react';
import { num } from '@/lib/format';

import { useBookingStore } from '@/stores/booking-store';

const CITIES = {
  tehran: { nameKey: 'tehran', pass: 12, stored: 6, deliv: 3, lines: [['Line 1', '#E4002B'], ['Line 2', '#003DA5'], ['Line 3', '#00AEEF'], ['Line 4', '#FFD100'], ['BRT', '#5C6B6A']] },
  isfahan: { nameKey: 'isfahan', pass: 7, stored: 4, deliv: 3, lines: [['Line 1', '#E4002B'], ['BRT', '#5C6B6A']] },
  mashhad: { nameKey: 'mashhad', pass: 8, stored: 4.5, deliv: 3, lines: [['Line 1', '#009639'], ['Line 2', '#7D3F98'], ['BRT', '#5C6B6A']] },
  shiraz: { nameKey: 'shiraz', pass: 6, stored: 3.5, deliv: 3, lines: [['Line 1', '#E4002B'], ['BRT', '#5C6B6A']] },
} as const;

export function CityPassWidget({ locale }: { locale: string }) {
  const t = useTranslations('CityPassWidget');
  const router = useRouter();
  const [city, setCity] = useState<keyof typeof CITIES>('tehran');
  const [type, setType] = useState<'pass' | 'stored'>('pass');
  const [delivery, setDelivery] = useState('');
  const [isAttempted, setIsAttempted] = useState(false);

  const c = CITIES[city];
  const base = type === 'pass' ? c.pass : c.stored;
  const total = base + c.deliv;

  const isDeliveryValid = delivery.trim().length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAttempted(true);
    if (isDeliveryValid) {
      useBookingStore.getState().addDirectBooking({
        type: 'city-pass',
        title: `${t('title')} (${t(c.nameKey)} - ${type === 'pass' ? t('unlimitedTouristPass') : t('storedValueCard')})`,
        subtitle: `OO-U^UOU, O"U U_OUOOO': ${delivery} ? U.O"U,O ,${total.toFixed(2)}`,
        amount: Math.round(total * 650000),
        currency: 'IRR',
        status: 'confirmed',
        travelDate: new Date().toISOString().slice(0, 10),
        passengers: [{
          firstNameFa: 'O_O OU+O_U',
          lastNameFa: 'UcO OO',
          firstNameEn: 'Pass',
          lastNameEn: 'Holder',
          passportNo: 'DELIVERY-' + city.toUpperCase(),
          birthDate: '1990-01-01',
          gender: 'male',
        }],
        addOns: ['U_U+U, U.O3UOOUOO O" O U+U_U,UOO3UO?OOO"O U+', `OO-U^UOU, UOU, O_O ${t(c.nameKey)}`],
        paymentMethod: 'wallet_irr',
      });
      router.push('/payment-status');
    }
  };

  return (
    <form 
      className="bg-surface border border-line rounded-[24px] shadow-elev-3 mt-8 overflow-hidden max-w-[940px]"
      onSubmit={handleSubmit}
    >
      <div className="px-5 py-4 border-b border-line bg-soft flex items-center gap-3">
        <CreditCard size={22} className="text-brand" />
        <h2 className="m-0 text-[18px] font-bold">{t('title')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="p-6 flex flex-col gap-6 border-b lg:border-b-0 lg:border-s border-line">
          {/* City Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold">{t('selectCity')}</span>
            <span className="text-[12px] text-sub">{t('cityDesc')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(CITIES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCity(k as keyof typeof CITIES)}
                  className={`px-4 py-2 text-[14px] font-bold border-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    city === k 
                      ? 'bg-brand border-brand text-surface' 
                      : 'bg-soft border-transparent text-ink hover:border-brand/40'
                  }`}
                >
                  {t(v.nameKey as any)}
                </button>
              ))}
            </div>
            {/* Networks */}
            <div className="flex flex-wrap gap-2 mt-2">
              {c.lines.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[11px] font-bold">
                  <i className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: l[1] }} />
                  {l[0]}
                </span>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold">{t('passType')}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('pass')}
                className={`p-4 text-start border-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  type === 'pass' 
                    ? 'bg-mint border-brand' 
                    : 'bg-soft border-line hover:border-brand/40'
                }`}
              >
                <strong className="block text-[14px] mb-1 text-ink">{t('cityPass')}</strong>
                <span className="block text-[12px] text-sub mb-2">{t('cityPassDesc')}</span>
                <span className="block font-en text-[16px] font-bold text-price">, {num(c.pass, locale, { minimumFractionDigits: 2 })}</span>
              </button>
              <button
                type="button"
                onClick={() => setType('stored')}
                className={`p-4 text-start border-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  type === 'stored' 
                    ? 'bg-mint border-brand' 
                    : 'bg-soft border-line hover:border-brand/40'
                }`}
              >
                <strong className="block text-[14px] mb-1 text-ink">{t('storedValue')}</strong>
                <span className="block text-[12px] text-sub mb-2">{t('storedValueDesc')}</span>
                <span className="block font-en text-[16px] font-bold text-price">, {num(c.stored, locale, { minimumFractionDigits: 2 })}</span>
              </button>
            </div>
          </div>

          {/* Delivery Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold">{t('deliveryAddress')}</label>
            <div className={`flex items-center gap-2 px-4 py-3 bg-soft border ${isAttempted && !isDeliveryValid ? 'border-rose-warm shadow-[0_0_0_3px_rgba(216,68,47,0.1)]' : 'border-line'} rounded-xl focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] focus-within:bg-surface transition-all`}>
              <MapPin size={20} className="text-sub flex-shrink-0" />
              <input
                type="text"
                className="flex-1 min-w-0 border-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-sub"
                placeholder={t('deliveryPlaceholder')}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              />
            </div>
            {isAttempted && !isDeliveryValid && (
              <span className="text-[13px] text-rose-warm font-bold">{t('deliveryError')}</span>
            )}
          </div>
        </div>

        <div className="p-6 bg-surface flex flex-col">
          <div className="flex justify-between items-center py-2 text-[14px]">
            <span>{type === 'pass' ? t('touristPassOf') : t('storedCardOf')} {t(c.nameKey as any)}</span>
            <span className="font-en font-bold">, {num(base, locale, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-[14px]">
            <span>{t('issueDeliveryFee')}</span>
            <span className="font-en font-bold">, {num(c.deliv, locale, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center py-3 mt-2 border-t border-dashed border-line text-[13px] text-brand-dark font-bold">
            <span className="flex items-center gap-1.5"><RefreshCw size={14} /> {t('deliveryTime')}</span>
            <span>{t('support')}</span>
          </div>

          <div className="flex justify-between items-center py-4 mt-4 border-t-2 border-line">
            <span className="text-[18px] font-bold">{t('totalAmount')}</span>
            <span className="font-en text-[24px] font-bold text-price">, {num(total, locale, { minimumFractionDigits: 2 })}</span>
          </div>

          <button 
            type="submit" 
            className="mt-auto w-full py-4 rounded-full bg-action hover:bg-action-hover text-ink text-[18px] font-black shadow-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <CreditCard size={20} />
            {t('payConfirm')}
          </button>
          <p className="text-center text-[11px] text-sub mt-3 leading-[1.7]">
            {t('footerNotice')}
          </p>
        </div>
      </div>
    </form>
  );
}
