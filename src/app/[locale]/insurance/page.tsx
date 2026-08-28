'use client';

import { useRouter } from '@/i18n/routing';
import { INSURANCE_PLANS } from '@/lib/data';
import type { InsurancePlan } from '@/lib/types';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { ShieldCheck, CheckCircle2, XCircle, Plane, Shield, Users } from 'lucide-react';

export default function InsurancePage() {
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
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCvdrdiG6XLt64F1GcxDfOC0AAXSUvg3cvCB9ImFR-iVycBHmmfMA7WbZb4yhKl_x-DmQDdZThQq6tnAmHTtpGr__ASzrQgC07wiP7k-33GnNQSAa1wsu15lUuTStGN6Uiw2hmFREznn5kwnY8-uFxT9eEC_my-iCMGpjk6N73D_w9tic0Pg8uCpGH7eXzdoFHCTD-R0u6RL5Br10GDnXPQEx8cz9gn0zklxlajEqBMMvDaF1SLvP2XXZ7s1EiszHEMEA')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"></div>
          <div className="relative z-10 text-center px-4 max-w-3xl flex flex-col items-center gap-4 mt-12 md:mt-16">
            <h1 className="font-black text-[32px] md:text-[40px] text-surface drop-shadow-md">سفری با آرامش خیال</h1>
            <p className="font-bold text-[16px] md:text-[18px] text-surface/90 drop-shadow-sm">
              با پوشش کامل بیمه مسافرتی فیروز، فقط به لذت بردن از مقصد فکر کنید. ما در تمام مسیر همراه شما هستیم.
            </p>
            <div className="flex items-center gap-2 mt-4 bg-surface/10 backdrop-blur-md px-6 py-3 rounded-full border border-surface/20">
              <ShieldCheck className="text-brand shrink-0" size={20} />
              <span className="font-bold text-[14px] text-surface">پشتیبانی ۲۴/۷ بین‌المللی</span>
            </div>
          </div>
        </section>

        {/* Insurance Plans - Bento Grid Style */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2 text-start">
            <h2 className="font-black text-[28px] md:text-[32px] text-ink">انتخاب طرح مناسب شما</h2>
            <p className="font-bold text-[16px] text-sub">طرح‌های متنوع برای نیازهای مختلف سفر شما</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INSURANCE_PLANS.map((plan) => {
              const isPremium = plan.type === 'premium';
              
              return (
                <div 
                  key={plan.id}
                  className={`rounded-2xl p-6 md:p-8 flex flex-col relative transition-all duration-300 ${
                    isPremium 
                      ? 'bg-brand/10 border-2 border-brand shadow-sm md:-translate-y-4 overflow-hidden' 
                      : 'bg-surface border border-line shadow-sm hover:shadow-md'
                  }`}
                >
                  {isPremium && (
                    <div className="absolute top-5 -end-10 bg-action text-[#14201f] font-black text-[12px] py-1.5 px-10 -rotate-45 shadow-sm">
                      پیشنهاد ویژه
                    </div>
                  )}

                  <div className="flex justify-between items-start z-10 mb-6">
                    <div className="flex flex-col gap-1.5">
                      <h3 className={`font-black text-[24px] ${isPremium ? 'text-brand-dark' : 'text-ink'}`}>
                        {plan.name}
                      </h3>
                      <span className={`font-bold text-[12px] ${isPremium ? 'text-brand-dark/80' : 'text-sub'}`}>
                        {plan.subtitle}
                      </span>
                    </div>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      isPremium ? 'bg-brand/20 text-brand-dark' : 'bg-soft text-brand-dark'
                    }`}>
                      {getIcon(plan.type)}
                    </div>
                  </div>

                  <div className={`py-5 border-b mb-5 z-10 ${isPremium ? 'border-brand/20' : 'border-line/60'}`}>
                    <div className={`font-black text-[30px] text-end num ${isPremium ? 'text-brand-dark' : 'text-brand-dark'}`}>
                      {plan.price.toLocaleString('fa-IR')}
                      <span className={`font-bold text-[12px] me-1 ${isPremium ? 'text-brand-dark/70' : 'text-sub'}`}>
                        تومان / {plan.priceLabel}
                      </span>
                    </div>
                  </div>

                  <ul className={`flex flex-col gap-4 py-2 font-bold text-[14px] flex-grow z-10 ${
                    isPremium ? 'text-brand-dark' : 'text-ink'
                  }`}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-center gap-2.5 ${!feature.included ? 'text-sub/50' : ''}`}>
                        {feature.included ? (
                          <CheckCircle2 className={`shrink-0 ${isPremium ? 'text-brand' : 'text-brand'}`} size={18} />
                        ) : (
                          <XCircle className="shrink-0 text-sub/50" size={18} />
                        )}
                        {feature.text}
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => select(plan)}
                    aria-label={`انتخاب طرح ${plan.name}`}
                    className={`w-full py-3.5 rounded-xl font-black text-[15px] transition-colors mt-8 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                      isPremium 
                        ? 'bg-brand text-surface hover:bg-brand-dark shadow-sm' 
                        : 'bg-soft text-brand-dark hover:bg-line/50'
                    }`}
                  >
                    {isPremium ? 'انتخاب طرح طلایی' : 'انتخاب طرح'}
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
