'use client';

import { useRouter } from '@/i18n/routing';
import { ESIM_PACKAGES } from '@/lib/data';
import { useBookingStore } from '@/stores/booking-store';
import { daysFromNow } from '@/lib/utils';
import { Search, ShoppingCart, QrCode, Wifi, Signal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function EsimPage() {
  const router = useRouter();
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  function buy(pkg: (typeof ESIM_PACKAGES)[number]) {
    setBookingContext({
      type: 'esim',
      title: `eSIM ${pkg.country}`,
      subtitle: `${pkg.dataGb} گیگابایت • ${pkg.validityDays} روزه`,
      amount: pkg.price,
      travelDate: daysFromNow(3),
    });
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden mb-12 img-overlay-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxzsqO1cPZOvMB6J_srUHSiC1iHQ4yIr07IbrWfr5WK8Ohowjxx8ad4125g_Ispe1G2WXHSZZKgPLnwE7-MoCovqU9oaoEDkd7Sra_fMhOm8RT_LVrC857NDdDgmEWxlx_Hf97JceQ2qnVaNxhJu5Hak3QJiLhcozWAyqwIqQpMV6apqx-42I4eEdtNUE7ItoCydMxo2OD-3Xuvvicl5jnYMVtA7f-4VX19QEuLIBgg2MGycIxtWc22jSlugsCMvTRrw"
          alt="eSIM Hero"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-soft via-brand-dark/50 to-transparent mix-blend-multiply" />
        
        <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center text-center pt-8">
          <h1 className="text-[32px] md:text-[40px] font-black text-surface mb-4 tracking-tight drop-shadow-md">اینترنت جهانی با eSIM</h1>
          <p className="text-[16px] md:text-[18px] font-bold text-surface/90 mb-10 drop-shadow">
            بدون نیاز به سیم‌کارت فیزیکی، در بیش از ۱۵۰ کشور به اینترنت پرسرعت متصل بمانید. فعال‌سازی آنی و بسته‌های متنوع.
          </p>
          
          <div className="relative w-full shadow-sm rounded-full overflow-hidden">
            <Search size={20} className="absolute end-5 top-1/2 -translate-y-1/2 text-sub pointer-events-none z-10" />
            <Input 
              className="w-full pe-14 ps-5 py-4 h-14 rounded-full border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand font-bold text-[15px] bg-surface text-ink shadow-sm" 
              placeholder="جستجوی کشور یا منطقه..." 
              type="text" 
            />
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10 pb-24">
        {/* Packages Section */}
        <section className="mb-20">
          <h2 className="font-black text-[24px] text-ink mb-6">محبوب‌ترین بسته‌ها</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ESIM_PACKAGES.map((pkg, i) => (
              <div key={pkg.id} className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow border border-line p-6 relative overflow-hidden group card-lift">
                <div className={`absolute top-0 end-0 w-32 h-32 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform ${i % 2 === 0 ? 'bg-brand/5' : 'bg-gold/10'}`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-[18px] text-ink mb-1.5">{pkg.country}</h3>
                    <span className="font-bold text-[11px] text-sub bg-soft px-2.5 py-1 rounded-full border border-line inline-block">
                      {pkg.country.includes('اروپا') ? '۳۳ کشور' : 'پوشش سراسری'}
                    </span>
                  </div>
                  <Signal size={36} className={i % 2 === 0 ? 'text-brand' : 'text-gold'} />
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center border-b border-line pb-3">
                    <span className="font-bold text-[13px] text-sub">حجم اینترنت</span>
                    <span className="font-black text-[14px] text-ink">{pkg.dataGb.toLocaleString('fa-IR')} گیگابایت</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-line pb-3">
                    <span className="font-bold text-[13px] text-sub">مدت اعتبار</span>
                    <span className="font-black text-[14px] text-ink">{pkg.validityDays.toLocaleString('fa-IR')} روز</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-auto">
                  <div className="font-black text-[20px] text-price num">
                    {pkg.price.toLocaleString('fa-IR')} <span className="text-[12px] text-sub font-bold">تومان</span>
                  </div>
                  
                  {/* دکمه اکشن زعفرانی طبق قوانین Firuzo */}
                  <button onClick={() => buy(pkg)} aria-label={`خرید بسته ${pkg.country}`} className="bg-brand text-surface font-black text-[13px] px-6 py-2 h-10 rounded-full hover:bg-brand-2 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                    خرید
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step-by-step Guide */}
        <section className="bg-surface rounded-xl p-8 md:p-12 mb-12 border border-line shadow-sm">
          <div className="text-center mb-12">
            <h2 className="font-black text-[24px] text-ink mb-2">راهنمای فعال‌سازی سریع</h2>
            <p className="font-bold text-[15px] text-sub">در سه مرحله ساده به اینترنت متصل شوید</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-4 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-12 end-[16%] start-[16%] h-[2px] bg-line -z-10" />
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-brand mb-6 z-10 relative group-hover:scale-105 transition-transform">
                <ShoppingCart size={36} className="text-brand" />
                <div className="absolute -bottom-2 -end-2 w-8 h-8 bg-brand text-surface rounded-full flex items-center justify-center font-black text-[14px] num">۱</div>
              </div>
              <h3 className="font-black text-[16px] text-ink mb-2">خرید بسته</h3>
              <p className="font-bold text-[13px] text-sub max-w-[250px] leading-relaxed">مقصد و بسته مورد نظر خود را انتخاب کرده و پرداخت را انجام دهید.</p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-brand mb-6 z-10 relative group-hover:scale-105 transition-transform">
                <QrCode size={36} className="text-brand" />
                <div className="absolute -bottom-2 -end-2 w-8 h-8 bg-brand text-surface rounded-full flex items-center justify-center font-black text-[14px] num">۲</div>
              </div>
              <h3 className="font-black text-[16px] text-ink mb-2">اسکن QR Code</h3>
              <p className="font-bold text-[13px] text-sub max-w-[250px] leading-relaxed">کد QR دریافتی در ایمیل را با دوربین گوشی خود اسکن کنید.</p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-brand mb-6 z-10 relative group-hover:scale-105 transition-transform">
                <Wifi size={36} className="text-brand" />
                <div className="absolute -bottom-2 -end-2 w-8 h-8 bg-brand text-surface rounded-full flex items-center justify-center font-black text-[14px] num">۳</div>
              </div>
              <h3 className="font-black text-[16px] text-ink mb-2">اتصال به اینترنت</h3>
              <p className="font-bold text-[13px] text-sub max-w-[250px] leading-relaxed">Data Roaming را روشن کرده و از اینترنت پرسرعت لذت ببرید.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
