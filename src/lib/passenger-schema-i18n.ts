import { z } from 'zod';
import { lt } from './lt';
import { Gender } from './validations';

const nameRegex = /^[\p{Script=Latin}\p{Script=Arabic}\s'-]+$/u;

export function getPassengerSchema(locale: string) {
  return z.object({
    firstName: z
      .string()
      .min(1, lt(locale, { fa: 'نام را وارد کنید', en: 'Enter first name', ar: 'أدخل الاسم الأول', zh: '请输入名', ru: 'Укажите имя' }))
      .regex(nameRegex, lt(locale, { fa: 'فقط حروف لاتین یا فارسی مجاز است', en: 'Latin characters only', ar: 'حروف لاتينية فقط', zh: '仅限拉丁字母', ru: 'Только латиница' })),
    lastName: z
      .string()
      .min(1, lt(locale, { fa: 'نام خانوادگی را وارد کنید', en: 'Enter last name', ar: 'أدخل اسم العائلة', zh: '请输入姓', ru: 'Укажите фамилию' }))
      .regex(nameRegex, lt(locale, { fa: 'فقط حروف لاتین یا فارسی مجاز است', en: 'Latin characters only', ar: 'حروف لاتينية فقط', zh: '仅限拉丁字母', ru: 'Только латиница' })),
    nationalId: z
      .string()
      .regex(/^\d{10}$/, lt(locale, { fa: 'کد ملی باید ۱۰ رقم باشد', en: 'National ID must be 10 digits', ar: 'يجب أن يكون 10 أرقام', zh: '身份证号须为10位', ru: 'Нац. ID должен содержать 10 цифр' }))
      .optional()
      .or(z.literal('')),
    passportNo: z
      .string()
      .min(5, lt(locale, { fa: 'شماره پاسپورت معتبر نیست', en: 'Invalid passport number', ar: 'رقم جواز غير صالح', zh: '护照号无效', ru: 'Неверный номер паспорта' }))
      .max(20, lt(locale, { fa: 'شماره پاسپورت طولانی است', en: 'Passport number is too long', ar: 'رقم الجواز طويل جداً', zh: '护照号过长', ru: 'Номер паспорта слишком длинный' }))
      .optional(),
    birthDate: z
      .string()
      .min(1, lt(locale, { fa: 'تاریخ تولد را وارد کنید', en: 'Birth date is required', ar: 'تاريخ الميلاد مطلوب', zh: '请输入出生日期', ru: 'Укажите дату рождения' }))
      .transform((v) => {
        const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
        if (mdy) {
          const [, m, d, y] = mdy;
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(v.trim());
        if (ymd) {
          const [, y, m, d] = ymd;
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return v.trim();
      })
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime()),
        lt(locale, { fa: 'تاریخ تولد را از تقویم انتخاب کنید', en: 'Pick date of birth from calendar', ar: 'اختر تاريخ الميلاد من التقويم', zh: '请从日历选择出生日期', ru: 'Выберите дату рождения' })
      ),
    gender: Gender,
  });
}
