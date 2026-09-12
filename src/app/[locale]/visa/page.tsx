'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { VISA_SERVICES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shimmerDataUrl } from '@/lib/image-utils';
import { FileCheck2, ArrowRight, ArrowLeft, CheckCircle2, Headset, Clock } from 'lucide-react';
import { lt } from '@/lib/lt';

const VISA_IMGS: Record<string, string> = {
  Turkey: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=70&w=800',
  UAE: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=70&w=800',
  Georgia: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=70&w=800',
  Russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&q=70&w=800',
  China: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=70&w=800',
  Oman: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=70&w=800',
};

export default function VisaPage() {
  const t = useTranslations('Visa');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const { country, setCountry } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES.iran;

  const [selected, setSelected] = useState<(typeof VISA_SERVICES)[number] | null>(null);
  const [step, setStep] = useState(0);
  const [firstEn, setFirstEn] = useState('');
  const [lastEn, setLastEn] = useState('');
  const [passport, setPassport] = useState('');
  const [hasValidPassport, setHasValidPassport] = useState(true);
  const [hasPhoto, setHasPhoto] = useState(true);
  const [error, setError] = useState('');

  const sortedVisas = useMemo(() => {
    return [...VISA_SERVICES].sort((a, b) => {
      const matchA = a.countryEn.toLowerCase() === c.nameEn.toLowerCase() || a.countryFa === c.nameFa;
      const matchB = b.countryEn.toLowerCase() === c.nameEn.toLowerCase() || b.countryFa === c.nameFa;
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [c]);

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
          src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 400)}
          className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-3xl py-14">
          <h1 className="text-white hero-glow-text mb-4 text-[32px] md:text-[40px] leading-tight font-black tracking-tight">
            {t('title')}
          </h1>
          <p className="text-white/90 hero-glow-sub mb-8 text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto">
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
        <div className="flex flex-col items-center gap-3 mb-8">
          <h2 className="text-center font-black text-ink text-[24px] md:text-[28px] tracking-tight m-0">
            {lt(locale, { fa: 'محبوب‌ترین مقاصد اخذ ویزا', en: 'Popular Visa Destinations', ar: 'أشهر وجهات التأشيرة', zh: '热门签证目的地', ru: 'Популярные визовые направления' })}
          </h2>
          {/* Country Selection Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-xs snap-x touch-pan-x">
            {COUNTRY_ORDER.map((id) => (
              <button
                key={`visa-country-${id}`}
                type="button"
                onClick={() => setCountry(id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-black transition cursor-pointer ${
                  country === id
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-soft text-sub hover:text-ink hover:bg-line/60'
                }`}
              >
                <span className="me-1">{COUNTRIES[id].flag}</span>
                <span>{countryName(id, locale)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {sortedVisas.map((v) => {
            const isMatch = v.countryEn.toLowerCase() === c.nameEn.toLowerCase() || v.countryFa === c.nameFa;
            return (
              <article
                key={v.id}
                className={`relative rounded-3xl overflow-hidden bg-surface transition-all group border flex flex-col justify-between ${
                  isMatch ? 'border-brand ring-2 ring-brand/20 shadow-elev-2' : 'border-line shadow-xs hover:shadow-elev-2'
                }`}
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-soft">
                    <Image
                      src={VISA_IMGS[v.countryEn] || VISA_IMGS.Turkey}
                      alt={`${lt(locale, { fa: 'ویزای', en: 'Visa for', ar: 'تأشيرة', zh: '签证', ru: 'Виза в' })} ${locale === 'fa' ? v.countryFa : v.countryEn}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrl(800, 400)}
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent" />
                    
                    <div className="absolute top-3 start-3 flex items-center gap-2">
                      <span className="text-surface text-xl font-black drop-shadow-md">
                        {locale === 'fa' ? v.countryFa : v.countryEn}
                      </span>
                      {isMatch && (
                        <span className="px-2 py-0.5 rounded-full bg-mint text-brand-dark text-[10px] font-black shadow-xs">
                          {lt(locale, { fa: 'مقصد انتخابی شما', en: 'Selected Country', ar: 'البلد المختار', zh: '当前选择国家', ru: 'Выбранная страна' })}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 start-3 flex items-center gap-1.5 text-[11px] font-bold text-mint-bright">
                      <Clock size={12} aria-hidden="true" />
                      <span>
                        {lt(locale, {
                          fa: `بررسی در ${v.processingDays} روز کاری`,
                          en: `Processed in ${v.processingDays} days`,
                          ar: `معالجة خلال ${v.processingDays} أيام عمل`,
                          zh: `${v.processingDays} 个工作日`,
                          ru: `Оформление: ${v.processingDays} дн.`,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-line/60">
                    <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'نوع ویزا', en: 'Visa Type', ar: 'نوع التأشيرة', zh: '签证类型', ru: 'Тип визы' })}</span>
                    <span className="text-xs font-black text-ink">
                      {lt(locale, { fa: v.type, en: v.typeEn || 'Tourist', ar: 'سياحية', zh: '旅游签证', ru: 'Туристическая' })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-line/60">
                    <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'درصد قبولی', en: 'Approval Rate', ar: 'نسبة القبول', zh: '通过率', ru: 'Одобрение' })}</span>
                    <span className="text-sm text-brand-dark font-black num">
                      %{v.approvalRate.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    </span>
                  </div>
                </div>

              <div className="p-5 pt-0 mt-2">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'شروع نرخ:', en: 'Starting from:', ar: 'يبدأ من:', zh: '价格起：', ru: 'От:' })}</span>
                  <div className="text-end">
                    <span className="text-lg font-black text-price font-mono num">
                      {v.price.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                    </span>
                    <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => start(v)}
                  aria-label={`${t('startApplication')} - ${locale === 'fa' ? v.countryFa : v.countryEn}`}
                  className="w-full h-11 bg-action hover:bg-action-hover text-ink rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>{t('startApplication')}</span>
                  <ArrowLeft size={14} className="rtl:inline ltr:hidden" />
                  <ArrowRight size={14} className="ltr:inline rtl:hidden" />
                </button>
              </div>
            </article>
          );
        })}
        </div>
      </section>

      {/* Embedded Application Form Section */}
      {selected && (
        <section id="visa-form" className="bg-surface p-6 md:p-8 rounded-3xl border border-line shadow-elev-2 scroll-mt-24 max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <div className="w-10 h-10 rounded-xl bg-mint text-brand-dark grid place-items-center">
              <FileCheck2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-ink">
                {t('startApplication')}: {lt(locale, { fa: 'ویزای', en: 'Visa for', ar: 'تأشيرة', zh: '签证', ru: 'Виза в' })} {locale === 'fa' ? selected.countryFa : selected.countryEn}
              </h3>
              <p className="text-xs text-sub font-bold">
                {selected.type} • {lt(locale, {
                  fa: `زمان بررسی تقریبی: ${selected.processingDays} روز کاری`,
                  en: `Estimated processing: ${selected.processingDays} business days`,
                  ar: `وقت المعالجة المتوقع: ${selected.processingDays} أيام عمل`,
                  zh: `预计办理时间：${selected.processingDays} 个工作日`,
                  ru: `Срок оформления: ${selected.processingDays} раб. дн.`,
                })}
              </p>
            </div>
          </div>

          {/* Interactive Requirements Pre-Check */}
          <div className="p-4 rounded-2xl bg-soft border border-line/80 space-y-2.5">
            <span className="text-xs font-black text-ink block mb-1">
              چک‌لیست مدارک الزامی قبل از ثبت درخواست:
            </span>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-sub">
              <input
                type="checkbox"
                checked={hasValidPassport}
                onChange={(e) => setHasValidPassport(e.target.checked)}
                className="w-4 h-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>گذرنامه با حداقل ۶ ماه اعتبار از تاریخ آغاز سفر</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-sub">
              <input
                type="checkbox"
                checked={hasPhoto}
                onChange={(e) => setHasPhoto(e.target.checked)}
                className="w-4 h-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>عکس پرسنلی رنگی جدید تمام‌رخ با زمینه سفید (فایل اسکن‌شده)</span>
            </label>
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
              className="w-full mt-2 bg-action hover:bg-action-hover text-ink font-black h-12 rounded-xl text-sm"
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
