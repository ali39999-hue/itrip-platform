'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { daysFromNow } from '@/lib/utils';
import { createAutoBuyRuleAction } from '@/actions/autobuy';
import { getAllTours } from '@/services/tours-service';
import {
  X,
  Bot,
  Compass,
  Plane,
  Building2,
  Calendar,
  Wallet,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface CreateAutoBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefill?: {
    serviceType?: 'TOURS' | 'FLIGHTS' | 'HOTELS';
    targetId?: string;
    title?: string;
    destination?: string;
    origin?: string;
    targetDate?: string;
    maxPrice?: number;
  };
}

export function CreateAutoBuyModal({
  isOpen,
  onClose,
  onSuccess,
  prefill,
}: CreateAutoBuyModalProps) {
  const locale = useLocale();
  const allTours = getAllTours();

  const [serviceType, setServiceType] = useState<'TOURS' | 'FLIGHTS' | 'HOTELS'>(
    prefill?.serviceType || 'TOURS'
  );
  const [targetId, setTargetId] = useState(prefill?.targetId || 't1');
  const [origin, setOrigin] = useState(prefill?.origin || 'تهران');
  const [destination, setDestination] = useState(prefill?.destination || 'اصفهان');
  const [targetDate, setTargetDate] = useState(prefill?.targetDate || daysFromNow(7));
  const [maxPrice, setMaxPrice] = useState(prefill?.maxPrice || 85000000);
  const [passengerCount, setPassengerCount] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [executionMode, setExecutionMode] = useState<
    'ON_CONDITIONS_MET' | 'ON_PRICE_DROP' | 'ON_SCHEDULED_TIME' | 'ON_INVENTORY_AVAILABLE'
  >('ON_CONDITIONS_MET');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let ruleTitle = '';
      if (serviceType === 'TOURS') {
        const tour = allTours.find((t) => t.id === targetId);
        ruleTitle = `خرید خودکار: ${tour?.title || 'تور مسافرتی'} (${targetDate})`;
      } else if (serviceType === 'FLIGHTS') {
        ruleTitle = `خرید خودکار پرواز: ${origin} به ${destination} (${targetDate})`;
      } else {
        ruleTitle = `رزرو خودکار هتل: ${destination} (${targetDate})`;
      }

      const res = await createAutoBuyRuleAction({
        title: ruleTitle,
        serviceType,
        targetId: serviceType === 'TOURS' ? targetId : undefined,
        origin: serviceType === 'FLIGHTS' ? origin : undefined,
        destination: serviceType === 'FLIGHTS' ? destination : undefined,
        targetDate,
        maxPrice,
        passengerCount,
        passengers: [
          {
            firstName: firstName || 'مسافر',
            lastName: lastName || 'اصلی',
            nationalId: nationalId || undefined,
          },
        ],
        executionMode,
      });

      if (!res.success) {
        setError(res.error || 'خطا در ثبت سفارش');
      } else {
        setSuccessMsg('ربات خرید خودکار با موفقیت فعال شد!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطای غیرمنتظره در ثبت سفارش');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[250] bg-ink/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-surface rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border-t sm:border border-line shadow-2xl space-y-5 my-0 sm:my-8 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-200">
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto -mt-2 mb-2" />
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark grid place-items-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-ink">
                {lt(locale, { fa: 'ثبت سفارش خرید خودکار (ربات هوشمند)', en: 'Set Up Auto-Buy Rule', ar: 'إعداد الشراء التلقائي', zh: '创建自动订票规则', ru: 'Настройка автопокупки' })}
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-sub">
                {lt(locale, { fa: 'پایش مستمر نرخ و ظرفیت و صدور آنی بلیط به محض تحقق شروط', en: 'Continuous price tracking & instant booking when conditions match', ar: 'مراقبة فورية للأسعار والحجز التلقائي فور تحقق الشروط', zh: '实时监控低价余位，条件满足自动出票', ru: 'Отслеживание цен и автоматическая покупка' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full text-sub hover:text-ink grid place-items-center cursor-pointer transition active:scale-95"
            aria-label="Close"
          >
            <div className="w-8 h-8 rounded-full bg-soft grid place-items-center">
              <X size={18} />
            </div>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-mint/50 border border-brand/30 text-brand-dark text-xs font-black flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Type Selector */}
          <div>
            <label className="text-xs font-black text-ink block mb-2">
              {lt(locale, { fa: 'نوع خدمت مورد نظر:', en: 'Service Type:', ar: 'نوع الخدمة:', zh: '服务类别：', ru: 'Тип услуги:' })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setServiceType('TOURS')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  serviceType === 'TOURS'
                    ? 'bg-brand text-surface border-brand shadow-xs'
                    : 'bg-soft border-line text-sub hover:text-ink'
                }`}
              >
                <Compass size={14} />
                <span>{lt(locale, { fa: 'تور مسافرتی', en: 'Tours', ar: 'جولات', zh: '旅游', ru: 'Туры' })}</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('FLIGHTS')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  serviceType === 'FLIGHTS'
                    ? 'bg-brand text-surface border-brand shadow-xs'
                    : 'bg-soft border-line text-sub hover:text-ink'
                }`}
              >
                <Plane size={14} />
                <span>{lt(locale, { fa: 'بلیط پرواز', en: 'Flights', ar: 'طيران', zh: '机票', ru: 'Авиабилеты' })}</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('HOTELS')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  serviceType === 'HOTELS'
                    ? 'bg-brand text-surface border-brand shadow-xs'
                    : 'bg-soft border-line text-sub hover:text-ink'
                }`}
              >
                <Building2 size={14} />
                <span>{lt(locale, { fa: 'رزرو هتل', en: 'Hotels', ar: 'فنادق', zh: '酒店', ru: 'Отели' })}</span>
              </button>
            </div>
          </div>

          {/* Dynamic details based on service */}
          {serviceType === 'TOURS' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-ink block">
                {lt(locale, { fa: 'انتخاب تور مورد نظر:', en: 'Select Tour:', ar: 'اختر الجولة:', zh: '选择旅游线路：', ru: 'Выберите тур:' })}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink focus-visible:ring-2 focus-visible:ring-brand"
              >
                {allTours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.city}) — شروع از {num(t.price, locale)} تومان
                  </option>
                ))}
              </select>
            </div>
          ) : serviceType === 'FLIGHTS' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-ink block">مبدأ پرواز:</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-ink block">مقصد پرواز:</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="مثال: استانبول یا مشهد"
                  className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-ink block">شهر یا هتل مورد نظر:</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="مثال: مشهد، کیش یا هتل درویشی"
                className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
                required
              />
            </div>
          )}

          {/* Target Date & Max Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-ink flex items-center gap-1">
                <Calendar size={13} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'تاریخ مدنظر سفر:', en: 'Target Travel Date:', ar: 'تاريخ الرحلة:', zh: '目标出行日期：', ru: 'Дата поездки:' })}</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-ink flex items-center gap-1">
                <Wallet size={13} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'سقف بودجه (حداکثر تومان):', en: 'Max Budget (Toman):', ar: 'سقف الميزانية:', zh: '最高预算（图曼）：', ru: 'Макс. бюджет (томанов):' })}</span>
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                min={1000000}
                step={500000}
                className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-black text-price font-mono"
                required
              />
              <span className="text-[10.5px] font-bold text-sub block">
                {num(maxPrice, locale)} تومان
              </span>
            </div>
          </div>

          {/* Passenger Information */}
          <div className="p-3.5 rounded-2xl bg-soft border border-line/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-ink flex items-center gap-1.5">
                <Users size={14} className="text-brand-dark" />
                <span>مشخصات مسافر اصلی:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sub">تعداد مسافر:</span>
                <select
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(Number(e.target.value))}
                  className="bg-surface border border-line rounded-lg px-2 py-1 text-xs font-bold text-ink"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {num(n, locale)} نفر
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="نام (فارسی)"
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold text-ink"
                required
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="نام خانوادگی"
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold text-ink"
                required
              />
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="کد ملی / گذرنامه"
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold text-ink font-mono"
                required
              />
            </div>
          </div>

          {/* Trigger Condition */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-ink block">
              شرط اجرای خودکار:
            </label>
            <select
              value={executionMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExecutionMode(e.target.value as typeof executionMode)}
              className="w-full h-11 px-3.5 rounded-xl bg-soft border border-line text-xs font-bold text-ink"
            >
              <option value="ON_CONDITIONS_MET">به محض وجود ظرفیت و قیمت زیر سقف بودجه (پیش‌فرض هوشمند)</option>
              <option value="ON_PRICE_DROP">فقط در صورت افت قیمت و تخفیف ویژه</option>
              <option value="ON_INVENTORY_AVAILABLE">به محض باز شدن صندلی‌های جدید خالی</option>
            </select>
          </div>

          {/* Wallet Note & Security Guarantee */}
          <div className="p-3 rounded-xl bg-mint/30 border border-mint flex items-center gap-2 text-xs font-bold text-brand-dark">
            <ShieldCheck size={16} className="shrink-0 text-brand-dark" />
            <span>
              وجه تنها در زمان قطعی شدن خرید از کیف‌پول کسر می‌شود. در صورت کسری موجودی، پیامک اطلاع‌رسانی ارسال می‌گردد.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-soft hover:bg-line/40 text-ink font-bold text-xs transition cursor-pointer flex items-center justify-center active:scale-95"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-action/25 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>در حال فعال‌سازی...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>فعال‌سازی ربات خرید خودکار</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
