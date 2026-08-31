'use client';

import { MapPin, Bus, Wifi, ArrowDownUp, Coffee, Camera, Star } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export function RoutePlannerPreview() {
  const locale = useLocale();

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
          <small className="text-[12px] opacity-80 mb-1">
            {lt(locale, { fa: 'وضعیت کارت: فعال · استانبول', en: 'Status: Active · Istanbul', ar: 'الحالة: نشط · إسطنبول', zh: '状态: 活跃 · 伊斯坦布尔', ru: 'Статус: Активен · Стамбул' })}
          </small>
          <span className="font-en text-[20px] font-bold">Unlimited · Day 2 / 3</span>
        </div>

        {/* Info Boxes */}
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="flex items-center gap-2 m-0 mb-2 text-[14px] text-sub font-bold">
            <MapPin size={16} /> 
            {lt(locale, { fa: 'نزدیک‌ترین ایستگاه', en: 'Nearest Station', ar: 'أقرب محطة', zh: '最近的车站', ru: 'Ближайшая станция' })}
          </h4>
          <div className="text-[18px] font-bold text-brand-dark">
            {lt(locale, { fa: 'میدان تقسیم', en: 'Taksim Square', ar: 'ميدان تقسيم', zh: '塔克西姆广场', ru: 'Площадь Таксим' })}
          </div>
          <div className="text-[12px] text-sub mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[10px] font-bold text-ink">
              <i className="w-2 h-2 rounded-[2px] bg-sky-500 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" /> Line 3
            </span>
            {lt(locale, { fa: '۲۰۰ متر پیاده‌روی تا ایستگاه', en: '200m walking distance', ar: '200 متر سيراً على الأقدام', zh: '步行 200 米', ru: '200 метров пешком' })}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="flex items-center gap-2 m-0 mb-2 text-[14px] text-sub font-bold">
            <Bus size={16} /> 
            {lt(locale, { fa: 'ایستگاه BRT جایگزین', en: 'Alternative BRT Station', ar: 'محطة حافلات بديلة', zh: '备用 BRT 站', ru: 'Альтернативная станция BRT' })}
          </h4>
          <div className="text-[18px] font-bold text-brand-dark">
            {lt(locale, { fa: 'کاباتاش', en: 'Kabatas', ar: 'كاباتاش', zh: '卡巴塔斯', ru: 'Кабаташ' })}
          </div>
          <div className="text-[12px] text-sub mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface border border-line rounded-md font-en text-[10px] font-bold text-ink">
              <i className="w-2 h-2 rounded-[2px] bg-slate-500 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" /> BRT 7
            </span>
            {lt(locale, { fa: '۵۰۰ متر پیاده‌روی', en: '500m walking distance', ar: '500 متر سيراً على الأقدام', zh: '步行 500 米', ru: '500 метров пешком' })}
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
              <input type="text" className="flex-1 bg-transparent border-0 outline-none text-[14px] text-ink" value={lt(locale, { fa: 'موقعیت فعلی من', en: 'My Current Location', ar: 'موقعي الحالي', zh: '我的当前位置', ru: 'Мое текущее местоположение' })} readOnly />
            </div>
            <div className="flex items-center gap-3 bg-soft p-2 rounded-full border border-line focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] transition-all">
              <span className="w-3 h-3 rounded-full bg-action ms-3 flex-shrink-0" />
              <input type="text" className="flex-1 bg-transparent border-0 outline-none text-[14px] text-ink" defaultValue={lt(locale, { fa: 'بازار بزرگ', en: 'Grand Bazaar', ar: 'البازار الكبير', zh: '大巴扎', ru: 'Гранд-базар' })} />
            </div>
          </div>
          <button 
            aria-label={lt(locale, { fa: 'جابجایی مسیر', en: 'Reverse Route', ar: 'عكس المسار', zh: '反转路线', ru: 'Изменить маршрут' })} 
            className="w-10 h-10 rounded-full border border-line bg-surface text-brand grid place-items-center flex-shrink-0 hover:bg-mint hover:border-brand transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-[16px] font-bold mb-4">
              {lt(locale, { fa: 'راهنمای قدم‌به‌قدم', en: 'Step-by-Step Guide', ar: 'دليل خطوة بخطوة', zh: '逐步指南', ru: 'Пошаговое руководство' })}
            </h3>
            <div className="relative ps-5 before:content-[''] before:absolute before:top-2 before:bottom-6 before:-end-[7px] before:w-[2px] before:bg-line">
              {[
                { time: '10:15', title: lt(locale, { fa: 'پیاده‌روی تا ایستگاه', en: 'Walk to Station', ar: 'امشِ إلى المحطة', zh: '步行前往车站', ru: 'Идите на станцию' }), desc: lt(locale, { fa: '۲۰۰ متر به سمت شمال. ورودی مترو سمت چپ شماست.', en: '200m north. Metro entrance on your left.', ar: '200 متر شمالاً. المدخل على يسارك.', zh: '向北200米。地铁入口在您左边。', ru: '200 м на север. Вход в метро слева.' }) },
                { time: '10:20', title: lt(locale, { fa: 'سوار مترو شوید', en: 'Take the Metro', ar: 'استقل المترو', zh: '乘坐地铁', ru: 'Садитесь в метро' }), line: { name: 'Line 3', color: '#00AEEF' }, desc: lt(locale, { fa: 'به سمت شیشلی بروید — ۳ ایستگاه.', en: 'Go towards Sisli — 3 stops.', ar: 'اذهب باتجاه شيشلي — 3 محطات.', zh: '朝希什利方向 — 3 站。', ru: 'Двигайтесь в сторону Шишли — 3 остановки.' }) },
                { time: '10:35', title: lt(locale, { fa: 'پیاده‌روی تا مقصد', en: 'Walk to Destination', ar: 'امشِ إلى الوجهة', zh: '步行前往目的地', ru: 'Идите до пункта назначения' }), desc: lt(locale, { fa: '۵۰ متر پیاده‌روی تا بازار بزرگ.', en: '50m walk to Grand Bazaar.', ar: '50 متراً مشياً إلى البازار الكبير.', zh: '步行50米即可到达大巴扎。', ru: '50 м пешком до Гранд-базара.' }) },
              ].map((step, idx) => (
                <div key={idx} className="relative mb-6 last:mb-0">
                  <span className="absolute -end-[11px] top-1.5 w-2 h-2 rounded-full border-2 border-surface bg-sub shadow-sm" />
                  <div className="text-[12px] font-en font-bold text-sub mb-1">{step.time}</div>
                  <div className="font-bold text-[14px] text-ink flex items-center gap-2 mb-1">
                    {step.title}
                    {step.line && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-line rounded-md font-en text-[10px] font-bold bg-surface text-ink">
                        <i className="w-2 h-2 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" style={{ backgroundColor: step.line.color }} />
                        {step.line.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-sub leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold mb-4">
              {lt(locale, { fa: 'در طول مسیر...', en: 'Along the way...', ar: 'على طول الطريق...', zh: '沿途...', ru: 'По пути...' })}
            </h3>
            <div className="flex flex-col gap-3">
              {[
                { icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50', title: lt(locale, { fa: 'کافه حافظ مصطفی ۱۸۶۴', en: 'Hafiz Mustafa 1864', ar: 'مقهى حافظ مصطفى', zh: '哈菲兹穆斯塔法1864', ru: 'Кафе Хафиз Мустафа 1864' }), desc: lt(locale, { fa: 'نزدیک ایستگاه دوم، بهترین باقلوا و قهوه ترک.', en: 'Near the second stop, best Baklava.', ar: 'بالقرب من المحطة الثانية، أفضل بقلاوة.', zh: '在第二站附近，最好的果仁蜜饼。', ru: 'Рядом со второй станцией, лучшая пахлава.' }) },
                { icon: Camera, color: 'text-rose-600', bg: 'bg-rose-50', title: lt(locale, { fa: 'برج گالاتا', en: 'Galata Tower', ar: 'برج غلطة', zh: '加拉达石塔', ru: 'Галатская башня' }), desc: lt(locale, { fa: 'فرصت عکاسی عالی از استانبول.', en: 'Great photo spot.', ar: 'فرصة رائعة لالتقاط الصور.', zh: '很棒的拍照地点。', ru: 'Отличное место для фото.' }) },
                { icon: Star, color: 'text-brand-dark', bg: 'bg-mint', title: lt(locale, { fa: 'پیشنهاد فیروزو', en: 'Firuzo Pick', ar: 'اختيار فيروزو', zh: 'Firuzo 推荐', ru: 'Выбор Firuzo' }), desc: lt(locale, { fa: 'کارت شما شامل ۱۵٪ تخفیف برای موزه مادام توسو است.', en: 'Pass includes 15% off Madame Tussauds.', ar: 'يشمل خصم 15% على متحف مدام توسو.', zh: '通票包含杜莎夫人蜡像馆15%的折扣。', ru: 'Скидка 15% в музей Мадам Тюссо по карте.' }) },
              ].map((poi, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-line bg-surface hover:bg-soft transition-colors group cursor-default">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${poi.bg} ${poi.color}`}>
                    <poi.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px] text-ink mb-0.5 group-hover:text-brand-dark transition-colors">{poi.title}</h4>
                    <p className="text-[11.5px] text-sub leading-relaxed">{poi.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}