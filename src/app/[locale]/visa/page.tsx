'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { VISA_SERVICES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCheck2, ArrowRight, ArrowLeft, CheckCircle2, Headset } from 'lucide-react';

/* placeholder تصاویر — باید با عکس واقعی جایگزین شود (work/stitch-mockup-notes.md)
   همه URLها در صفحه اصلی/تورها استفاده و HEAD-تست شده‌اند (200) */
const VISA_IMGS: Record<string, string> = {
  Turkey: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  UAE: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=70&w=800',
  Georgia: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
  Russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=70&w=800',
};

export default function VisaPage() {
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  const [selected, setSelected] = useState<(typeof VISA_SERVICES)[number] | null>(null);
  const [step, setStep] = useState(0);
  const [firstEn, setFirstEn] = useState('');
  const [lastEn, setLastEn] = useState('');
  const [passport, setPassport] = useState('');
  const [error, setError] = useState('');

  function start(service: (typeof VISA_SERVICES)[number]) {
    setSelected(service);
    setStep(2);
    setError('');
    document.getElementById('visa-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function submit() {
    if (!selected) return;
    if (!firstEn.trim() || !lastEn.trim() || !passport.trim()) {
      setError('لطفاً همه فیلدها را تکمیل کنید');
      return;
    }
    if (!/^[A-Z0-9]{6,12}$/i.test(passport)) {
      setError('شماره پاسپورت معتبر نیست (حروف لاتین و اعداد)');
      return;
    }
    setStep(3);
    setTimeout(() => {
      setBookingContext({
        type: 'visa',
        title: `ویزای ${selected.countryFa}`,
        subtitle: `${firstEn} ${lastEn} • ${passport.toUpperCase()}`,
        amount: selected.price,
        travelDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      });
      router.push('/checkout');
    }, 900);
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-6 md:pt-8 pb-20 flex flex-col gap-10">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center bg-deep shadow-sm group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=75&w=1800"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent"></div>
        <div className="relative z-10 text-center px-4 max-w-3xl py-14">
          <h1 className="text-surface mb-4 text-[32px] md:text-[40px] leading-tight font-black tracking-tight">
            خدمات ویزای تضمینی
          </h1>
          <p className="text-surface/90 mb-8 text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto">
            سفر به دور دنیا با خیالی آسوده. ما تمام مراحل دریافت ویزا را برای شما انجام می‌دهیم.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => document.getElementById('visa-cards')?.scrollIntoView({ behavior: 'smooth' })}
              aria-label="درخواست مشاوره رایگان"
              className="bg-paper text-brand-dark px-8 py-4 rounded-xl font-bold text-[14px] hover:bg-soft shadow-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Headset size={20} />
              درخواست مشاوره رایگان
            </button>
          </div>
        </div>
      </section>

      {/* Staggered Visa Cards Grid */}
      <section id="visa-cards">
        <h2 className="text-center font-black text-ink text-[24px] md:text-[28px] tracking-tight mb-8">
          محبوب‌ترین مقاصد ویزا
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {VISA_SERVICES.map((v, i) => (
            <article
              key={v.id}
              className={`relative rounded-2xl overflow-hidden bg-paper shadow-sm hover:shadow-md transition-shadow group border border-line/60 card-lift ${
                i % 2 === 0 ? 'lg:mt-8' : ''
              }`}
            >
              <div className="relative h-48 overflow-hidden bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={VISA_IMGS[v.countryEn]}
                  alt={`ویزای ${v.countryFa}`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-0 inset-x-0 p-4 h-48 bg-gradient-to-b from-deep/70 to-transparent">
                  <span className="text-surface text-[20px] md:text-[24px] font-black drop-shadow-md">
                    {v.countryFa}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-surface/90 backdrop-blur-md -mt-8 mb-4 relative z-10 mx-4 rounded-xl shadow-sm border border-line">
                <div className="flex justify-between items-center mb-4 border-b border-line pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-sub">نوع ویزا</span>
                    <span className="text-[14px] font-black text-ink">{v.type}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[12px] font-bold text-sub">درصد موفقیت</span>
                    <span className="text-[20px] md:text-[24px] text-brand-dark font-black num">
                      ٪{v.approvalRate.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-sub">شروع قیمت از</span>
                    <span className="text-[20px] md:text-[24px] text-price font-black num">
                      {v.price.toLocaleString('fa-IR')}
                      <span className="text-[12px] font-bold text-sub me-1">تومان</span>
                    </span>
                  </div>
                  <button
                    onClick={() => start(v)}
                    disabled={step === 3}
                    aria-label={`شروع درخواست ویزای ${v.countryFa}`}
                    className="bg-brand/10 text-brand-dark px-4 py-2.5 rounded-full font-black text-[13px] hover:bg-brand hover:text-surface transition-colors flex items-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    شروع درخواست <ArrowLeft size={18} className="ltr:rotate-180" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* فرم درخواست */}
      {selected && step >= 2 && (
        <div id="visa-form" className="max-w-2xl mx-auto mt-6 bg-surface rounded-xl border border-line shadow-sm p-8">
          <h2 className="text-lg font-black text-ink mb-6 flex items-center gap-2">
            <FileCheck2 size={20} className="text-brand-dark" />
            درخواست ویزای {selected.countryFa}
          </h2>

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-sub">نام (لاتین)</label>
                  <Input value={firstEn} onChange={(e) => setFirstEn(e.target.value)} placeholder="ALI" dir="ltr" className="font-extrabold focus-visible:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-sub">فامیل (لاتین)</label>
                  <Input value={lastEn} onChange={(e) => setLastEn(e.target.value)} placeholder="REZAEI" dir="ltr" className="font-extrabold focus-visible:ring-brand" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12.5px] font-bold text-sub">شماره پاسپورت</label>
                <Input value={passport} onChange={(e) => setPassport(e.target.value)} placeholder="EP1234567" dir="ltr" className="font-extrabold focus-visible:ring-brand" />
              </div>
              {error && <p className="text-rose-warm text-[12.5px] font-bold p-2.5 bg-rose-warm/10 rounded-lg">{error}</p>}
              <Button onClick={submit} aria-label="ثبت و پرداخت هزینه ویزا" className="w-full h-12 bg-action hover:bg-action/90 text-[#14201f] font-black rounded-xl text-[14px] mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                ثبت و پرداخت هزینه
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <CheckCircle2 size={52} className="mx-auto text-success mb-4" />
              <p className="font-black text-[17px] text-ink">درخواست شما ثبت شد</p>
              <p className="text-sub mt-2 flex items-center justify-center gap-2 text-[12.5px] font-bold">
                در حال انتقال به صفحه پرداخت <ArrowRight size={16} className="animate-pulse" />
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
