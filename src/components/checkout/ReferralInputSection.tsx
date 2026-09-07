'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { lt } from '@/lib/lt';
import { validateReferralCodeAction } from '@/actions/booking';

interface ReferralInputSectionProps {
  referralCode: string;
  setReferralCode: (code: string) => void;
  onValidationChange?: (isValid: boolean, discountPercent: number) => void;
  disabled?: boolean;
}

export function ReferralInputSection({
  referralCode,
  setReferralCode,
  onValidationChange,
  disabled = false,
}: ReferralInputSectionProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'VALID' | 'UNMATCHED' | 'SELF_REFERRAL' | 'ERROR'>('IDLE');
  const [leaderName, setLeaderName] = useState<string>('');

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
          onValidationChange?.(true, res.discountPercent || 0.05);
        } else if (res.status === 'SELF_REFERRAL') {
          setStatus('SELF_REFERRAL');
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
          className="flex-1 h-11 px-3 rounded-xl border border-line bg-paper/50 text-[13px] font-mono font-bold uppercase tracking-wider text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />

        <button
          type="button"
          disabled={loading || !referralCode.trim() || disabled}
          onClick={handleValidate}
          className="px-4 min-h-[44px] rounded-xl bg-soft hover:bg-line/70 text-ink text-[13px] font-bold transition disabled:opacity-50 flex items-center gap-1.5"
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
      </div>

      {status === 'VALID' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>
            {lt(locale, {
              fa: `کد معتبر است! ۵٪ تخفیف مسافر اعمال شد (سرگروه: ${leaderName || 'تأییدشده'})`,
              en: `Valid code! 5% discount applied (Leader: ${leaderName || 'Verified'})`,
              ar: `الرمز صالح! تم تطبيق خصم 5% (القائد: ${leaderName || 'معتمد'})`,
              zh: `代码有效！已应用5%折扣（领队：${leaderName || '已认证'}）`,
              ru: `Код действителен! Применена скидка 5% (Лидер: ${leaderName || 'Подтверждён'})`,
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
    </div>
  );
}
