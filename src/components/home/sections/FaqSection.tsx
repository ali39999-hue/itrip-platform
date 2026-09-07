'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { lt } from '@/lib/lt';

export function FaqSection() {
  const locale = useLocale();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: lt(locale, {
        fa: 'چگونه می‌توانم بلیت پرواز یا واچر هتل خود را به صورت آنلاین کنسل کنم؟',
        en: 'How can I cancel my flight ticket or hotel voucher online?',
        ar: 'كيف يمكنني إلغاء تذكرة الطيران أو حجز الفندق عبر الإنترنت؟',
        zh: '如何在网上取消机票或酒店预订并退款？',
        ru: 'Как онлайн отменить билет на самолет или бронь отеля?',
      }),
      a: lt(locale, {
        fa: 'کافی است وارد بخش «سفرهای من» شوید، سفر مورد نظر خود را انتخاب کرده و روی دکمه «درخواست لغو و استرداد» کلیک کنید. سیستم به صورت خودکار جریمه مصوب ایرلاین یا هتل را محاسبه کرده و مانده وجه در کمتر از چند دقیقه به کیف پول شما بازگردانده می‌شود.',
        en: 'Simply navigate to "My Trips", select your booking, and click "Cancel & Refund". The system automatically applies the official airline/hotel penalty, and the remaining balance is credited to your wallet in minutes.',
        ar: 'انتقل إلى "رحلاتي"، اختر حجزك واضغط على "إلغاء واسترداد". سيتم حساب الرسوم وإعادة المبلغ لمحفظتك فوراً.',
        zh: '进入“我的行程”，选择对应订单并点击“申请退款”。系统将自动扣除航司/酒店手续费，余款将在数分钟内退回您的钱包。',
        ru: 'Перейдите в раздел «Мои поездки», выберите заказ и нажмите «Отмена и возврат». Деньги вернутся на баланс за пару минут.',
      }),
    },
    {
      q: lt(locale, {
        fa: 'تفاوت بلیت سیستمی و چارتری چیست؟',
        en: 'What is the difference between Systemic and Charter tickets?',
        ar: 'ما الفرق بين التذاكر المنتظمة والعارضة؟',
        zh: '正班机票与特惠包机机票有什么区别？',
        ru: 'В чем разница между регулярными и чартерными билетами?',
      }),
      a: lt(locale, {
        fa: 'بلیت‌های سیستمی طبق جدول رسمی سازمان هواپیمایی دارای نرخ ثابت و امکان استرداد با کسر جریمه هستند و نرخ کودک با تخفیف محاسبه می‌شود. بلیت‌های چارتری توسط آژانس‌های چارترکننده با نرخ‌های متغیر ارائه می‌شوند و در اغلب موارد غیرقابل استرداد هستند.',
        en: 'Systemic flights follow fixed airline rules, permit cancellation with standard penalties, and provide child fare discounts. Charter flights are purchased in bulk by consolidators with dynamic pricing and stricter non-refundable terms.',
        ar: 'التذاكر المنتظمة قابلة للاسترداد وفق القوانين مع خصم للأطفال، بينما تذاكر الشارتر تخضع لأسعار متغيرة وغالباً غير مستردة.',
        zh: '正班机票按照民航标准执行退改规则且儿童享有优惠票价；包机机票通常票价浮动较大且退改限制较严。',
        ru: 'Регулярные билеты подлежат возврату по правилам авиакомпании, чартерные рейсы имеют динамическую цену и строгие условия возврата.',
      }),
    },
    {
      q: lt(locale, {
        fa: 'چند ساعت قبل از پرواز باید در فرودگاه حضور داشته باشیم؟',
        en: 'How early should I arrive at the airport before departure?',
        ar: 'كم من الوقت يجب أن أحضر في المطار قبل موعد الرحلة؟',
        zh: '我应该提前几个小时到达机场办理登机？',
        ru: 'За сколько часов нужно прибыть в аэропорт?',
      }),
      a: lt(locale, {
        fa: 'برای پروازهای داخلی، توصیه می‌شود حداقل ۲ ساعت قبل از ساعت پرواز در ترمینال فرودگاه حاضر باشید (کانتر پذیرش ۴۰ دقیقه قبل از پرواز بسته می‌شود). برای پروازهای بین‌المللی و خارجی، حضور حداقل ۳ ساعت قبل از پرواز الزامی است.',
        en: 'For domestic flights, arrive at least 2 hours before departure (check-in counters close 40 minutes prior). For international flights, arriving at least 3 hours before departure is strictly required.',
        ar: 'للرحلات الداخلية ساعتان قبل الموعد، وللرحلات الدولية 3 ساعات على الأقل قبل موعد الإقلاع.',
        zh: '国内航班建议至少提前2小时到达机场（柜台提前40分钟关闭）；国际航班必须至少提前3小时到达。',
        ru: 'Для внутренних рейсов — за 2 часа до вылета, для международных рейсов — не менее чем за 3 часа.',
      }),
    },
    {
      q: lt(locale, {
        fa: 'آیا امکان پرداخت با رمزارز تتر (USDT) یا کارت‌های شتاب وجود دارد؟',
        en: 'Can I pay using USDT Cryptocurrency or Shetab Bank Cards?',
        ar: 'هل يمكن الدفع بواسطة عملة تيثر (USDT) أو بطاقات شتاب؟',
        zh: '平台支持通过 USDT 加密货币或 Shetab 银行卡支付吗？',
        ru: 'Можно ли оплачивать криптовалютой USDT или картами Shetab?',
      }),
      a: lt(locale, {
        fa: 'بله، پلتفرم فیروزه از درگاه شاپرک (تمام کارت‌های عضو شتاب بانکی ایران) و شبکه امن تتر (TRC-20) بدون واسطه پشتیبانی می‌کند. همچنین مسافران خارجی می‌توانند از طریق کارت‌های اعتباری بین‌المللی پرداخت خود را نهایی کنند.',
        en: 'Yes, Firuzo natively supports Shetab debit cards (Shaparak gateway), Tether TRC-20 cryptocurrency, and international payment methods without middlemen.',
        ar: 'نعم، تدعم منصة فيروزو بطاقات شتاب الإيرانية، وعملة USDT عبر شبكة TRC-20، والبطاقات الائتمانية الدولية.',
        zh: '是的，Firuzo 原生支持 Shetab 银行借记卡、TRC-20 网络 USDT 及国际信用卡直连结算。',
        ru: 'Да, Firuzo поддерживает карты Shetab, переводы в USDT TRC-20 и международные кредитные карты.',
      }),
    },
  ];

  return (
    <section aria-label="Frequently Asked Questions" className="w-full max-w-[1000px] mx-auto px-4 md:px-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 text-brand-dark text-xs font-bold mb-2">
          <HelpCircle size={14} aria-hidden="true" />
          <span>{lt(locale, { fa: 'پرسش‌های متداول مسافران', en: 'Traveler FAQs', ar: 'الأسئلة الشائعة', zh: '常见问题解答', ru: 'Часто задаваемые вопросы' })}</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink">
          {lt(locale, {
            fa: 'پاسخ به سوالات پرتکرار قبل از سفر',
            en: 'Answers to Common Travel Inquiries',
            ar: 'إجابات على الأسئلة الأكثر تكراراً',
            zh: '出行前的常见疑问与解答',
            ru: 'Ответы на популярные вопросы о поездках',
          })}
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-line overflow-hidden transition-all shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-ink hover:text-brand-dark transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-sub shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-dark' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-[13px] font-medium text-sub leading-relaxed border-t border-line/50 bg-soft/30 animate-in fade-in duration-200">
                  <p className="m-0">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
