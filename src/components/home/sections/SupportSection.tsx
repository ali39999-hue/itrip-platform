'use client';

import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { Headset, PhoneCall, AlertCircle } from 'lucide-react';

export function SupportSection() {
  const locale = useLocale();

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10">
      <div className="max-w-[1280px] mx-auto bg-surface border border-line rounded-3xl p-6 md:p-10 shadow-elev-2 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl text-center lg:text-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold">
            <AlertCircle size={14} />
            <span>{lt(locale, { fa: 'پشتیبانی اضطراری و راهنمای لحظه‌ای', en: 'Emergency Support & Live Guide', ar: 'دعم الطوارئ ودليل مباشر', zh: '紧急支持与实时指南', ru: 'Экстренная поддержка и живой гид' })}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-ink tracking-tight">
            {lt(locale, { fa: 'در تمام طول سفر کنار شما هستیم (۲۴ ساعته)', en: 'We are with you throughout the trip (24/7)', ar: 'نحن معك طوال الرحلة (على مدار الساعة)', zh: '整个旅程我们都在您身边 (全天候)', ru: 'Мы с вами на протяжении всей поездки (24/7)' })}
          </h2>
          <p className="text-xs sm:text-sm text-sub leading-relaxed">
            تیم پشتیبانی اختصاصی فیروز به ۵ زبان زنده دنیا (فارسی، انگلیسی، عربی، چینی و روسی) در تمام مراحل رزرو، فرودگاه و اقامت پاسخگوی شماست.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <Link
            href="/support"
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-brand text-surface text-xs sm:text-sm font-bold hover:bg-brand-dark transition flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Headset size={18} />
            <span>{lt(locale, { fa: 'گفتگوی آنلاین با پشتیبان', en: 'Live Chat', ar: 'الدردشة المباشرة', zh: '在线客服', ru: 'Онлайн чат' })}</span>
          </Link>
          <a
            href="tel:+982191000000"
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-soft border border-line text-ink text-xs sm:text-sm font-bold hover:bg-line/40 transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PhoneCall size={18} className="text-brand" />
            <span className="font-mono">{lt(locale, { fa: '۰۲۱-۹۱۰۰۰۰۰۰', en: '021-91000000', ar: '021-91000000', zh: '021-91000000', ru: '021-91000000' })}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
