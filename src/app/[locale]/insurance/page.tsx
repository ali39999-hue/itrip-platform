'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { INSURANCE_PLANS } from '@/lib/data';
import type { InsurancePlan } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { ShieldCheck, CheckCircle2, XCircle, Plane, Shield, Users, Clock, Award, ChevronDown } from 'lucide-react';
import { lt } from '@/lib/lt';

type DurationTier = 7 | 15 | 30 | 90;

export default function InsurancePage() {
  const t = useTranslations('Insurance');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const [duration, setDuration] = useState<DurationTier>(15);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const durationMultipliers: Record<DurationTier, number> = {
    7: 0.8,
    15: 1.0,
    30: 1.5,
    90: 2.8,
  };

  function select(plan: InsurancePlan) {
    const finalPrice = Math.round(plan.price * durationMultipliers[duration]);
    setBookingContext({
      type: 'insurance',
      title: `${lt(locale, { fa: 'بیمه مسافرتی سامان', en: 'Saman Travel Insurance', ar: 'تأمين السفر سامان', zh: 'Saman 旅游医疗保险', ru: 'Страховка Saman' })} ${plan.name}`,
      subtitle: `${lt(locale, { fa: 'سقف پوشش', en: 'Coverage up to', ar: 'سقف التغطية', zh: '保额最高', ru: 'Покрытие до' })} €${plan.coverageEur.toLocaleString('en-US')} • ${duration} ${lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}`,
      amount: finalPrice,
      travelDate: daysFromNow(10),
    });
    router.push('/checkout');
  }

  function getIcon(type: string) {
    switch(type) {
      case 'standard': return <Plane size={24} />;
      case 'premium': return <Shield size={24} />;
      case 'family': return <Users size={24} />;
      default: return <ShieldCheck size={24} />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 flex flex-col gap-10">
        
        {/* Hero Section */}
        <section className="relative w-full rounded-3xl overflow-hidden min-h-[340px] md:min-h-[420px] flex items-center justify-center bg-deep shadow-elev-2">
          <Image 
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=75&w=1800"
            alt={t('title')}
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={shimmerDataUrl(1800, 400)}
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/40 to-transparent" />
          <div className="relative z-10 text-center px-4 max-w-3xl flex flex-col items-center gap-3 py-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface/15 backdrop-blur-md text-mint-bright text-xs font-black border border-surface/20">
              <Award size={14} />
              <span>{lt(locale, { fa: 'بیمه‌نامه معتبر مورد تایید سفارتخانه‌ها و کنسولگری‌های حوزه شنگن', en: 'Schengen & Embassy Approved Travel Policy', ar: 'وثيقة تأمين معتمدة لسفارات شنغن', zh: '申根签证及全球使领馆认可保单', ru: 'Полис, аккредитованный посольствами Шенгена' })}</span>
            </span>

            <h1 className="font-black text-3xl sm:text-4xl md:text-5xl text-surface tracking-tight leading-tight">{t('title')}</h1>
            <p className="font-bold text-sm sm:text-base md:text-lg text-surface/90 max-w-xl">
              {t('subtitle')}
            </p>

            <div className="flex items-center gap-2 mt-2 bg-surface/15 backdrop-blur-md px-5 py-2 rounded-full border border-surface/20 text-xs font-bold text-surface">
              <ShieldCheck className="text-mint-bright shrink-0" size={16} />
              <span>{lt(locale, { fa: 'پوشش فوریت‌های پزشکی و گم شدن بار با پشتیبانی ۲۴ ساعته', en: '24/7 International Emergency Medical & Baggage Cover', ar: 'دعم طبي دولي على مدار الساعة', zh: '24/7 全球紧急医疗救援', ru: 'Круглосуточная медицинская поддержка' })}</span>
            </div>
          </div>
        </section>

        {/* Duration Selector Bar */}
        <section className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock size={20} className="text-brand-dark shrink-0" />
            <div>
              <h3 className="text-sm font-black text-ink">
                {lt(locale, { fa: 'مدت اقامت و اعتبار بیمه‌نامه:', en: 'Select Trip Duration:', ar: 'مدة الإقامة وصلاحية التأمين:', zh: '选择旅行保障时长：', ru: 'Срок действия страховки:' })}
              </h3>
              <p className="text-xs text-sub font-bold">
                {lt(locale, { fa: 'قیمت هر طرح متناسب با روزهای اقامت محاسبه می‌گردد.', en: 'Rates update dynamically based on trip duration.', ar: 'تتغير الأسعار تلقائياً وفق مدة الإقامة.', zh: '价格将根据选择的出行天数自动折算。', ru: 'Стоимость пересчитывается автоматически.' })}
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-soft border border-line text-xs font-black">
            {([7, 15, 30, 90] as DurationTier[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  duration === d
                    ? 'bg-brand text-surface shadow-xs'
                    : 'text-sub hover:text-ink'
                }`}
              >
                {d} {lt(locale, { fa: 'روزه', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}
              </button>
            ))}
          </div>
        </section>

        {/* Insurance Plans */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-1 text-start">
            <h2 className="font-black text-2xl md:text-3xl text-ink">{t('plansTitle')}</h2>
            <p className="font-bold text-xs md:text-sm text-sub">
              {lt(locale, { fa: 'پوشش‌های متنوع برای سفرهای انفرادی، خانوادگی و تجاری', en: 'Tailored coverage for individual, family, and business travel', ar: 'تغطيات متنوعة للرحلات الفردية والعائلية والتجارية', zh: '适合个人、家庭及商务旅行的多种保障', ru: 'Различные покрытия для индивидуальных, семейных и деловых поездок' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INSURANCE_PLANS.map((plan) => {
              const isPremium = plan.type === 'premium';
              const calculatedPrice = Math.round(plan.price * durationMultipliers[duration]);

              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-6 md:p-8 rounded-3xl bg-surface border transition-all ${
                    isPremium 
                      ? 'border-brand shadow-elev-2 ring-2 ring-brand/30' 
                      : 'border-line shadow-xs hover:border-brand/40'
                  }`}
                >
                  {isPremium && (
                    <span className="absolute -top-3 start-6 px-3.5 py-1 rounded-full bg-action text-ink text-xs font-black shadow-xs">
                      {lt(locale, { fa: 'توصیه فیروزو برای شنگن', en: 'Firuzo Pick for Schengen', ar: 'خيار موصى به', zh: '申根签证首选', ru: 'Выбор для Шенгена' })}
                    </span>
                  )}

                  <div className="flex flex-col gap-5">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 text-start">
                        <h3 className="font-black text-xl text-ink">{plan.name}</h3>
                        <span className="text-xs font-black text-brand-dark bg-mint px-2 py-0.5 rounded-md self-start">
                          {locale === 'fa' ? `سقف پوشش €${plan.coverageEur.toLocaleString('fa-IR')}` : `Coverage up to €${plan.coverageEur.toLocaleString('en-US')}`}
                        </span>
                      </div>
                      <div className="w-11 h-11 rounded-xl bg-soft grid place-items-center text-brand-dark">
                        {getIcon(plan.type)}
                      </div>
                    </div>

                    <div className="text-start pt-2 border-t border-line/50">
                      <span className="text-[11px] text-sub block font-bold mb-1">
                        حق بیمه ({duration} روز):
                      </span>
                      <span className="font-black text-2xl text-price font-mono num">
                        {calculatedPrice.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))}
                      </span>
                      <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
                    </div>

                    <div className="border-t border-line pt-4 flex flex-col gap-2.5">
                      {plan.features.slice(0, expandedPlanId === plan.id ? undefined : 3).map((feat, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-start ${feat.included ? '' : 'opacity-40'}`}>
                          {feat.included ? (
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle size={15} className="text-sub shrink-0" />
                          )}
                          <span className={`text-xs font-bold ${feat.included ? 'text-ink' : 'text-sub line-through'}`}>
                            {feat.text}
                          </span>
                        </div>
                      ))}

                      {plan.features.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                          className="text-[11px] font-black text-brand-dark hover:underline flex items-center gap-1 self-start pt-1"
                        >
                          <span>{expandedPlanId === plan.id ? 'بستن جزییات تعهدات' : `مشاهده تمام پوشش‌ها (+${plan.features.length - 3} مورد دیگر)`}</span>
                          <ChevronDown size={12} className={`transition-transform ${expandedPlanId === plan.id ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => select(plan)}
                    aria-label={`انتخاب طرح ${plan.name}`}
                    className={`mt-6 w-full py-3.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isPremium 
                        ? 'bg-action hover:bg-action-hover text-ink shadow-md shadow-action/20' 
                        : 'bg-brand hover:bg-brand-dark text-surface'
                    }`}
                  >
                    {t('buyPlan')}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
