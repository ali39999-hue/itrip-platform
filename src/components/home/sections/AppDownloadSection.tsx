'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Smartphone, QrCode, Download, Bell, WifiOff } from 'lucide-react';
import { lt } from '@/lib/lt';

export function AppDownloadSection() {
  const locale = useLocale();

  return (
    <section aria-label="Mobile App Download" className="w-full max-w-[1280px] mx-auto px-4 md:px-8">
      {/* گرادیان برند ثابت است؛ رنگ‌های متن/دکمه نیز باید ثابت (روشن) بمانند تا در دارک‌مود ناخوانا نشوند */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#032f2e] via-[#045956] to-[#00a9a5] p-6 sm:p-10 md:p-12 text-white shadow-elev-2 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Background decorative circles */}
        <div className="absolute end-0 -top-20 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute start-0 -bottom-20 w-64 h-64 rounded-full bg-mint-bright/10 blur-xl pointer-events-none" />

        {/* Left column: Text and badges */}
        <div className="relative z-10 max-w-xl text-center lg:text-start space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-black border border-white/25">
            <Smartphone size={14} aria-hidden="true" />
            <span>{lt(locale, { fa: 'اپلیکیشن اختصاصی موبایل فیروزو', en: 'Firuzo Mobile Application', ar: 'تطبيق فيروزو للهاتف', zh: 'Firuzo 官方移动客户端', ru: 'Мобильное приложение Firuzo' })}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
            {lt(locale, {
              fa: 'سفر در دستان شما؛ با اپلیکیشن فیروزو هوشمندانه‌تر سفر کنید',
              en: 'Travel in Your Pocket; Travel Smarter with Firuzo App',
              ar: 'سفرك بين يديك؛ سافر بذكاء مع تطبيق فيروزو',
              zh: '旅行尽在掌中；使用 Firuzo App 畅享智慧出行',
              ru: 'Путешествия в вашем кармане с приложением Firuzo',
            })}
          </h2>

          <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed">
            {lt(locale, {
              fa: 'دسترسی بدون اینترنت به واچرها و بلیت‌ها، هشدارهای آنی گیت و تاخیر پرواز، تخفیف‌های اختصاصی اعضای اپلیکیشن و شارژ فوری کیف پول مسافرتی.',
              en: 'Offline access to vouchers, real-time flight gate alerts, exclusive app discounts, and instant wallet top-ups.',
              ar: 'وصول دون اتصال للقسائم، تنبيهات الرحلات الفورية، خصومات حصرية للمستخدمين.',
              zh: '无网络离线查看行程单与凭证、航班登机口实时提醒、App专属特惠与即刻充值。',
              ru: 'Офлайн доступ к ваучерам, уведомления о рейсах и эксклюзивные скидки в приложении.',
            })}
          </p>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold text-white/90">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center text-white shrink-0">
                <WifiOff size={11} aria-hidden="true" />
              </span>
              <span>{lt(locale, { fa: 'مشاهده آفلاین بلیت و واچر', en: 'Offline ticket & voucher access', ar: 'عرض التذاكر دون إنترنت', zh: '离线查看电子票', ru: 'Офлайн билеты' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center text-white shrink-0">
                <Bell size={11} aria-hidden="true" />
              </span>
              <span>{lt(locale, { fa: 'اعلان تاخیر و شماره گیت', en: 'Live flight delay & gate alert', ar: 'تنبيهات البوابة والتأخير', zh: '登机口与延误提醒', ru: 'Оповещения о вылете' })}</span>
            </div>
          </div>

          {/* Download buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
            <a
              href="https://cafebazaar.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-5 rounded-2xl bg-white text-[#032f2e] hover:bg-white/90 transition-all shadow-md font-black text-xs inline-flex items-center gap-2 active:scale-95"
            >
              <Download size={16} className="text-[#045956]" aria-hidden="true" />
              <div className="text-start leading-tight">
                <span className="text-[10px] text-[#032f2e]/70 block">{lt(locale, { fa: 'دریافت از', en: 'Download from', ar: 'تحميل من', zh: '下载平台', ru: 'Скачать из' })}</span>
                <span className="font-bold">{lt(locale, { fa: 'کافه‌بازار', en: 'Cafe Bazaar', ar: 'بازار', zh: 'Bazaar', ru: 'Bazaar' })}</span>
              </div>
            </a>

            <a
              href="https://myket.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-5 rounded-2xl bg-white text-[#032f2e] hover:bg-white/90 transition-all shadow-md font-black text-xs inline-flex items-center gap-2 active:scale-95"
            >
              <Download size={16} className="text-[#045956]" aria-hidden="true" />
              <div className="text-start leading-tight">
                <span className="text-[10px] text-[#032f2e]/70 block">{lt(locale, { fa: 'دریافت از', en: 'Download from', ar: 'تحميل من', zh: '下载平台', ru: 'Скачать из' })}</span>
                <span className="font-bold">{lt(locale, { fa: 'مایکت', en: 'Myket', ar: 'مايكت', zh: 'Myket', ru: 'Myket' })}</span>
              </div>
            </a>

            <Link
              href="/"
              className="h-12 px-5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/35 transition-all font-black text-xs inline-flex items-center gap-2 active:scale-95"
            >
              <Smartphone size={16} aria-hidden="true" />
              <span>{lt(locale, { fa: 'نسخه وب‌آیفون (PWA)', en: 'iOS Web App (PWA)', ar: 'نسخة ويب آيفون', zh: 'iOS 网页应用 (PWA)', ru: 'iOS Web App (PWA)' })}</span>
            </Link>
          </div>
        </div>

        {/* Right column: QR Code and Phone Mockup Card */}
        <div className="relative z-10 shrink-0 bg-white/95 rounded-3xl p-6 text-[#14201f] shadow-elev-3 border border-white/40 flex flex-col items-center text-center max-w-[260px] w-full">
          <div className="w-40 h-40 rounded-2xl bg-[#f4f8f8] border border-black/5 p-3 grid place-items-center mb-3">
            <QrCode size={130} className="text-[#045956]" aria-hidden="true" />
          </div>
          <span className="text-xs font-black text-[#14201f] block mb-1">
            {lt(locale, { fa: 'اسکن مستقیم با دوربین گوشی', en: 'Scan with Camera', ar: 'امسح بالكاميرا', zh: '手机扫码极速下载', ru: 'Сканируйте камерой' })}
          </span>
          <span className="text-[11px] font-bold text-[#14201f]/60 block">
            {lt(locale, { fa: 'دانلود آنی اپلیکیشن فیروزو', en: 'Instant App Download', ar: 'تحميل مباشر', zh: '支持 Android 与 iOS', ru: 'Для Android и iOS' })}
          </span>
        </div>
      </div>
    </section>
  );
}
