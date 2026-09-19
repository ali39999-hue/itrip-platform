'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Crown, CheckCircle2, ArrowRight } from 'lucide-react';
import { lt } from '@/lib/lt';

interface CipFlightCrossSellProps {
  airportCode?: string;
  airportName?: string;
  className?: string;
}

export function CipFlightCrossSell({
  airportCode = 'IKA',
  airportName,
  className = '',
}: CipFlightCrossSellProps) {
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);

  return (
    <div
      className={`p-4 md:p-5 rounded-2xl bg-gradient-to-r from-[#034442]/95 via-[#046E6B]/90 to-[#00A9A5]/85 text-white border border-[#F0A62A]/40 shadow-elev-2 relative overflow-hidden ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 end-0 p-6 opacity-10 pointer-events-none">
        <Crown className="w-32 h-32 text-[#F0A62A]" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-[#F9D783] border border-white/20">
            <Crown className="w-3.5 h-3.5 text-[#F0A62A]" />
            <span>{lt(locale, { fa: 'ارتقا به سفر VIP', en: 'Upgrade to VIP Travel', ar: 'ترقية إلى سفر VIP', zh: '升级至VIP贵宾体验', ru: 'Улучшить до VIP' })}</span>
          </div>

          <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <span>
              {lt(locale, {
                fa: `افزودن تشریفات اختصاصی CIP فرودگاه ${airportName || 'امام خمینی'}`,
                en: `Add Executive CIP Service for ${airportName || 'Tehran IKA'} Airport`,
                ar: `إضافة خدمات تشريفات CIP لمطار ${airportName || 'الإمام الخميني'}`,
                zh: `为您的行程添加${airportName || '德黑兰伊玛目'}机场CIP贵宾室`,
                ru: `Добавить CIP обслуживание в аэропорту ${airportName || 'Тегерана'}`,
              })}
            </span>
          </h4>

          <p className="text-xs md:text-sm text-white/85 leading-relaxed">
            {lt(locale, {
              fa: 'عبور بدون صف از گیت‌های اختصاصی گذرنامه، ترانسفر پای پلکان پرواز با لیموزین و بوفه سلف‌سرویس مجلل.',
              en: 'Zero-queue immigration gates, tarmac limousine escort to aircraft steps, and unlimited luxury buffet.',
              ar: 'بوابات جوازات خاصة بدون طوابير، ونقل بالليموزين حتى سلم الطائرة، وبوفيه فاخر.',
              zh: '专属免排队通关通道、机坪贵宾车直接送至舷梯，尊享不限时五星自助。',
              ru: 'Проход без очередей, лимузин прямо к самолету и изысканный шведский стол.',
            })}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-white/90">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{lt(locale, { fa: 'کارت پرواز و بارسپاری توسط مأمور CIP', en: 'Baggage check-in by CIP agent', ar: 'تسليم الأمتعة عبر موظف CIP', zh: '专人办理登机牌与行李', ru: 'Оформление багажа агентом' })}</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{lt(locale, { fa: 'کنسلی بدون جریمه تا ۵ ساعت قبل', en: '100% refund >5h before flight', ar: 'إلغاء مجاني قبل ٥ ساعات', zh: '起飞前5小时免费取消', ru: 'Бесплатная отмена за 5ч' })}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/cip?airport=${encodeURIComponent(airportCode)}`}
            className="px-5 py-2.5 rounded-xl bg-[#F0A62A] hover:bg-[#DC9018] text-[#3D2504] font-bold text-xs md:text-sm transition-all shadow-md active:scale-95 flex items-center gap-1.5 min-h-[44px] touch-target"
          >
            <span>{lt(locale, { fa: 'رزرو آنلاین تشریفات CIP', en: 'Book CIP Now', ar: 'احجز تشريفات CIP الآن', zh: '立即预订CIP', ru: 'Заказать CIP' })}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
