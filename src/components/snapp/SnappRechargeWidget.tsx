'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { Phone, RefreshCw, Check, CreditCard, Clock } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';

import { useBookingStore } from '@/stores/booking-store';

const RATE = 650000;
const FEE_PERCENT = 0.05;
const MIN = 2000000;
const MAX = 50000000;

export function SnappRechargeWidget({ locale, initialAmount }: { locale: string; initialAmount?: number }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [amountIrr, setAmountIrr] = useState(() => initialAmount || 10000000);
  const [lockTime, setLockTime] = useState(60);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLockTime((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const eur = amountIrr / RATE;
  const fee = eur * FEE_PERCENT;
  const total = eur + fee;

  const isPhoneValid = phone.length === 11 && /^09\d{9}$/.test(phone);
  const isAmountValid = amountIrr >= MIN && amountIrr <= MAX;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (isPhoneValid && isAmountValid) {
      useBookingStore.getState().addDirectBooking({
        type: 'snapp',
        title: `${lt(locale, { fa: 'شارژ کیف پول اسنپ', en: 'Snapp Wallet Top-up', ar: 'شحن محفظة اسناب', zh: 'Snapp 钱包充值', ru: 'Пополнение кошелька Snapp' })} (${phone})`,
        subtitle: `${lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })} ${amountIrr.toLocaleString()} IRR • €${total.toFixed(2)}`,
        amount: amountIrr,
        currency: 'IRR',
        status: 'confirmed',
        travelDate: new Date().toISOString().slice(0, 10),
        passengers: [{
          firstNameFa: 'کاربر',
          lastNameFa: 'اسنپ',
          firstNameEn: 'Snapp',
          lastNameEn: 'User',
          passportNo: phone,
          birthDate: '1990-01-01',
          gender: 'male',
        }],
        addOns: [lt(locale, { fa: 'شارژ آنی در کمتر از ۵ دقیقه', en: 'Instant top-up under 5 mins', ar: 'شحن فوري في أقل من 5 دقائق', zh: '5分钟内即时到账', ru: 'Мгновенное пополнение до 5 мин' })],
        paymentMethod: 'wallet_irr',
      });
      router.push('/payment-status');
    }
  };

  return (
    <form 
      id="snapp-form"
      className="bg-surface border border-line rounded-[24px] shadow-elev-3 mt-8 overflow-hidden max-w-[920px]"
      onSubmit={handleSubmit}
    >
      <div className="px-5 py-4 border-b border-line bg-soft flex items-center gap-3">
        <RefreshCw size={22} className="text-brand" aria-hidden="true" />
        <h2 className="m-0 text-[18px] font-bold">
          {lt(locale, {
            fa: 'محاسبه و درخواست شارژ',
            en: 'Calculate & Request Top-up',
            ar: 'احتساب وطلب الشحن',
            zh: '计算与申请充值',
            ru: 'Расчет и запрос пополнения'
          })}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr]">
        <div className="p-6 flex flex-col gap-5 border-b md:border-b-0 md:border-s md:border-line">
          {/* Phone Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold">
              {lt(locale, {
                fa: 'شماره موبایل اسنپ (ایران)',
                en: 'Snapp Mobile Number (Iran)',
                ar: 'رقم هاتف اسناب (إيران)',
                zh: 'Snapp 手机号（伊朗）',
                ru: 'Номер телефона Snapp (Иран)'
              })}
            </label>
            <div className={`flex items-center gap-2 px-4 py-3 bg-soft border ${attempted && !isPhoneValid ? 'border-rose-warm shadow-[0_0_0_3px_rgba(216,68,47,0.1)]' : 'border-line'} rounded-xl focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] focus-within:bg-surface transition-all`}>
              <Phone size={20} className="text-sub flex-shrink-0" aria-hidden="true" />
              <input
                type="tel"
                dir="ltr"
                className="flex-1 min-w-0 border-0 bg-transparent outline-none font-en text-[16px] text-ink placeholder:text-sub"
                placeholder="0912 345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
            </div>
            {attempted && !isPhoneValid && (
              <span className="text-[13px] text-rose-warm font-bold">
                {lt(locale, {
                  fa: 'شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
                  en: 'Number must start with 09 and contain 11 digits.',
                  ar: 'يجب أن يبدأ الرقم بـ 09 ويتكون من 11 رقماً.',
                  zh: '手机号必须以 09 开头且为 11 位数字。',
                  ru: 'Номер должен начинаться с 09 и содержать 11 цифр.'
                })}
              </span>
            )}
          </div>

          {/* Amount Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold">
              {lt(locale, {
                fa: 'مبلغ شارژ (ریال)',
                en: 'Top-up Amount (IRR)',
                ar: 'مبلغ الشحن (ريال)',
                zh: '充值金额 (IRR)',
                ru: 'Сумма пополнения (IRR)'
              })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5000000, 10000000, 20000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountIrr(val)}
                  className={`py-3 px-2 rounded-xl border font-en text-[14px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    amountIrr === val 
                      ? 'bg-mint border-brand text-brand-dark' 
                      : 'bg-soft border-line text-sub hover:border-brand/40'
                  }`}
                >
                  {num(val, locale)}
                </button>
              ))}
            </div>
            
            <div className={`mt-2 flex items-center gap-2 px-4 py-3 bg-soft border ${!isAmountValid ? 'border-rose-warm shadow-[0_0_0_3px_rgba(216,68,47,0.1)]' : 'border-line'} rounded-xl focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(0,169,165,0.1)] focus-within:bg-surface transition-all`}>
              <span className="font-en text-[16px] text-sub flex-shrink-0">IRR</span>
              <input
                type="text"
                dir="ltr"
                className="flex-1 min-w-0 border-0 bg-transparent outline-none font-en text-[16px] text-ink"
                value={amountIrr ? amountIrr.toLocaleString('en-US') : ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                  setAmountIrr(val);
                }}
              />
            </div>
            {!isAmountValid && amountIrr > 0 && (
              <span className="text-[13px] text-rose-warm font-bold">
                {lt(locale, {
                  fa: 'مبلغ باید بین ۲ و ۵۰ میلیون ریال باشد.',
                  en: 'Amount must be between 2M and 50M IRR.',
                  ar: 'يجب أن يكون المبلغ بين 2 و 50 مليون ريال.',
                  zh: '充值金额须在 200 万至 5000 万里亚尔之间。',
                  ru: 'Сумма должна быть от 2 до 50 млн риалов.'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Receipt Side */}
        <div className="p-6 bg-surface flex flex-col">
          <div className="flex justify-between items-center py-2 text-[14px]">
            <span>{lt(locale, { fa: 'مبلغ درخواستی', en: 'Requested Amount', ar: 'المبلغ المطلوب', zh: '申请金额', ru: 'Запрошенная сумма' })}</span>
            <span className="font-en font-bold">{num(amountIrr, locale)} IRR</span>
          </div>

          <div className="flex justify-between items-center py-3 mt-2 border-t border-dashed border-line text-[13px] text-brand-dark font-bold">
            <span className="flex items-center gap-1.5">
              <Check size={14} aria-hidden="true" />
              {lt(locale, { fa: 'نرخ تبدیل شفاف فیروز', en: 'Transparent Firuzo FX Rate', ar: 'سعر تحويل فيروز الشفاف', zh: 'Firuzo 透明汇率', ru: 'Прозрачный курс конвертации Firuzo' })}
            </span>
            <span className="font-en">1 EUR = {num(RATE, locale)} IRR</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-price bg-gold-soft border border-gold/30 px-2 py-0.5 rounded-full mt-2 self-start">
            <Clock size={12} aria-hidden="true" />
            {lt(locale, {
              fa: `نرخ تا ${num(lockTime, locale)} ثانیه قفل است`,
              en: `Rate locked for ${num(lockTime, locale)}s`,
              ar: `السعر مقفل لمدة ${num(lockTime, locale)} ثانية`,
              zh: `汇率锁定倒计时 ${num(lockTime, locale)} 秒`,
              ru: `Курс зафиксирован на ${num(lockTime, locale)} сек.`
            })}
          </span>

          <div className="flex justify-between items-center py-2 mt-3 text-[14px] text-sub">
            <span>{lt(locale, { fa: 'معادل ارزی', en: 'Currency Equivalent', ar: 'المعادل بالعملة الأجنبية', zh: '等值外币', ru: 'Эквивалент в валюте' })}</span>
            <span className="font-en">€ {num(eur, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-[14px] text-sub">
            <span>{lt(locale, { fa: 'کارمزد خدمات (۵٪)', en: 'Service Fee (5%)', ar: 'رسوم الخدمة (5%)', zh: '服务手续费 (5%)', ru: 'Комиссия сервиса (5%)' })}</span>
            <span className="font-en">€ {num(fee, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex justify-between items-center py-4 mt-4 border-t-2 border-line">
            <span className="text-[18px] font-bold">{lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Total Payable', ar: 'المبلغ المستحق', zh: '应付总额', ru: 'Итого к оплате' })}</span>
            <span className="font-en text-[24px] font-bold text-price">€ {num(total, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button 
            type="submit" 
            className="mt-auto w-full py-4 rounded-full bg-action hover:bg-action-hover text-ink text-[18px] font-black shadow-elev-1 transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <CreditCard size={20} aria-hidden="true" />
            {lt(locale, {
              fa: 'پرداخت امن با Visa / Master',
              en: 'Secure Payment with Visa / Master',
              ar: 'دفع آمن عبر Visa / Master',
              zh: '通过 Visa / Master 安全支付',
              ru: 'Безопасная оплата через Visa / Master'
            })}
          </button>
          <p className="text-center text-[11px] text-sub mt-3 leading-[1.7]">
            {lt(locale, {
              fa: 'پرداخت از طریق درگاه بین‌المللی Stripe انجام می‌شود.',
              en: 'Payment is securely processed via Stripe International Gateway.',
              ar: 'تتم معالجة الدفع بأمان عبر بوابة Stripe الدولية.',
              zh: '支付将通过国际 Stripe 安全网关处理。',
              ru: 'Оплата безопасно обрабатывается через международный шлюз Stripe.'
            })}
          </p>
        </div>
      </div>
    </form>
  );
}
