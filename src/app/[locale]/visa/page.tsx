'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { VISA_SERVICES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shimmerDataUrl } from '@/lib/image-utils';
import { FileCheck2, ArrowRight, ArrowLeft, CheckCircle2, Headset } from 'lucide-react';
import { lt } from '@/lib/lt';

const VISA_IMGS: Record<string, string> = {
  Turkey: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  UAE: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=70&w=800',
  Georgia: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=70&w=800',
  Russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=70&w=800',
};

export default function VisaPage() {
  const t = useTranslations('Visa');
  const locale = useLocale();
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
      setError(lt(locale, { fa: 'لطفاً همه فیلدها را تکمیل کنید', en: 'Please fill all required fields', ar: 'يرجى تعبئة جميع الحقول المطلوبة', zh: '请填写所有必填项', ru: 'Заполните все обязательные поля' }));
      return;
    }
    if (!/^[A-Z0-9]{6,12}$/i.test(passport)) {
      setError(lt(locale, { fa: 'شماره پاسپورت معتبر نیست (حروف لاتین و اعداد)', en: 'Invalid passport number', ar: 'رقم جواز سفر غير صالح (أحرف لاتينية وأرقام)', zh: '护照号无效（拉丁字母和数字）', ru: 'Неверный номер паспорта (латиница и цифры)' }));
      return;
    }
    setStep(3);
    setTimeout(() => {
      setBookingContext({
        type: 'visa',
        title: `${lt(locale, { fa: 'ویزای', en: 'Visa for', ar: 'تأشيرة', zh: '签证', ru: 'Виза в' })} ${locale === 'fa' ? selected.countryFa : selected.countryEn}`,
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
        <Image
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 400)}
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-3xl py-14">
          <h1 className="text-surface mb-4 text-[32px] md:text-[40px] leading-tight font-black tracking-tight">
            {t('title')}
          </h1>
          <p className="text-surface/90 mb-8 text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => document.getElementById('visa-cards')?.scrollIntoView({ behavior: 'smooth' })}
              aria-label={t('cta')}
              className="bg-paper text-brand-dark px-8 py-4 rounded-xl font-bold text-[14px] hover:bg-soft shadow-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Headset size={20} />
              {t('cta')}
            </button>
          </div>
        </div>
      </section>

      {/* Staggered Visa Cards Grid */}
      <section id="visa-cards">
        <h2 className="text-center font-black text-ink text-[24px] md:text-[28px] tracking-tight mb-8">
          {lt(locale, { fa: 'محبوب‌ترین مقاصد ویزا', en: 'Popular Visa Destinations', ar: 'أشهر وجهات التأشيرة', zh: '热门签证目的地', ru: 'Популярные визовые направления' })}
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
                <Image
                  src={VISA_IMGS[v.countryEn] || VISA_IMGS.Turkey}
                  alt={`ویزای ${v.countryFa}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrl(800, 400)}
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
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
                    <span className="text-[12px] font-bold text-sub">{lt(locale, { fa: 'نوع ویزا', en: 'Visa Type', ar: 'نوع التأشيرة', zh: '签证类型', ru: 'Тип визы' })}</span>
                    <span className="text-[14px] font-black text-ink">{v.type}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[12px] font-bold text-sub">{lt(locale, { fa: 'درصد موفقیت', en: 'Success Rate', ar: 'نسبة الموافقة', zh: '成功率', ru: 'Процент одобрения' })}</span>
                    <span className="text-[20px] md:text-[24px] text-brand-dark font-black num">
                      %{v.approvalRate.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-sub">{lt(locale, { fa: 'شروع قیمت از', en: 'Starting from', ar: 'يبدأ السعر من', zh: '价格起', ru: 'От' })}</span>
                    <span className="text-[20px] md:text-[24px] text-price font-black num">
                      {v.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                      <span className="text-[12px] font-bold text-sub me-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => start(v)}
                    aria-label={`شروع درخواست ${v.countryFa}`}
                    className="bg-brand text-surface px-4 py-2.5 rounded-xl font-black text-[13px] hover:bg-brand-dark transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span>{t('startApplication')}</span>
                    <ArrowLeft size={16} className="rtl:hidden" />
                    <ArrowRight size={16} className="ltr:hidden" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Embedded Form Section */}
      {selected && (
        <section id="visa-form" className="bg-paper p-6 md:p-8 rounded-2xl border border-line scroll-mt-24 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-line">
            <FileCheck2 size={24} className="text-brand-dark" />
            <div>
              <h3 className="text-lg font-black text-ink">
                {t('startApplication')}: {selected.countryFa}
              </h3>
              <p className="text-xs text-sub font-bold">{t('requirements')}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-bold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lt(locale, { fa: 'نام (لاتین)', en: 'First Name (Latin)', ar: 'الاسم الأول (باللاتينية)', zh: '名（拉丁字母）', ru: 'Имя (латиницей)' })}
              </label>
              <Input
                value={firstEn}
                onChange={(e) => setFirstEn(e.target.value)}
                placeholder="ALI"
                className="uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lt(locale, { fa: 'نام خانوادگی (لاتین)', en: 'Last Name (Latin)', ar: 'اسم العائلة (باللاتينية)', zh: '姓（拉丁字母）', ru: 'Фамилия (латиницей)' })}
              </label>
              <Input
                value={lastEn}
                onChange={(e) => setLastEn(e.target.value)}
                placeholder="MOHAMMADI"
                className="uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}
              </label>
              <Input
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                placeholder="A12345678"
                className="uppercase font-bold font-mono"
              />
            </div>

            <Button
              onClick={submit}
              disabled={step === 3}
              className="w-full mt-2 bg-action hover:bg-action-hover text-[#14201f] font-black h-12 rounded-xl text-sm"
            >
              {step === 3 ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> {lt(locale, { fa: 'در حال انتقال به پرداخت...', en: 'Redirecting to checkout...', ar: 'جارٍ التحويل إلى الدفع...', zh: '正在跳转到支付…', ru: 'Переход к оплате…' })}
                </span>
              ) : (
                t('startApplication')
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
