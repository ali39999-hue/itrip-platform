'use client';

import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { type Passenger } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { CheckCircle2, BookmarkPlus, ScanLine, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { EnrichedTravelerProfile } from '@/domains/identity/TravelerProfileService';

interface PassengerSectionProps {
  register: UseFormRegister<Passenger>;
  control: Control<Passenger>;
  errors: FieldErrors<Passenger>;
  scanning?: boolean;
  onScanPassport?: () => void;
  passportScanned?: boolean;
  savedProfiles?: EnrichedTravelerProfile[];
  onSelectSavedProfile?: (profile: EnrichedTravelerProfile) => void;
  saveToAccount?: boolean;
  onToggleSaveToAccount?: (val: boolean) => void;
  totalPassengers?: number;
  currentPassengerIndex?: number;
  onSelectPassengerTab?: (index: number) => void;
  passengersStatus?: Array<{ isComplete: boolean; name?: string }>;
}

export function PassengerSection({
  register,
  control,
  errors,
  scanning = false,
  onScanPassport,
  passportScanned = false,
  savedProfiles = [],
  onSelectSavedProfile,
  saveToAccount = false,
  onToggleSaveToAccount,
  totalPassengers = 1,
  currentPassengerIndex = 0,
  onSelectPassengerTab,
  passengersStatus = [],
}: PassengerSectionProps) {
  const locale = useLocale();

  const titleText =
    totalPassengers > 1
      ? lt(locale, {
        ar: `بيانات المسافر ${currentPassengerIndex + 1} ${currentPassengerIndex === 0 ? '(الرئيسي)' : '(مرافق)'}`, zh: `旅客 ${currentPassengerIndex + 1} 信息 ${currentPassengerIndex === 0 ? '（主旅客）' : '（同行者）'}`, ru: `Пассажир ${currentPassengerIndex + 1} ${currentPassengerIndex === 0 ? '(основной)' : '(сопровождающий)'}`,
          fa: `مشخصات مسافر ${currentPassengerIndex + 1} ${currentPassengerIndex === 0 ? '(سرپرست)' : '(همراه)'}`,
          en: `Passenger ${currentPassengerIndex + 1} Details ${currentPassengerIndex === 0 ? '(Primary)' : '(Companion)'}`,
        })
      : lt(locale, {
        ar: 'بيانات المسافر الرئيسي', zh: '主要旅客信息', ru: 'Данные основного пассажира',
          fa: 'مشخصات مسافر اصلی',
          en: 'Primary Passenger Details',
        });

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-6">
      {/* Multi-Passenger Tab Strip */}
      {totalPassengers > 1 && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-soft border border-line overflow-x-auto no-scrollbar snap-x touch-pan-x">
          {Array.from({ length: totalPassengers }).map((_, idx) => {
            const isCurrent = currentPassengerIndex === idx;
            const status = passengersStatus?.[idx];
            const defaultLabel =
              idx === 0
                ? lt(locale, { fa: 'مسافر ۱ (سرپرست)', en: 'Passenger 1 (Primary)', ar: 'المسافر ١ (الرئيسي)', zh: '旅客 1（主旅客）', ru: 'Пассажир 1 (основной)'})
                : lt(locale, { fa: `مسافر ${idx + 1} (همراه)`, en: `Passenger ${idx + 1}`, ar: `المسافر ${idx + 1} (مرافق)`, zh: `旅客 ${idx + 1}（同行者）`, ru: `Пассажир ${idx + 1} (сопровождающий)`});
            const pName = status?.name?.trim() || defaultLabel;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPassengerTab && onSelectPassengerTab(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-brand text-surface shadow-xs'
                    : 'bg-surface text-ink hover:bg-mint/40'
                }`}
              >
                <span>{pName}</span>
                {status?.isComplete && (
                  <CheckCircle2
                    size={13}
                    className={isCurrent ? 'text-mint-bright' : 'text-success'}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
        <div>
          <h2 className="text-[16px] font-black text-ink">{titleText}</h2>
          <p className="text-[12.5px] font-bold text-sub">
            {lt(locale, {
              fa: 'اطلاعات باید دقیقاً مطابق پاسپورت یا کارت ملی باشد',
              en: 'Information must exactly match passport or national ID',
              ar: 'يجب أن تطابق المعلومات جواز السفر تماماً',
              zh: '信息须与护照或身份证件完全一致',
              ru: 'Данные должны точно совпадать с паспортом'
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedProfiles && savedProfiles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                onChange={(e) => {
                  const p = savedProfiles.find((item) => item.id === e.target.value);
                  if (p && onSelectSavedProfile) {
                    onSelectSavedProfile(p);
                  }
                }}
                defaultValue=""
                className="h-10 px-3 rounded-xl bg-mint/50 border border-brand/30 text-brand-dark text-[12.5px] font-black focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                <option value="" disabled>
                  {lt(locale, {
                    ar: `اختيار من المسافرين المحفوظين (${savedProfiles.length})`, zh: `从已保存的旅客中选择（${savedProfiles.length}）`, ru: `Выбрать из сохранённых пассажиров (${savedProfiles.length})`,
                    fa: `انتخاب از مسافران ذخیره شده (${savedProfiles.length})`,
                    en: `Select from Saved Travelers (${savedProfiles.length})`,
                  })}
                </option>
                {savedProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.primaryPassport ? `(${p.primaryPassport.documentNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onScanPassport && (
            <button
              type="button"
              onClick={onScanPassport}
              disabled={scanning}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-action hover:bg-action-hover text-ink text-[13px] font-black shadow-elev-1 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>{lt(locale, { fa: 'در حال اسکن پاسپورت...', en: 'Scanning passport...', ar: 'جاري مسح الجواز...', zh: '正在扫描护照...', ru: 'Сканирование паспорта...' })}</span>
                </>
              ) : passportScanned ? (
                <>
                  <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
                  <span>{lt(locale, { fa: 'پاسپورت اسکن شد', en: 'Passport Scanned', ar: 'تم مسح الجواز', zh: '护照扫描完成', ru: 'Паспорт отсканирован' })}</span>
                </>
              ) : (
                <>
                  <ScanLine size={16} aria-hidden="true" />
                  <span>{lt(locale, { fa: 'اسکن هوشمند پاسپورت (OCR)', en: 'Smart Passport Scan (OCR)', ar: 'المسح الذكي للجواز (OCR)', zh: '智能护照扫描 (OCR)', ru: 'Умное сканирование паспорта (OCR)' })}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="firstName">
            {lt(locale, { fa: 'نام (انگلیسی)', en: 'First Name (Latin)', ar: 'الاسم الأول (باللاتينية)', zh: '名（拼音/英文）', ru: 'Имя (латиницей)' })} <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder={lt(locale, { fa: 'مثلاً: ALI', en: 'e.g. ALI', ar: 'مثلاً: ALI', zh: '例如: ALI', ru: 'например: ALI' })}
            dir="ltr"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            className="text-start uppercase font-bold"
          />
          {errors.firstName && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.firstName.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="lastName">
            {lt(locale, { fa: 'نام خانوادگی (انگلیسی)', en: 'Last Name (Latin)', ar: 'اسم العائلة (باللاتينية)', zh: '姓（拼音/英文）', ru: 'Фамилия (латиницей)' })} <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder={lt(locale, { fa: 'مثلاً: MOHAMMADI', en: 'e.g. MOHAMMADI', ar: 'مثلاً: MOHAMMADI', zh: '例如: MOHAMMADI', ru: 'например: MOHAMMADI' })}
            dir="ltr"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            className="text-start uppercase font-bold"
          />
          {errors.lastName && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.lastName.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="passportNo">
            {lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })} <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="passportNo"
            {...register('passportNo')}
            placeholder={lt(locale, { fa: 'مثلاً: A12345678', en: 'e.g. A12345678', ar: 'مثلاً: A12345678', zh: '例如: A12345678', ru: 'например: A12345678' })}
            dir="ltr"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            className="text-start uppercase font-mono font-bold"
          />
          {errors.passportNo && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.passportNo.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="nationalId">
            {lt(locale, { fa: 'کد ملی / شناسه هویتی', en: 'National ID / Tax Code', ar: 'الرقم الوطني / الهوية', zh: '身份证件号码', ru: 'ИИН / Идентификационный номер' })}
          </label>
          <Input
            id="nationalId"
            {...register('nationalId')}
            placeholder={lt(locale, { fa: 'مثلاً: ۰۰۱۲۳۴۵۶۷۸', en: 'e.g. 0012345678', ar: 'مثلاً: 0012345678', zh: '例如: 0012345678', ru: 'например: 0012345678' })}
            dir="ltr"
            inputMode="numeric"
            pattern="[0-9]*"
            className="text-start font-mono font-bold"
          />
          {errors.nationalId && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.nationalId.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="passportExpiryDate">
            {lt(locale, { fa: 'تاریخ انقضای گذرنامه', en: 'Passport Expiry Date', ar: 'تاريخ انتهاء الجواز', zh: '护照有效期至', ru: 'Срок действия паспорта' })}
            <span className="ms-1.5 text-[10px] text-brand-dark bg-mint/50 px-2 py-0.5 rounded-full font-bold">
              {lt(locale, { fa: 'حداقل ۶ ماه اعتبار الزامی', en: 'Min 6 months validity', ar: 'مطلوب صلاحية 6 أشهر', zh: '须至少6个月有效期', ru: 'Мин. 6 месяцев' })}
            </span>
          </label>
          <Input
            id="passportExpiryDate"
            {...register('passportExpiryDate')}
            placeholder="YYYY-MM-DD"
            dir="ltr"
            className="text-start font-mono font-bold"
          />
          {errors.passportExpiryDate && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.passportExpiryDate.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="birthDate">
            {lt(locale, { fa: 'تاریخ تولد', en: 'Date of Birth', ar: 'تاريخ الميلاد', zh: '出生日期', ru: 'Дата рождения' })} <span className="text-rose-warm">*</span>
          </label>
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <JalaliDatePicker
                value={field.value}
                onChange={(val) => field.onChange(val || '')}
                error={Boolean(errors.birthDate)}
              />
            )}
          />
          <span className="text-[10.5px] text-sub mt-1 block">
            {lt(locale, {
              fa: 'از تقویم انتخاب نمایید (مطابق کارت ملی یا گذرنامه)',
              en: 'Select from calendar matching passport/ID',
              ar: 'اختر من التقويم (مطابق لجواز السفر أو الهوية)',
              zh: '从日历中选择（须与证件一致）',
              ru: 'Выберите в календаре (в соответствии с паспортом)',
            })}
          </span>
          {errors.birthDate && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.birthDate.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="gender">
            {lt(locale, { fa: 'جنسیت', en: 'Gender', ar: 'الجنس', zh: '性别', ru: 'Пол' })} <span className="text-rose-warm">*</span>
          </label>
          <select
            id="gender"
            {...register('gender')}
            className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand cursor-pointer"
          >
            <option value="MALE">{lt(locale, { fa: 'مرد (Male)', en: 'Male', ar: 'ذكر', zh: '男 (Male)', ru: 'Мужской (Male)' })}</option>
            <option value="FEMALE">{lt(locale, { fa: 'زن (Female)', en: 'Female', ar: 'أنثى', zh: '女 (Female)', ru: 'Женский (Female)' })}</option>
          </select>
          {errors.gender && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.gender.message}
            </span>
          )}
        </div>
      </div>

      {/* Save Traveler to Account Checkbox */}
      <div className="pt-3 border-t border-line/50 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveToAccount}
            onChange={(e) => onToggleSaveToAccount && onToggleSaveToAccount(e.target.checked)}
            className="w-4 h-4 rounded text-brand focus:ring-brand border-line cursor-pointer"
          />
          <span className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
            <BookmarkPlus size={15} className="text-brand shrink-0" />
            {lt(locale, {
              ar: 'حفظ هذا المسافر في حسابي للحجوزات القادمة', zh: '将此旅客保存到我的账户以便日后预订', ru: 'Сохранить этого пассажира в аккаунт для будущих бронирований',
              fa: 'ذخیره این مسافر در حساب کاربری برای خریدهای بعدی',
              en: 'Save this traveler to my account for future bookings',
            })}
          </span>
        </label>
      </div>
    </div>
  );
}
