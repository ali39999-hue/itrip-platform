'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { INSURANCE_PLANS } from '@/lib/data';
import type { InsurancePlan } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { shimmerDataUrl } from '@/lib/image-utils';
import { ShieldCheck, CheckCircle2, XCircle, Plane, Shield, Users } from 'lucide-react';

export default function InsurancePage() {
  const t = useTranslations('Insurance');
  const locale = useLocale();
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  function select(plan: InsurancePlan) {
    setBookingContext({
      type: 'insurance',
      title: `بیمه مسافرتی ${plan.name}`,
      subtitle: `پوشش €${plan.coverageEur.toLocaleString('en-US')} • ${plan.priceLabel}`,
      amount: plan.price,
      travelDate: daysFromNow(10),
    });
    router.push('/checkout');
  }

  function getIcon(type: string) {
    switch(type) {
      case 'standard': return <Plane size={32} />;
      case 'premium': return <Shield size={32} />;
      case 'family': return <Users size={32} />;
      default: return <ShieldCheck size={32} />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-16">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 flex flex-col gap-10">
        
        {/* Hero Section */}
        <section className="relative w-full rounded-2xl overflow-hidden h-[300px] md:h-[400px] flex items-center justify-center bg-surface shadow-sm">
          <Image 
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=75&w=1800"
            alt={t('title')}
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={shimmerDataUrl(1800, 400)}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
          <div className="relative z-10 text-center px-4 max-w-3xl flex flex-col items-center gap-4 mt-12 md:mt-16">
            <h1 className="font-black text-[32px] md:text-[40px] text-surface drop-shadow-md">{t('title')}</h1>
            <p className="font-bold text-[16px] md:text-[18px] text-surface/90 drop-shadow-sm">
              {t('subtitle')}
            </p>
            <div className="flex items-center gap-2 mt-4 bg-surface/10 backdrop-blur-md px-6 py-3 rounded-full border border-surface/20">
              <ShieldCheck className="text-brand shrink-0" size={20} />
              <span className="font-bold text-[14px] text-surface">{locale === 'fa' ? 'پشتیبانی ۲۴/۷ بین‌المللی' : '24/7 International Assistance'}</span>
            </div>
          </div>
        </section>

        {/* Insurance Plans */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2 text-start">
            <h2 className="font-black text-[28px] md:text-[32px] text-ink">{t('plansTitle')}</h2>
            <p className="font-bold text-[14px] md:text-[16px] text-sub">
              {locale === 'fa' ? 'پوشش‌های متنوع برای سفرهای انفرادی، خانوادگی و تجاری' : 'Tailored coverage for individual, family, and business travel'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INSURANCE_PLANS.map((plan) => {
              const isPremium = plan.type === 'premium';
              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-6 md:p-8 rounded-2xl bg-surface border transition-all ${
                    isPremium 
                      ? 'border-brand shadow-lg ring-1 ring-brand' 
                      : 'border-line shadow-sm hover:border-brand/40'
                  }`}
                >
                  {isPremium && (
                    <span className="absolute -top-3.5 start-6 px-3.5 py-1 rounded-full bg-brand text-surface text-xs font-black shadow-sm">
                      {t('specialOffer')}
                    </span>
                  )}

                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 text-start">
                        <h3 className="font-black text-[20px] text-ink">{plan.name}</h3>
                        <span className="text-[13px] font-bold text-sub">
                          {locale === 'fa' ? `سقف پوشش €${plan.coverageEur.toLocaleString('fa-IR')}` : `Coverage up to €${plan.coverageEur.toLocaleString('en-US')}`}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark">
                        {getIcon(plan.type)}
                      </div>
                    </div>

                    <div className="text-start">
                      <span className="font-black text-[28px] text-price font-mono num">
                        {plan.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                      </span>
                      <span className="text-xs font-bold text-sub ms-1">{locale === 'fa' ? 'تومان' : 'Toman'}</span>
                    </div>

                    <div className="border-t border-line pt-6 flex flex-col gap-3.5">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className={`flex items-center gap-2.5 text-start ${feat.included ? '' : 'opacity-50'}`}>
                          {feat.included ? (
                            <CheckCircle2 size={16} className="text-success shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-sub shrink-0" />
                          )}
                          <span className={`text-[13px] font-bold ${feat.included ? 'text-ink' : 'text-sub line-through'}`}>
                            {feat.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => select(plan)}
                    aria-label={`انتخاب طرح ${plan.name}`}
                    className={`mt-8 w-full py-3.5 rounded-xl font-black text-[14px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isPremium 
                        ? 'bg-action hover:bg-action-hover text-[#14201f] shadow-md' 
                        : 'bg-mint hover:bg-mint-bright text-brand-dark'
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
