'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Users, CheckCircle2, AlertCircle, Loader2, Ban, Trash2, X } from 'lucide-react';
import { lt } from '@/lib/lt';
import { validateReferralCodeAction } from '@/actions/booking';

type ReferralStatus = 'IDLE' | 'VALID' | 'UNMATCHED' | 'SELF_REFERRAL' | 'INACTIVE' | 'USAGE_LIMIT_EXCEEDED' | 'ERROR';

interface ReferralInputSectionProps {
  referralCode: string;
  setReferralCode: (code: string) => void;
  onValidationChange?: (isValid: boolean, discountPercent: number) => void;
  disabled?: boolean;
  /**
   * Server-authoritative status sync (e.g. from the booking draft response):
   * corrects the pre-submit label when server validation disagrees
   * (guest pre-check vs authed submit, cap/promo outcomes).
   */
  syncStatus?: Extract<ReferralStatus, 'VALID' | 'UNMATCHED' | 'SELF_REFERRAL' | 'INACTIVE' | 'USAGE_LIMIT_EXCEEDED'> | null;
}

export function ReferralInputSection({
  referralCode,
  setReferralCode,
  onValidationChange,
  disabled = false,
  syncStatus = null,
}: ReferralInputSectionProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ReferralStatus>('IDLE');
  const [leaderName, setLeaderName] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0.05);

  // Display-only sync: the parent owns the authoritative discount amount
  // (server draft response) and sets it directly — this effect only corrects
  // the status label, never the amount, so it can't overwrite server values.
  useEffect(() => {
    if (syncStatus && syncStatus !== status) {
      setStatus(syncStatus);
      if (syncStatus !== 'VALID' && syncStatus !== 'SELF_REFERRAL') {
        setLeaderName('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus]);

  const handleRemoveCode = () => {
    setReferralCode('');
    setStatus('IDLE');
    setLeaderName('');
    setDiscountPercent(0.05);
    onValidationChange?.(false, 0);
  };

  const handleValidate = async () => {
    const trimmed = referralCode.trim().toUpperCase();
    if (!trimmed) {
      setStatus('IDLE');
      onValidationChange?.(false, 0);
      return;
    }

    setLoading(true);
    try {
      const res = await validateReferralCodeAction(trimmed);
      if (res.success) {
        if (res.valid) {
          setStatus('VALID');
          setLeaderName(res.leaderName || '');
          const pct = res.discountPercent !== undefined ? res.discountPercent : 0.05;
          setDiscountPercent(pct);
          onValidationChange?.(true, pct);
        } else if (res.status === 'SELF_REFERRAL') {
          setStatus('SELF_REFERRAL');
          setLeaderName(res.leaderName || '');
          onValidationChange?.(false, 0);
        } else if (res.status === 'INACTIVE') {
          setStatus('INACTIVE');
          setLeaderName(res.leaderName || '');
          onValidationChange?.(false, 0);
        } else if (res.status === 'USAGE_LIMIT_EXCEEDED') {
          setStatus('USAGE_LIMIT_EXCEEDED');
          setLeaderName(res.leaderName || '');
          onValidationChange?.(false, 0);
        } else {
          setStatus('UNMATCHED');
          setLeaderName('');
          onValidationChange?.(false, 0);
        }
      } else {
        setStatus('ERROR');
        onValidationChange?.(false, 0);
      }
    } catch {
      setStatus('ERROR');
      onValidationChange?.(false, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-mint flex items-center justify-center text-brand-dark shrink-0">
            <Users size={16} />
          </span>
          <div>
            <h3 className="text-[14px] font-bold text-ink">
              {lt(locale, {
                fa: 'کد معرف / سرگروه سفر',
                en: 'Referral / Group Leader Code',
                ar: 'رمز الإحالة / قائد المجموعة',
                zh: '推荐码 / 领队代码',
                ru: 'Код реферала / лидера группы',
              })}
            </h3>
            <p className="text-[11px] text-sub">
              {lt(locale, {
                fa: '۵٪ تخفیف روی قیمت پایه با وارد کردن کد سرگروه',
                en: '5% base price discount with valid group leader code',
                ar: 'خصم 5% على السعر الأساسي مع رمز قائد المجموعة',
                zh: '输入有效领队代码可享基础价格 5% 折扣',
                ru: 'Скидка 5% на базовую стоимость по коду лидера группы',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={referralCode}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setReferralCode(val);
              if (status !== 'IDLE') {
                setStatus('IDLE');
                onValidationChange?.(false, 0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidate();
              }
            }}
            placeholder={lt(locale, {
              fa: 'مثلاً KOOH123',
              en: 'e.g. KOOH123',
              ar: 'مثلاً KOOH123',
              zh: '例如 KOOH123',
              ru: 'Например, KOOH123',
            })}
            className="w-full h-11 px-3 pe-8 rounded-xl border border-line bg-paper/50 text-[13px] font-mono font-bold uppercase tracking-wider text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {referralCode && !disabled && (
            <button
              type="button"
              onClick={handleRemoveCode}
              aria-label={lt(locale, { fa: 'پاک کردن کد', en: 'Clear code', ar: 'مسح الرمز', zh: '清除代码', ru: 'Очистить код' })}
              className="absolute end-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-sub hover:text-destructive hover:bg-destructive/10 grid place-items-center transition cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={loading || !referralCode.trim() || disabled}
          onClick={handleValidate}
          className="px-4 min-h-[44px] rounded-xl bg-soft hover:bg-line/70 text-ink text-[13px] font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          <span>
            {lt(locale, {
              fa: 'بررسی کد',
              en: 'Verify',
              ar: 'تحقق',
              zh: '验证',
              ru: 'Проверить',
            })}
          </span>
        </button>

        {referralCode && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleRemoveCode}
            className="px-3 min-h-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title={lt(locale, { fa: 'حذف کد معرف', en: 'Remove referral code', ar: 'حذف رمز الإحالة', zh: '删除推荐码', ru: 'Удалить реферальный код' })}
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">
              {lt(locale, {
                fa: 'حذف کد',
                en: 'Remove',
                ar: 'حذف',
                zh: '删除',
                ru: 'Удалить',
              })}
            </span>
          </button>
        )}
      </div>

      {status === 'VALID' && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span className="truncate">
              {lt(locale, {
                fa: `کد معتبر است! ${Math.round(discountPercent * 100)}٪ تخفیف مسافر اعمال شد (سرگروه: ${leaderName || 'تأییدشده'})`,
                en: `Valid code! ${Math.round(discountPercent * 100)}% discount applied (Leader: ${leaderName || 'Verified'})`,
                ar: `الرمز صالح! تم تطبيق خصم ${Math.round(discountPercent * 100)}% (القائد: ${leaderName || 'معتمد'})`,
                zh: `代码有效！已应用 ${Math.round(discountPercent * 100)}% 折扣（领队：${leaderName || '已认证'}）`,
                ru: `Код действителен! Применена скидка ${Math.round(discountPercent * 100)}% (Лидер: ${leaderName || 'Подтверждён'})`,
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveCode}
            className="text-[11px] font-black text-rose-600 hover:text-rose-700 underline shrink-0 cursor-pointer"
          >
            {lt(locale, { fa: 'لغو تخفیف', en: 'Cancel discount', ar: 'إلغاء الخصم', zh: '取消折扣', ru: 'Отменить скидку' })}
          </button>
        </div>
      )}

      {status === 'USAGE_LIMIT_EXCEEDED' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold animate-in fade-in" role="status">
          <Ban size={16} className="shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            {lt(locale, {
              fa: 'سقف تعداد استفاده از این کد معرف تکمیل شده است و تخفیفی اعمال نمی‌شود.',
              en: 'The usage limit for this referral code has been reached — no discount applied.',
              ar: 'تم الوصول إلى الحد الأقصى لاستخدام رمز الإحالة هذا — لن يتم تطبيق أي خصم.',
              zh: '此推荐码的使用次数已达上限，不享受折扣。',
              ru: 'Лимит использования этого реферального кода исчерпан — скидка не применена.',
            })}
          </span>
        </div>
      )}

      {status === 'UNMATCHED' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          <span>
            {lt(locale, {
              fa: 'کد در سیستم یافت نشد، ولی با همین کد ثبت می‌شود تا سرگروه بعداً شناسایی شود.',
              en: 'Code not found in active system, but saved so your leader can be assigned later.',
              ar: 'لم يتم العثور على الرمز، ولكن سيتم حفظه لتعيين القائد لاحقاً.',
              zh: '系统中未找到该代码，但仍会保存以便后续核实领队。',
              ru: 'Код не найден, но сохранён для подтверждения организатором позже.',
            })}
          </span>
        </div>
      )}

      {status === 'SELF_REFERRAL' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400 text-xs font-bold animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 text-sky-600" />
          <span>
            {lt(locale, {
              fa: 'شما مالک این کد معرف هستید؛ پاداش سرگروه پس از اتمام رویداد محاسبه و تسویه می‌شود.',
              en: 'You are the leader of this code; your reward is settled post-event.',
              ar: 'أنت صاحب رمز الإحالة هذا؛ سيتم تسوية مكافأتك بعد انتهاء الرحلة.',
              zh: '您是此推荐码的领队；领队奖励将在活动结束后结算。',
              ru: 'Вы являетесь лидером по этому коду; вознаграждение рассчитывается после завершения.',
            })}
          </span>
        </div>
      )}

      {status === 'INACTIVE' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/30 text-zinc-600 dark:text-zinc-400 text-xs font-bold animate-in fade-in" role="status">
          <Ban size={16} className="shrink-0" aria-hidden="true" />
          <span>
            {lt(locale, {
              fa: 'این کد معرف در حال حاضر غیرفعال است و تخفیفی اعمال نمی‌شود.',
              en: 'This referral code is currently inactive — no discount applied.',
              ar: 'رمز الإحالة هذا غير نشط حالياً — لن يتم تطبيق أي خصم.',
              zh: '该推荐码目前未启用，不享受折扣。',
              ru: 'Этот реферальный код сейчас неактивен — скидка не применена.',
            })}
          </span>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold animate-in fade-in" role="alert">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {lt(locale, {
              fa: 'خطا در بررسی کد. اتصال را بررسی و دوباره تلاش کنید.',
              en: 'Could not verify the code. Check your connection and retry.',
              ar: 'تعذر التحقق من الرمز. تحقق من الاتصال وحاول مجدداً.',
              zh: '验证失败，请检查网络后重试。',
              ru: 'Не удалось проверить код. Проверьте соединение и повторите.',
            })}
          </span>
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading}
            className="shrink-0 min-h-[44px] px-3 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 transition disabled:opacity-50"
          >
            {lt(locale, { fa: 'تلاش مجدد', en: 'Retry', ar: 'إعادة المحاولة', zh: '重试', ru: 'Повторить' })}
          </button>
        </div>
      )}
    </div>
  );
}
