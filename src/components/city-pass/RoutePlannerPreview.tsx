'use client';

import { useState } from 'react';
import { MapPin, Bus, Wifi, ArrowDownUp, Coffee, Camera, Star, CheckCircle2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export function RoutePlannerPreview() {
  const locale = useLocale();
  const [origin, setOrigin] = useState(lt(locale, { fa: 'میدان تجریش (شمال تهران)', en: 'Tajrish Square (North Tehran)', ar: 'ميدان تجريش', zh: '塔吉里什广场', ru: 'Площадь Таджриш' }));
  const [dest, setDest] = useState(lt(locale, { fa: 'بازار بزرگ تاریخی (ایستگاه ۱۵ خرداد)', en: 'Grand Bazaar (15 Khordad Metro)', ar: 'البازار الكبير', zh: '德黑兰大巴扎', ru: 'Гранд-базар (15 Хордад)' }));

  const handleSwap = () => {
    const tmp = origin;
    setOrigin(dest);
    setDest(tmp);
  };

  return (
    <div className="bg-surface rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_1fr] shadow-elev-3 border border-line">
      {/* Sidebar (Virtual Card & Info) */}
      <div className="bg-soft border-b lg:border-b-0 lg:border-s border-line p-6 text-ink flex flex-col gap-4">
        {/* Virtual Card with Arch styling */}
        <div className="bg-gradient-to-br from-brand via-[#046e6b] to-deep rounded-[32px] p-6 text-surface shadow-elev-2 flex flex-col justify-between min-h-[190px] relative overflow-hidden group">
          <div className="absolute -end-8 -top-8 w-32 h-32 rounded-full border-[14px] border-mint-bright/15 pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div>
              <b className="font-en font-black tracking-wider text-base block">FIRUZO PASS</b>
              <span className="text-[10px] text-mint-bright font-bold">NFC SMART TRANSIT</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface/20 backdrop-blur-md grid place-items-center">
              <Wifi size={18} className="text-mint-bright rotate-90" />
            </div>
          </div>
          
          <div className="relative z-10 pt-4">
            <div className="text-[11px] text-mint-bright font-bold mb-0.5">
              {lt(locale, { fa: 'وضعیت کارت: فعال · شبکه ریلی و BRT', en: 'Status: Active · Metro & BRT', ar: 'الحالة: نشط · المترو و BRT', zh: '状态: 激活 · 地铁与快速公交', ru: 'Статус: Активен · Метро и BRT' })}
            </div>
            <span className="font-en text-[18px] font-black tracking-wide">Unlimited Tourist Pass</span>
          </div>
        </div>

        {/* Info Boxes */}
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-xs">
          <h4 className="flex items-center gap-2 m-0 mb-1.5 text-xs text-sub font-black">
            <MapPin size={14} className="text-brand-dark" /> 
            {lt(locale, { fa: 'نزدیک‌ترین ایستگاه مترو', en: 'Nearest Metro Station', ar: 'أقرب محطة مترو', zh: '最近的地铁站', ru: 'Ближайшая станция метро' })}
          </h4>
          <div className="text-sm font-black text-brand-dark">
            {lt(locale, { fa: 'ایستگاه تجریش (خط ۱ قرمز)', en: 'Tajrish Station (Line 1 Red)', ar: 'محطة تجريش (الخط 1)', zh: '塔吉里什站（1号红线）', ru: 'Станция Таджриш (Линия 1)' })}
          </div>
          <div className="text-xs text-sub mt-1.5 flex items-center gap-1.5 flex-wrap font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-soft border border-line rounded-md font-mono text-[10px] font-black text-rose-600">
              <i className="w-2 h-2 rounded-full bg-rose-600" /> Line 1
            </span>
            <span>{lt(locale, { fa: '۱۵۰ متر پیاده‌روی تا گیت ورودی', en: '150m walking to turnstile', ar: '150 متر سيراً على الأقدام', zh: '步行150米至进站闸机', ru: '150 м до турникетов' })}</span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 shadow-xs">
          <h4 className="flex items-center gap-2 m-0 mb-1.5 text-xs text-sub font-black">
            <Bus size={14} className="text-brand-dark" /> 
            {lt(locale, { fa: 'مسیر سریع اتوبوس تندرو (BRT)', en: 'Alternative BRT Route', ar: 'محطة BRT البديلة', zh: '备用 BRT 快速公交', ru: 'Альтернативный BRT' })}
          </h4>
          <div className="text-sm font-black text-brand-dark">
            {lt(locale, { fa: 'خط ۷ BRT (تجریش - راه‌آهن)', en: 'BRT Line 7 (Tajrish - Rail)', ar: 'خط 7 BRT', zh: '7号快速公交线（南北贯通）', ru: 'Линия BRT 7' })}
          </div>
          <div className="text-xs text-sub mt-1.5 flex items-center gap-1.5 flex-wrap font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-soft border border-line rounded-md font-mono text-[10px] font-black text-emerald-700">
              <i className="w-2 h-2 rounded-full bg-emerald-600" /> BRT 7
            </span>
            <span>{lt(locale, { fa: 'بدون ترافیک در خط ویژه ولیعصر', en: 'Dedicated bus lane', ar: 'مسار مخصص سريع', zh: '专有公交车道直达', ru: 'Выделенная полоса' })}</span>
          </div>
        </div>
      </div>

      {/* Main Content (Route Planner) */}
      <div className="p-6 md:p-8 bg-surface text-ink flex flex-col gap-6">
        {/* Route Inputs with Swap Action */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-soft p-2.5 rounded-2xl border border-line focus-within:border-brand transition-all">
              <span className="w-3 h-3 rounded-full bg-brand ms-2 shrink-0" />
              <input 
                type="text" 
                className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm font-bold text-ink" 
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-3 bg-soft p-2.5 rounded-2xl border border-line focus-within:border-brand transition-all">
              <span className="w-3 h-3 rounded-full bg-action ms-2 shrink-0" />
              <input 
                type="text" 
                className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm font-bold text-ink" 
                value={dest} 
                onChange={(e) => setDest(e.target.value)} 
              />
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSwap}
            aria-label={lt(locale, { fa: 'معکوس‌سازی مسیر', en: 'Reverse Route', ar: 'عكس المسار', zh: '反转路线', ru: 'Изменить маршрут' })} 
            className="w-11 h-11 rounded-2xl border border-line bg-surface text-brand-dark grid place-items-center shrink-0 hover:bg-mint hover:border-brand/50 transition-all active:scale-95 shadow-xs"
            title="جابجایی مبدأ و مقصد"
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-black mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-brand-dark" />
              <span>{lt(locale, { fa: 'راهنمای قدم‌به‌قدم مسیر', en: 'Step-by-Step Guidance', ar: 'دليل خطوة بخطوة', zh: '逐步导航指引', ru: 'Пошаговый маршрут' })}</span>
            </h3>
            
            <div className="relative ps-5 space-y-4 border-s-2 border-line/80 ms-2">
              {[
                { time: '10:15', title: lt(locale, { fa: 'پیاده‌روی تا ایستگاه مترو تجریش', en: 'Walk to Tajrish Metro Station', ar: 'امشِ إلى محطة المترو', zh: '步行前往地铁站', ru: 'Идите на станцию метро' }), desc: lt(locale, { fa: '۱۵۰ متر پیاده‌روی. کارت فیروز پاس را روی گیت بزنید (اعتبار نامحدود).', en: '150m walk. Tap your Firuzo Pass on the turnstile.', ar: '150 متر سيراً. مرر بطاقة فيروزو على البوابة.', zh: '步行150米。在闸机上轻刷您的 Firuzo Pass 通卡。', ru: '150 м пешком. Приложите Firuzo Pass к турникету.' }) },
                { time: '10:20', title: lt(locale, { fa: 'سوار شدن به قطار خط ۱ (به سمت کهریزک)', en: 'Board Line 1 Train (Southbound)', ar: 'اركب قطار الخط 1', zh: '乘坐1号线列车（南行）', ru: 'Поезд Линии 1' }), desc: lt(locale, { fa: 'طی مسافت ۱۱ ایستگاه بدون نیاز به تغییر خط (حدود ۲۴ دقیقه).', en: '11 stops direct transit without transfer (~24 minutes).', ar: '11 محطة مباشرة دون تبديل القطار.', zh: '直达11站，无需换乘（约24分钟）。', ru: '11 станций без пересадок (около 24 мин).' }) },
                { time: '10:45', title: lt(locale, { fa: 'خروج در ایستگاه ۱۵ خرداد (بازار بزرگ)', en: 'Arrive at 15 Khordad Station', ar: 'الوصول إلى محطة 15 خرداد', zh: '到达 15 Khordad 站（大巴扎）', ru: 'Прибытие на станцию 15 Хордад' }), desc: lt(locale, { fa: 'خروجی میدان ارگ و ورودی اصلی بازار تاریخی تهران.', en: 'Exit towards Arg Square and Tehran Historic Grand Bazaar entrance.', ar: 'المخرج باتجاه ساحة أرج والمدخل الرئيسي للبازار.', zh: '从阿格广场出口出站即可抵达德黑兰大巴扎正门。', ru: 'Выход к площади Арг и главному входу на Гранд-базар.' }) },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -start-[27px] top-1 w-3 h-3 rounded-full bg-brand border-2 border-surface shadow-xs" />
                  <span className="text-[11px] font-mono font-black text-brand-dark block">{step.time}</span>
                  <h4 className="text-xs font-black text-ink leading-tight mt-0.5">{step.title}</h4>
                  <p className="text-[11px] text-sub font-medium leading-relaxed mt-1">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights Around Destination */}
          <div className="bg-soft/50 rounded-2xl p-5 border border-line/60 space-y-3">
            <h4 className="text-xs font-black text-ink mb-3 flex items-center gap-2">
              <Star size={14} className="text-action fill-action" />
              <span>{lt(locale, { fa: 'اماکن شاخص در مقصد (دارای تخفیف فیروز پاس)', en: 'Destination Perks with Firuzo Pass', ar: 'معالم بارزة بخصومات فيروزو', zh: '凭卡享优惠的热门景点', ru: 'Места со скидкой по Firuzo Pass' })}</span>
            </h4>

            <div className="p-3 rounded-xl bg-surface border border-line/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                <Camera size={16} />
              </div>
              <div className="text-xs">
                <strong className="font-black text-ink block">کاخ گلستان (میراث جهانی یونسکو)</strong>
                <span className="text-sub font-bold text-[11px]">۲۵۰ متر فاصله از ایستگاه • ۲۰٪ تخفیف بلیط با فیروز پاس</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-line/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                <Coffee size={16} />
              </div>
              <div className="text-xs">
                <strong className="font-black text-ink block">چایخانه و رستوران سنتی مسلم</strong>
                <span className="text-sub font-bold text-[11px]">قلب بازار تهران • پذیرش بدون نوبت و تخفیف ۱۰٪</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
