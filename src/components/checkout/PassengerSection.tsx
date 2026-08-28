'use client';

import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { type Passenger } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { ScanLine, Loader2, CheckCircle2 } from 'lucide-react';

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
  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
        <div>
          <h2 className="text-[16px] font-black text-ink">مشخصات مسافر اصلی</h2>
          <p className="text-[12.5px] font-bold text-sub">اطلاعات باید دقیقاً مطابق پاسپورت یا کارت ملی باشد</p>
        </div>

        <button
          type="button"
          onClick={onScanPassport}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[13px] font-black shadow-sm transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          {scanning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>در حال اسکن پاسپورت...</span>
            </>
          ) : passportScanned ? (
            <>
              <CheckCircle2 size={16} className="text-success" />
              <span>پاسپورت اسکن شد</span>
            </>
          ) : (
            <>
              <ScanLine size={16} />
              <span>اسکن هوشمند پاسپورت (OCR)</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="firstName">
            نام (انگلیسی) <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="مثلاً: ALI"
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
            نام خانوادگی (انگلیسی) <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="مثلاً: MOHAMMADI"
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
            شماره پاسپورت <span className="text-rose-warm">*</span>
          </label>
          <Input
            id="passportNo"
            {...register('passportNo')}
            placeholder="مثلاً: A12345678"
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
            کد ملی ۱۰ رقمی (مسافران ایرانی)
          </label>
          <Input
            id="nationalId"
            {...register('nationalId')}
            placeholder="مثلاً: ۰۰۱۲۳۴۵۶۷۸"
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
            تاریخ تولد میلادی <span className="text-rose-warm">*</span>
          </label>
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <JalaliDatePicker
                value={field.value}
                onChange={(val) => field.onChange(val || '')}
              />
            )}
          />
          {errors.birthDate && (
            <span className="text-rose-warm text-[11px] font-bold mt-1 block">
              {errors.birthDate.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor="gender">
            جنسیت <span className="text-rose-warm">*</span>
          </label>
          <select
            id="gender"
            {...register('gender')}
            className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand cursor-pointer"
          >
            <option value="MALE">مرد (Male)</option>
            <option value="FEMALE">زن (Female)</option>
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
