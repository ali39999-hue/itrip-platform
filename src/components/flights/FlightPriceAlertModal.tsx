'use client';

import React, { useState } from 'react';
import { X, Bell, BellRing, CheckCircle2, ShieldCheck } from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';

interface FlightPriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  originCity: string;
  destCity: string;
  currentLowestPrice: number;
  locale: string;
}

export function FlightPriceAlertModal({
  isOpen,
  onClose,
  originCity,
  destCity,
  currentLowestPrice,
  locale,
}: FlightPriceAlertModalProps) {
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      // Auto close after success acknowledgment
      setTimeout(onClose, 2400);
    }, 400);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-alert-title"
      className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-line shadow-elev-3 overflow-hidden flex flex-col max-h-[90vh] pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-200">
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto mt-2.5 mb-1" />
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-mint/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-action text-ink grid place-items-center shadow-xs">
              <BellRing size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="price-alert-title" className="text-sm sm:text-base font-black text-ink">
                {lt(locale, {
                  fa: 'اطلاع از کاهش قیمت پرواز',
                  en: 'Flight Price Drop Alert',
                  ar: 'تنبيه انخفاض أسعار الطيران',
                  zh: '航班降价提醒',
                  ru: 'Уведомление о снижении цены',
                })}
              </h3>
              <span className="text-[11px] text-sub font-bold block">
                {originCity} ← {destCity}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            className="min-w-[44px] min-h-[44px] rounded-full text-sub hover:text-ink grid place-items-center transition"
          >
            <div className="w-8 h-8 rounded-full bg-soft grid place-items-center">
              <X size={18} />
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mx-auto shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-base font-black text-ink">
                {lt(locale, {
                  fa: 'هشدار کاهش قیمت با موفقیت فعال شد!',
                  en: 'Price alert activated successfully!',
                  ar: 'تم تفعيل التنبيه بنجاح!',
                  zh: '降价提醒已成功开启！',
                  ru: 'Уведомление успешно включено!',
                })}
              </h4>
              <p className="text-xs font-bold text-sub max-w-xs mx-auto leading-relaxed">
                {lt(locale, {
                  fa: 'به محض ارزان‌تر شدن این پرواز یا ارائه ظرفیت‌های لحظه آخری، پیامک و ایمیل اطلاع‌رسانی برای شما ارسال خواهد شد.',
                  en: 'We will notify you by SMS or email as soon as rates drop or last-minute seats open up.',
                  ar: 'سنرسل لك إشعاراً فور انخفاض السعر أو توفر مقاعد اللحظة الأخيرة.',
                  zh: '一旦票价下降或出现特惠尾票，我们将第一时间通知您。',
                  ru: 'Мы сообщим по SMS или email, как только цена снизится.',
                })}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-soft/70 border border-line flex items-center justify-between text-xs">
                <span className="text-sub font-bold">
                  {lt(locale, { fa: 'کمترین نرخ فعلی پرواز:', en: 'Current Lowest Fare:', ar: 'أقل سعر حالي:', zh: '当前最低价：', ru: 'Текущая минимальная цена:' })}
                </span>
                <span className="font-mono font-black text-brand-dark text-sm">
                  {num(currentLowestPrice, locale)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томан' })}
                </span>
              </div>

              <div>
                <label htmlFor="alert-contact-input" className="block text-xs font-bold text-sub mb-1.5">
                  {lt(locale, {
                    fa: 'شماره موبایل یا ایمیل خود را وارد کنید:',
                    en: 'Enter your Mobile Number or Email:',
                    ar: 'أدخل رقم الهاتف أو البريد الإلكتروني:',
                    zh: '请输入您的手机号或邮箱：',
                    ru: 'Введите номер телефона или email:',
                  })}
                </label>
                <div className="flex items-center gap-2 p-3 bg-soft rounded-2xl border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
                  <Bell size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
                  <input
                    id="alert-contact-input"
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="0912... or user@example.com"
                    className="w-full bg-transparent border-0 outline-none text-xs font-bold text-ink placeholder:text-sub font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-sub font-medium">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                <span>
                  {lt(locale, {
                    fa: 'بدون پیامک‌های تبلیغاتی مزاحم؛ فقط اطلاع‌رسانی کاهش نرخ.',
                    en: 'No marketing spam; price drop alerts only.',
                    ar: 'بدون رسائل ترويجية مزعجة، تنبيهات السعر فقط.',
                    zh: '绝无垃圾营销推广，仅发送票价降价通知。',
                    ru: 'Без спама — только оповещение о снижении цены.',
                  })}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                >
                  <BellRing size={16} aria-hidden="true" />
                  <span>
                    {lt(locale, {
                      fa: 'فعال‌سازی رصد هوشمند قیمت',
                      en: 'Activate Smart Price Alert',
                      ar: 'تفعيل تنبيه الأسعار الذكي',
                      zh: '开启智能降价监控',
                      ru: 'Включить слежение за ценой',
                    })}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
