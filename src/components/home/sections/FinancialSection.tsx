'use client';

import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { Link } from '@/i18n/routing';
import { Wallet, ArrowLeft, ShieldCheck, Zap, Ticket } from 'lucide-react';

export function FinancialSection() {
  const locale = useLocale();

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/50">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand-dark text-xs font-bold">
            <Wallet size={16} />
            <span>{lt(locale, { fa: 'کیف پول چندارزی فیروز', en: 'Firuzo Multi-Currency Wallet', ar: 'محفظة فيروزو متعددة العملات', zh: 'Firuzo 多币种钱包', ru: 'Мультивалютный кошелек Firuzo' })}</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-ink leading-tight">
            {lt(locale, { fa: 'پرداخت بدون دغدغه با ریال، تتر و کارت‌های بین‌المللی', en: 'Hassle-free payment with IRR, USDT & Intl Cards', ar: 'دفع بدون متاعب بالريال وتيثر والبطاقات الدولية', zh: '使用里亚尔、USDT和国际信用卡轻松支付', ru: 'Удобная оплата в IRR, USDT и международными картами' })}
          </h2>
          <p className="text-sm md:text-base text-sub leading-relaxed max-w-xl">
            {lt(locale, { fa: 'با شارژ کیف پول خود به ریال یا تتر، تمامی خدمات سفر اعم از هتل، پرواز، اسنپ محلی و سیم‌کارت را بدون نیاز به کارت‌های ارزی و در لحظه خریداری کنید.', en: 'By topping up your wallet in IRR or USDT, buy all travel services including hotels, flights, local rides, and eSIMs instantly without needing foreign cards.', ar: 'من خلال شحن محفظتك بالريال أو تيثر، يمكنك شراء جميع خدمات السفر.', zh: '通过使用里亚尔或USDT充值钱包，即时购买所有旅行服务。', ru: 'Пополнив свой кошелек в IRR или USDT, мгновенно оплачивайте все туристические услуги.' })}
          </p>
          
          <ul className="grid sm:grid-cols-2 gap-4 mt-6">
            <li className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="w-6 h-6 rounded-full bg-mint text-brand-dark grid place-items-center"><Zap size={12} aria-hidden="true" /></span>
              {lt(locale, { fa: 'فعال‌سازی آنی', en: 'Instant Activation', ar: 'تفعيل فوري', zh: '即时激活', ru: 'Мгновенная активация' })}
            </li>
            <li className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="w-6 h-6 rounded-full bg-tour/10 text-tour grid place-items-center"><Ticket size={12} aria-hidden="true" /></span>
              {lt(locale, { fa: 'گشت‌های اختصاصی', en: 'Exclusive Tours', ar: 'جولات خاصة', zh: '独家旅游', ru: 'Эксклюзивные туры' })}
            </li>
            <li className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="w-6 h-6 rounded-full bg-action/10 text-action grid place-items-center"><ShieldCheck size={12} aria-hidden="true" /></span>
              {lt(locale, { fa: 'تضمین کمترین قیمت', en: 'Best Price Guarantee', ar: 'ضمان أقل سعر', zh: '最低价格保证', ru: 'Гарантия лучшей цены' })}
            </li>
            <li className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="w-6 h-6 rounded-full bg-flight/10 text-flight grid place-items-center"><ShieldCheck size={12} aria-hidden="true" /></span>
              {lt(locale, { fa: 'پروازهای چارتری و سیستمی', en: 'Charter & Scheduled Flights', ar: 'رحلات طيران عارضة ومنتظمة', zh: '包机和定期航班', ru: 'Чартерные и регулярные рейсы' })}
            </li>
          </ul>

          <div className="pt-4">
            <Link 
              href="/wallet" 
              className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-brand hover:bg-brand-dark transition-colors text-surface rounded-xl shadow-elev-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span className="font-bold text-[15px]">{lt(locale, { fa: 'مشاهده و مدیریت کیف پول', en: 'View & Manage Wallet', ar: 'عرض وإدارة المحفظة', zh: '查看和管理钱包', ru: 'Просмотр и управление кошельком' })}</span>
              <ArrowLeft size={18} className="ltr:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-3xl p-6 md:p-8 shadow-elev-2 space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'موجودی تجمیعی', en: 'Total Balance', ar: 'إجمالي الرصيد', zh: '总余额', ru: 'Общий баланс' })}</span>
            <span className="text-sm font-black text-ink font-mono">{lt(locale, { fa: '۱۵۰,۰۰۰,۰۰۰ تومان', en: '150,000,000 IRR', ar: '150,000,000 تومان', zh: '150,000,000 IRR', ru: '150,000,000 IRR' })}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-soft border border-line/60">
              <span className="text-[11px] text-sub block mb-1">{lt(locale, { fa: 'کیف پول تومانی (IRR)', en: 'IRR Wallet', ar: 'محفظة تومان (IRR)', zh: 'IRR 钱包', ru: 'IRR Кошелек' })}</span>
              <span className="text-base font-black text-brand-dark font-mono">{lt(locale, { fa: '۱۵۰,۰۰۰,۰۰۰ ت', en: '150M IRR', ar: '150 مليون تومان', zh: '1.5亿 IRR', ru: '150М IRR' })}</span>
            </div>
            <div className="p-4 rounded-2xl bg-soft border border-line/60">
              <span className="text-[11px] text-sub block mb-1">{lt(locale, { fa: 'کیف پول تتر (USDT)', en: 'USDT Wallet', ar: 'محفظة تيثر (USDT)', zh: 'USDT 钱包', ru: 'USDT Кошелек' })}</span>
              <span className="text-base font-black text-price font-mono">{lt(locale, { fa: '۲۵۰.۰۰ USDT', en: '250.00 USDT', ar: '250.00 USDT', zh: '250.00 USDT', ru: '250.00 USDT' })}</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}