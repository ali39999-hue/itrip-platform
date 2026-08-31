import { MapPin, Bus, Wifi, ArrowDownUp, Coffee, Camera, Star } from 'lucide-react';

import { useTranslations } from 'next-intl';

export function RoutePlannerPreview() {
  const t = useTranslations('Common');
  return (
    <div className="bg-surface rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr] shadow-[0_24px_48px_rgba(0,0,0,0.2)]">
      {/* Sidebar (Virtual Card & Info) */}
      <div className="bg-soft border-b lg:border-b-0 lg:border-s border-line p-5 text-ink flex flex-col gap-4">
        {/* Virtual Card with Arch styling */}
        <div className="bg-gradient-to-br from-brand to-deep rounded-[50%_50%_16px_16px/28%_28%_16px_16px] p-5 pb-6 text-surface shadow-md flex flex-col justify-end min-h-[172px] relative overflow-hidden">
          <div className="absolute top-5 start-5 end-5 flex justify-between items-center">
            <b className="font-en font-bold tracking-wide">Firuzo Pass</b>
            <Wifi size={22} className="opacity-85" />
          </div>
          <small className="text-[12px] opacity-80 mb-1">وضعیت کارت: فعال · تهران</small>
          <span className="font-en text-[20px] font-bold">Unlimited · Day 2 / 3</span>
        </div>

        {/* Info Boxes */}
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="flex items-center gap-2 m-0 mb-2 text-[14px] text-sub font-bold">
            <MapPin size={16} /> نزدیک‌ترین ایستگاه
          </h4>
          <div className="text-[18px] font-bold text-brand-dark">میدان جهاد</div>
          <div className="text-[12px] text-sub mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[10px] font-bold text-ink">
              <i className="w-2 h-2 rounded-[2px] bg-[#00AEEF] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" /> Line 3
            </span>
            · ۴۰۰ متر پیاده‌روی، حدود ۵ دقیقه
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="flex items-center gap-2 m-0 mb-2 text-[14px] text-sub font-bold">
            <Bus size={16} /> ایستگاه BRT جایگزین
          </h4>
          <div className="text-[18px] font-bold text-brand-dark">مطهری</div>
          <div className="text-[12px] text-sub mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[10px] font-bold text-ink">
              <i className="w-2 h-2 rounded-[2px] bg-[#5C6B6A] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" /> BRT 7
            </span>
            · ۱۵۰ متر پیاده‌روی
          </div>
        </div>
      </div>

      {/* Main Content (Route Planner) */}
      <div className="p-6 bg-surface text-ink flex flex-col gap-6">
        {/* Route Inputs */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 bg-soft p-2 rounded-full border border-line focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] transition-all">
              <span className="w-3 h-3 rounded-full bg-brand ms-3 flex-shrink-0" />
              <input type="text" className="flex-1 bg-transparent border-0 outline-none text-[14px] text-ink" value="موقعیت فعلی من" readOnly />
            </div>
            <div className="flex items-center gap-3 bg-soft p-2 rounded-full border border-line focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] transition-all">
              <span className="w-3 h-3 rounded-full bg-action ms-3 flex-shrink-0" />
              <input type="text" className="flex-1 bg-transparent border-0 outline-none text-[14px] text-ink" defaultValue="بازار تجریش" />
            </div>
          </div>
          <button aria-label={t('Common.aria.reverseRoute')} className="w-10 h-10 rounded-full border border-line bg-surface text-brand grid place-items-center flex-shrink-0 hover:bg-mint hover:border-brand transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-[16px] font-bold mb-4">راهنمای قدم‌به‌قدم</h3>
            <div className="relative ps-5 before:content-[''] before:absolute before:top-2 before:bottom-6 before:-end-[7px] before:w-[2px] before:bg-line">
              {[
                { time: '10:15', title: 'پیاده‌روی تا ایستگاه جهاد', desc: '۴۰۰ متر به سمت شمال. ورودی مترو سمت راست شماست.' },
                { time: '10:20', title: 'سوار مترو شوید', line: { name: 'Line 3', color: '#00AEEF' }, desc: 'به سمت شهید بهشتی — سه ایستگاه.' },
                { time: '10:35', title: 'تعویض خط در بهشتی', line: { name: 'Line 1', color: '#E4002B' }, desc: 'تابلوی خط قرمز به سمت تجریش را دنبال کنید.' },
                { time: '11:00', title: 'رسیدن به تجریش', desc: 'خروجی غربی، مستقیم به ورودی بازار می‌رسد.' }
              ].map((step, idx) => (
                <div key={idx} className="relative mb-5 last:mb-0">
                  {/* Timeline dot */}
                  <div className="absolute top-1.5 -end-[24px] w-3 h-3 rounded-full bg-surface border-2 border-brand z-10" />
                  
                  <div className="font-en text-[12px] font-bold text-sub mb-0.5">{step.time}</div>
                  <div className="text-[14px] font-bold mb-1 flex flex-wrap items-center gap-2">
                    {step.title}
                    {step.line && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[10px] font-bold text-ink">
                        <i className="w-2 h-2 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" style={{ backgroundColor: step.line.color }} />
                        {step.line.name}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-sub leading-[1.55]">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-price flex items-center gap-2 mb-2">
              <Star size={18} /> کشف‌های مسیر
            </h3>
            <p className="text-[13px] text-sub mb-4">در همین مسیر، دو توقف کوتاه ارزشش را دارد:</p>

            <div className="flex gap-3 p-3 border border-line rounded-xl mb-3 hover:border-brand transition-colors">
              <span className="w-10 h-10 rounded-lg bg-gold-soft text-price grid place-items-center flex-shrink-0">
                <Coffee size={20} />
              </span>
              <div>
                <h4 className="m-0 mb-1 text-[13px] font-bold">قهوه‌ای نزدیک ایستگاه بهشتی</h4>
                <p className="m-0 text-[12px] text-sub leading-[1.5]">هنگام تعویض خط، سه دقیقه پیاده تا خروجی شمالی — فرصت خوبی برای یک قهوه.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 border border-line rounded-xl hover:border-brand transition-colors">
              <span className="w-10 h-10 rounded-lg bg-gold-soft text-price grid place-items-center flex-shrink-0">
                <Camera size={20} />
              </span>
              <div>
                <h4 className="m-0 mb-1 text-[13px] font-bold">معماری ایستگاه تجریش</h4>
                <p className="m-0 text-[12px] text-sub leading-[1.5]">یکی از عمیق‌ترین ایستگاه‌های تهران. هنگام خروج به کاشی‌کاری دیواره‌ها نگاه کنید.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
