'use client';

import { useEffect, useState } from 'react';
import {
  X,
  UserRound,
  ShieldCheck,
  BadgeCheck,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Loader2,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { validateNationalId } from '@/lib/iranian-commerce';
import { NationalIdInput } from '@/components/ui/national-id-input';
import {
  normalizeNationalId,
  isIdentityStepValid,
  isVerificationStepValid,
  buildKycProfilePayload,
  KYC_STEP_COUNT,
  type KycDraft,
} from '@/lib/kyc-wizard';
import { updateProfileDetails } from '@/actions/auth';

export interface KycCompletionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Current known identity values to prefill the wizard. */
  initial?: Partial<KycDraft>;
  /** Fired after the server persisted the completed KYC data. */
  onCompleted: (data: KycDraft) => void;
}

const STEP_LABELS = [
  { fa: 'مشخصات فردی', en: 'Personal Details', ar: 'البيانات الشخصية', zh: '个人信息', ru: 'Личные данные' },
  { fa: 'احراز هویت', en: 'Identity Verification', ar: 'التحقق من الهوية', zh: '身份认证', ru: 'Верификация' },
  { fa: 'بازبینی و تایید', en: 'Review & Confirm', ar: 'المراجعة والتأكيد', zh: '确认信息', ru: 'Проверка' },
] as const;

const EMPTY_DRAFT: KycDraft = {
  firstNameFa: '',
  lastNameFa: '',
  firstNameEn: '',
  lastNameEn: '',
  nationalId: '',
  passportNo: '',
  passportExpiry: '',
};

/**
 * KYC completion wizard rendered as a Bottom Sheet on mobile / centered dialog
 * on desktop (AGENTS.md §1.2). Three steps: identity → verification (کد ملی
 * with modulo-11 checksum, or passport) → review, then persists via
 * updateProfileDetails. This is the KYC path inside the "تکمیل اطلاعات" flow —
 * not a bare info form.
 */
