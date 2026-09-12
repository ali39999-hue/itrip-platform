'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import {
  getAdminPaymentModeAction,
  setAdminPaymentModeAction,
} from '@/actions/admin-payment-mode';
import { FlaskConical, ShieldCheck, Loader2 } from 'lucide-react';
import type { PaymentGatewayMode } from '@/domains/payments/admin-payment-mode';

export function AdminPaymentModeToggle() {
  const locale = useLocale();
  const [mode, setMode] = useState<PaymentGatewayMode>('demo');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminPaymentModeAction()
      .then((res) => {
        if (!active) return;
        setIsAdmin(res.isAdmin);
        setMode(res.mode);
        setInitialLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setInitialLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin && initialLoaded) return null;

  const isDemo = mode === 'demo';

  async function handleToggle() {
    if (loading) return;
    const nextMode: PaymentGatewayMode = isDemo ? 'real' : 'demo';
    setLoading(true);
    try {
      const res = await setAdminPaymentModeAction(nextMode, { systemWide: true });
      if (res.success && res.mode) {
        setMode(res.mode);
      }
    } catch (err) {
      console.error('[AdminPaymentModeToggle] Failed to toggle:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-busy={loading}
      aria-label={lt(locale, {
        fa: `تغییر حالت پرداخت (فعلی: ${isDemo ? 'دمو' : 'واقعی'})`,
        en: `Toggle Payment Mode (Current: ${isDemo ? 'Demo' : 'Real'})`,
        ar: `تبديل وضع الدفع (الحالي: ${isDemo ? 'تجريبي' : 'حقيقي'})`,
        zh: `切换支付模式（当前：${isDemo ? '测试' : '正式'}）`,
        ru: `Переключить режим оплаты (текущий: ${isDemo ? 'Демо' : 'Реальный'})`,
      })}
      title={lt(locale, {
        fa: isDemo
          ? 'حالت پرداخت فعلی: دمو (شبیه‌ساز). برای تغییر به درگاه واقعی کلیک کنید.'
          : 'حالت پرداخت فعلی: درگاه واقعی eCardo. برای تغییر به دمو کلیک کنید.',
        en: isDemo
          ? 'Current Mode: Demo Sandbox. Click to switch to Real Gateway.'
          : 'Current Mode: Real eCardo Gateway. Click to switch to Demo.',
        ar: isDemo
          ? 'الوضع الحالي: تجريبي (محاكاة). انقر للتبديل إلى البوابة الحقيقية.'
          : 'الوضع الحالي: بوابة حقيقية. انقر للتبديل إلى التجريبي.',
        zh: isDemo
          ? '当前支付模式：测试沙箱。点击切换到正式网关。'
          : '当前支付模式：正式网关。点击切换到测试沙箱。',
        ru: isDemo
          ? 'Текущий режим: Демо-симуляция. Нажмите для переключения на боевой шлюз.'
          : 'Текущий режим: Боевой шлюз. Нажмите для переключения на демо.',
      })}
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-black transition-all border shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isDemo
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
      } ${loading ? 'opacity-70 cursor-wait' : 'cursor-pointer active:scale-[0.97]'}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin shrink-0" />
      ) : isDemo ? (
        <FlaskConical size={13} className="text-amber-600 shrink-0" />
      ) : (
        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
      )}
      <span className="hidden sm:inline text-sub font-semibold">
        {lt(locale, {
          fa: 'پرداخت:',
          en: 'Pay:',
          ar: 'الدفع:',
          zh: '支付:',
          ru: 'Оплата:',
        })}
      </span>
      <span>
        {isDemo
          ? lt(locale, {
              fa: 'دمو (شبیه‌ساز)',
              en: 'Demo Mode',
              ar: 'تجريبي',
              zh: '测试模式',
              ru: 'Демо',
            })
          : lt(locale, {
              fa: 'درگاه واقعی',
              en: 'Real Gateway',
              ar: 'بوابة حقيقية',
              zh: '正式网关',
              ru: 'Боевой',
            })}
      </span>
    </button>
  );
}
