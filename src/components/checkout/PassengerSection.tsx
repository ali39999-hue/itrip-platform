'use client';

import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { type Passenger } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { ScanLine, Loader2, CheckCircle2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface PassengerSectionProps {
  register: UseFormRegister<Passenger>;
  control: Control<Passenger>;
  errors: FieldErrors<Passenger>;
  scanning: boolean;
  onScanPassport: () => void;
  passportScanned: boolean;
}

export function PassengerSection({
  register,
  control,
  errors,
  scanning,
  onScanPassport,
  passportScanned,
}: PassengerSectionProps) {
  const locale = useLocale();

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
        <div>
          <h2 className="text-[16px] font-black text-ink">
            {lt(locale, {
              fa: 'مشخصات مسافر اصلی',
              en: 'Primary Passenger Details',
              ar: 'بيانات المسافر الرئيسي',
              zh: '主要乘机人/住客信息',
              ru: 'Данные основного пассажира'
            })}
          </h2>
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

        <button
          type="button"
          onClick={onScanPassport}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-action hover:bg-action-hover text-ink text-[13px] font-black shadow-elev-1 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
            className="text-start font-mono font-bold"
          />
          {errors.nationalId && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.nationalId.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="birthDate">
            {lt(locale, { fa: 'تاریخ تولد میلادی', en: 'Date of Birth (Gregorian)', ar: 'تاريخ الميلاد (ميلادي)', zh: '出生日期（公历）', ru: 'Дата рождения (Григорианский)' })} <span className="text-rose-warm">*</span>
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
              fa: 'از تقویم انتخاب کنید یا به شکل ۱۳۷۰/۰۳/۱۵ وارد کنید',
              en: 'Pick from the calendar or type MM/DD/YYYY',
              ar: 'اختر من التقويم أو اكتب MM/DD/YYYY',
              zh: '从日历中选择，或输入 MM/DD/YYYY',
              ru: 'Выберите в календаре или введите MM/DD/YYYY',
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
    </div>
  );
}