export function KycCompletionSheet({ open, onClose, initial, onCompleted }: KycCompletionSheetProps) {
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<KycDraft>({ ...EMPTY_DRAFT, ...initial });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Re-seed the form every time the sheet opens so a cancel never leaks edits.
  useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY_DRAFT, ...initial });
      setStep(0);
      setError('');
      setDone(false);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape dismisses + body scroll lock while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleContinue() {
    setError('');
    if (step === 0 && !isIdentityStepValid(draft)) {
      setError(
        lt(locale, {
          fa: 'نام و نام خانوادگی فارسی الزامی است',
          en: 'Persian first and last name are required',
          ar: 'الاسم الأول واسم العائلة مطلوبان',
          zh: '需要中文/波斯文姓名',
          ru: 'Имя и фамилия обязательны',
        })
      );
      return;
    }
    if (step === 1) {
      const nid = normalizeNationalId(draft.nationalId);
      if (nid && !validateNationalId(nid)) {
        setError(
          lt(locale, {
            fa: 'کد ملی وارد شده معتبر نیست (رقم کنترل اشتباه است)',
            en: 'The national ID is invalid (checksum failed)',
            ar: 'الرقم الوطني غير صالح (فشل رقم التحقق)',
            zh: '身份证号无效（校验失败）',
            ru: 'Национальный ID недействителен (ошибка контрольной суммы)',
          })
        );
        return;
      }
      if (!isVerificationStepValid(draft)) {
        setError(
          lt(locale, {
            fa: 'ثبت کد ملی ۱۰ رقمی معتبر یا شماره گذرنامه الزامی است',
            en: 'A valid 10-digit national ID or passport number is required',
            ar: 'يلزم رقم وطني صالح من 10 أرقام أو رقم جواز السفر',
            zh: '需要有效的10位身份证号或护照号',
            ru: 'Требуется действительный 10-значный ID или номер паспорта',
          })
        );
        return;
      }
    }
    if (step === 2) {
      void handleSubmit();
      return;
    }
    setStep(step + 1);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await updateProfileDetails(buildKycProfilePayload(draft));
      if (!res.success) {
        setError(
          lt(locale, {
            fa: 'ذخیره اطلاعات هویتی ناموفق بود' + (res.error ? `: ${res.error}` : ''),
            en: 'Could not save identity details' + (res.error ? `: ${res.error}` : ''),
            ar: 'فشل حفظ بيانات الهوية' + (res.error ? `: ${res.error}` : ''),
            zh: '保存身份信息失败' + (res.error ? `：${res.error}` : ''),
            ru: 'Не удалось сохранить данные' + (res.error ? `: ${res.error}` : ''),
          })
        );
        return;
      }
      onCompleted(draft);
      setDone(true);
    } catch {
      setError(
        lt(locale, {
          fa: 'خطای غیرمنتظره در ذخیره اطلاعات',
          en: 'Unexpected error while saving',
          ar: 'خطأ غير متوقع أثناء الحفظ',
          zh: '保存时出现意外错误',
          ru: 'Неожиданная ошибка при сохранении',
        })
      );
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    'w-full h-11 min-h-[44px] rounded-xl border border-line px-3 text-sm font-bold bg-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition active:scale-[0.98]';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-deep/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-sheet-title"
        className="w-full max-w-lg max-h-[92vh] bg-surface rounded-t-3xl sm:rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Drag handle (mobile bottom sheet affordance) */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto mt-3 mb-1 shrink-0" aria-hidden="true" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="kyc-sheet-title" className="text-sm sm:text-base font-black text-ink truncate m-0">
                {lt(locale, {
                  fa: 'تکمیل اطلاعات و احراز هویت',
                  en: 'Complete Details & Identity Verification',
                  ar: 'إكمال البيانات والتحقق من الهوية',
                  zh: '完善信息与身份认证',
                  ru: 'Заполнение данных и верификация',
                })}
              </h2>
              {!done && (
                <p className="text-[11px] font-bold text-sub m-0">
                  {lt(locale, {
                    fa: `مرحله ${step + 1} از ${KYC_STEP_COUNT}`,
                    en: `Step ${step + 1} of ${KYC_STEP_COUNT}`,
                    ar: `الخطوة ${step + 1} من ${KYC_STEP_COUNT}`,
                    zh: `第 ${step + 1} 步，共 ${KYC_STEP_COUNT} 步`,
                    ru: `Шаг ${step + 1} из ${KYC_STEP_COUNT}`,
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            className="min-w-[44px] min-h-[44px] -me-2 rounded-full text-sub hover:text-ink hover:bg-line/40 grid place-items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="w-8 h-8 rounded-full bg-soft grid place-items-center">
              <X size={18} />
            </div>
          </button>
        </div>

        {done ? (
          /* ── Success state ─────────────────────────────────────────── */
          <div className="px-6 py-10 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-success/10 grid place-items-center mx-auto mb-4">
              <BadgeCheck size={34} className="text-success" />
            </div>
            <h3 className="text-base font-black text-ink mb-2">
              {lt(locale, {
                fa: 'احراز هویت شما تکمیل شد',
                en: 'Your identity verification is complete',
                ar: 'اكتمل التحقق من هويتك',
                zh: '您的身份认证已完成',
                ru: 'Верификация личности завершена',
              })}
            </h3>
            <p className="text-xs font-bold text-sub leading-relaxed mb-6">
              {lt(locale, {
                fa: 'اطلاعات هویتی شما با موفقیت ثبت شد و برای صدور بلیط، رزرو هتل و خدمات ویزا استفاده می‌شود.',
                en: 'Your identity details were saved and will be used for ticketing, hotel bookings and visa services.',
                ar: 'تم حفظ بياناتك الهوية وسيتم استخدامها لإصدار التذاكر وحجوزات الفنادق وخدمات التأشيرة.',
                zh: '您的身份信息已保存，将用于出票、酒店预订及签证服务。',
                ru: 'Ваши данные сохранены и будут использоваться для билетов, отелей и виз.',
              })}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 min-h-[44px] rounded-xl bg-brand hover:bg-brand-2 text-surface text-sm font-black transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {lt(locale, { fa: 'متوجه شدم', en: 'Done', ar: 'حسناً', zh: '知道了', ru: 'Готово' })}
            </button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="px-5 pt-3.5 pb-1 shrink-0" aria-hidden="true">
              <div className="flex items-center gap-1.5">
                {STEP_LABELS.map((label, i) => (
                  <div key={label.en} className="flex-1 flex flex-col gap-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-colors duration-300 ${
                        i < step ? 'bg-success' : i === step ? 'bg-brand' : 'bg-line/60'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-black truncate ${
                        i === step ? 'text-brand-dark' : i < step ? 'text-success' : 'text-sub/70'
                      }`}
                    >
                      {i < step ? '✓ ' : ''}
                      {lt(locale, { fa: label.fa, en: label.en, ar: label.ar, zh: label.zh, ru: label.ru })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step body */}
            <div className="p-5 overflow-y-auto flex-1" aria-live="polite">
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="kyc-firstname-fa" className="block text-xs font-bold text-sub mb-1">
                      {lt(locale, { fa: 'نام (فارسی)', en: 'First Name (Persian)', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' })}
                      <span className="text-rose-500"> *</span>
                    </label>
                    <input
                      id="kyc-firstname-fa"
                      type="text"
                      autoFocus
                      value={draft.firstNameFa}
                      onChange={(e) => setDraft({ ...draft, firstNameFa: e.target.value })}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="kyc-lastname-fa" className="block text-xs font-bold text-sub mb-1">
                      {lt(locale, { fa: 'نام خانوادگی (فارسی)', en: 'Last Name (Persian)', ar: 'اسم العائلة', zh: '姓氏', ru: 'Фамилия' })}
                      <span className="text-rose-500"> *</span>
                    </label>
                    <input
                      id="kyc-lastname-fa"
                      type="text"
                      value={draft.lastNameFa}
                      onChange={(e) => setDraft({ ...draft, lastNameFa: e.target.value })}
                      className={inputBase}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="kyc-firstname-en" className="block text-xs font-bold text-sub mb-1">
                        {lt(locale, { fa: 'نام لاتین (اختیاری)', en: 'Latin First Name (optional)', ar: 'الاسم اللاتيني (اختياري)', zh: '拉丁名字（可选）', ru: 'Имя латиницей (опционально)' })}
                      </label>
                      <input
                        id="kyc-firstname-en"
                        type="text"
                        dir="ltr"
                        value={draft.firstNameEn}
                        placeholder="ALI"
                        onChange={(e) => setDraft({ ...draft, firstNameEn: e.target.value.toUpperCase() })}
                        className={`${inputBase} font-mono`}
                      />
                    </div>
                    <div>
                      <label htmlFor="kyc-lastname-en" className="block text-xs font-bold text-sub mb-1">
                        {lt(locale, { fa: 'نام خانوادگی لاتین (اختیاری)', en: 'Latin Last Name (optional)', ar: 'اسم العائلة اللاتيني (اختياري)', zh: '拉丁姓氏（可选）', ru: 'Фамилия латиницей (опционально)' })}
                      </label>
                      <input
                        id="kyc-lastname-en"
                        type="text"
                        dir="ltr"
                        value={draft.lastNameEn}
                        placeholder="MOHAMMADI"
                        onChange={(e) => setDraft({ ...draft, lastNameEn: e.target.value.toUpperCase() })}
                        className={`${inputBase} font-mono`}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-sub leading-relaxed flex items-start gap-1.5 m-0">
                    <UserRound size={13} className="shrink-0 mt-0.5" />
                    {lt(locale, {
                      fa: 'نام‌ها باید مطابق کارت ملی/شناسنامه باشد؛ نام لاتین برای بلیط‌های بین‌المللی مطابق گذرنامه وارد شود.',
                      en: 'Names must match your national ID; Latin names (for international tickets) must match your passport.',
                      ar: 'يجب أن تطابق الأسماء الهوية الوطنية؛ الأسماء اللاتينية مطابقة لجواز السفر للتذاكر الدولية.',
                      zh: '姓名须与身份证一致；拉丁文姓名须与护照一致（用于国际机票）。',
                      ru: 'Имена должны совпадать с удостоверением личности; латиница — с загранпаспортом.',
                    })}
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="kyc-national-id" className="block text-xs font-bold text-sub mb-1">
                      {lt(locale, { fa: 'کد ملی (۱۰ رقم)', en: 'National ID (10 digits)', ar: 'الرقم الوطني (10 أرقام)', zh: '身份证号（10位）', ru: 'Нац. ID (10 цифр)' })}
                      <span className="text-rose-500"> *</span>
                    </label>
                    {/* 3-6-1 card grouping + live checksum verdict (vibefarsi pattern,
                        checksum from @/lib/iranian-commerce). */}
                    <NationalIdInput
                      id="kyc-national-id"
                      value={draft.nationalId}
                      onChange={(digits) => setDraft({ ...draft, nationalId: digits })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="kyc-passport-no" className="block text-xs font-bold text-sub mb-1">
                        {lt(locale, { fa: 'شماره گذرنامه (اختیاری)', en: 'Passport No. (optional)', ar: 'رقم جواز السفر (اختياري)', zh: '护照号（可选）', ru: '№ паспорта (опционально)' })}
                      </label>
                      <input
                        id="kyc-passport-no"
                        type="text"
                        dir="ltr"
                        value={draft.passportNo}
                        onChange={(e) => setDraft({ ...draft, passportNo: e.target.value.toUpperCase() })}
                        className={`${inputBase} font-mono`}
                      />
                    </div>
                    <div>
                      <label htmlFor="kyc-passport-expiry" className="block text-xs font-bold text-sub mb-1">
                        {lt(locale, { fa: 'انقضای گذرنامه (اختیاری)', en: 'Passport Expiry (optional)', ar: 'انتهاء الجواز (اختياري)', zh: '护照有效期（可选）', ru: 'Срок паспорта (опционально)' })}
                      </label>
                      <input
                        id="kyc-passport-expiry"
                        type="date"
                        dir="ltr"
                        value={draft.passportExpiry}
                        onChange={(e) => setDraft({ ...draft, passportExpiry: e.target.value })}
                        className={`${inputBase} font-mono`}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-sub leading-relaxed flex items-start gap-1.5 m-0">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    {lt(locale, {
                      fa: 'برای اتباع غیرایرانی به‌جای کد ملی، شماره گذرنامه کافی است. کد ملی با الگوریتم رسمی کنترل رقم اعتبارسنجی می‌شود.',
                      en: 'Foreign nationals may enter their passport number instead. National IDs are validated with the official checksum algorithm.',
                      ar: 'يمكن لغير الإيرانيين إدخال رقم جواز السفر بدلاً من الرقم الوطني. يتم التحقق من الرقم الوطني بخوارزمية رسمية.',
                      zh: '外国用户可填写护照号代替身份证号。身份证号将通过官方校验算法验证。',
                      ru: 'Иностранцы могут указать номер паспорта. ID проверяется официальным алгоритмом контрольной суммы.',
                    })}
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2.5">
                  {[
                    {
                      label: lt(locale, { fa: 'نام و نام خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' }),
                      value: `${draft.firstNameFa} ${draft.lastNameFa}`.trim() || '—',
                    },
                    {
                      label: lt(locale, { fa: 'نام لاتین', en: 'Latin Name', ar: 'الاسم اللاتيني', zh: '拉丁文姓名', ru: 'Латинское имя' }),
                      value: `${draft.firstNameEn} ${draft.lastNameEn}`.trim() || '—',
                    },
                    {
                      label: lt(locale, { fa: 'کد ملی', en: 'National ID', ar: 'الرقم الوطني', zh: '身份证号', ru: 'Нац. ID' }),
                      value: normalizeNationalId(draft.nationalId) || '—',
                    },
                    {
                      label: lt(locale, { fa: 'گذرنامه', en: 'Passport', ar: 'جواز السفر', zh: '护照', ru: 'Паспорт' }),
                      value: draft.passportNo.trim()
                        ? `${draft.passportNo}${draft.passportExpiry ? ` · ${draft.passportExpiry}` : ''}`
                        : '—',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-soft/60 border border-line/60"
                    >
                      <span className="text-xs font-bold text-sub shrink-0">{row.label}</span>
                      <span className="text-sm font-black text-ink truncate">{row.value}</span>
                    </div>
                  ))}
                  <p className="text-[11px] font-bold text-sub leading-relaxed flex items-start gap-1.5 m-0 pt-1">
                    <CheckCircle size={13} className="shrink-0 mt-0.5 text-success" />
                    {lt(locale, {
                      fa: 'با تایید، این اطلاعات به‌عنوان مشخصات هویتی حساب شما ثبت و در فرآیند صدور بلیط استفاده می‌شود.',
                      en: 'On confirm, these details become your account identity and are used in ticketing.',
                      ar: 'بالتأكيد، يتم تسجيل هذه البيانات كهوية حسابك وتُستخدم في إصدار التذاكر.',
                      zh: '确认后，这些信息将作为您的账户身份信息并用于出票流程。',
                      ru: 'После подтверждения данные станут вашими идентификационными и будут использоваться при оформлении.',
                    })}
                  </p>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 mb-0 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">
                  {error}
                </p>
              )}
            </div>

            {/* Thumb-zone action bar */}
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line flex items-center gap-3 bg-soft/50 shrink-0">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(step - 1);
                  }}
                  disabled={saving}
                  className="min-w-[44px] min-h-[44px] h-11 px-4 rounded-xl bg-surface border border-line text-sub font-bold text-xs hover:text-ink flex items-center justify-center gap-1 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                >
                  {locale === 'fa' || locale === 'ar' ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                  <span>{lt(locale, { fa: 'قبلی', en: 'Back', ar: 'السابق', zh: '上一步', ru: 'Назад' })}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="h-11 min-h-[44px] px-4 rounded-xl bg-surface border border-line text-sub font-bold text-xs hover:text-ink transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
              )}
              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="flex-1 h-11 min-h-[44px] rounded-xl bg-action hover:bg-action-hover text-ink font-black text-sm transition active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                <span>
                  {step === 2
                    ? lt(locale, { fa: 'تایید و تکمیل احراز هویت', en: 'Confirm & Complete KYC', ar: 'تأكيد وإكمال التحقق', zh: '确认并完成认证', ru: 'Подтвердить и завершить' })
                    : lt(locale, { fa: 'ادامه', en: 'Continue', ar: 'متابعة', zh: '继续', ru: 'Далее' })}
                </span>
                {step < 2 && (locale === 'fa' || locale === 'ar' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
