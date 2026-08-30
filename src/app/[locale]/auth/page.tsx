'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, User, Lock, LogIn } from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AuthPage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const { login, setKycStep, updateKyc, kyc } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [firstFa, setFirstFa] = useState(kyc.firstNameFa || '');
  const [lastFa, setLastFa] = useState(kyc.lastNameFa || '');
  const [nationalId, setNationalId] = useState(kyc.nationalId || '');
  const [scanning, setScanning] = useState(false);
  const [passportNo, setPassportNo] = useState(kyc.passportNo || '');
  const [expiry, setExpiry] = useState(kyc.passportExpiry || '');

  const step = kyc.step;

  function sendOtp() {
    if (!/^09\d{9}$/.test(phone)) {
      setError(lt(locale, { fa: 'شماره موبایل معتبر نیست (۰۹xxxxxxxxx)', en: 'Invalid mobile number (09xxxxxxxxx)', ar: 'رقم جوال غير صالح (09xxxxxxxxx)', zh: '手机号无效（09xxxxxxxxx）', ru: 'Неверный номер телефона (09xxxxxxxxx)' }));
      return;
    }
    setError('');
    setKycStep('otp');
  }

  async function verifyOtp() {
    setLoading(true);
    setError('');
    const ok = await login(phone, otp);
    setLoading(false);
    if (!ok) {
      setError(lt(locale, { fa: 'کد تایید اشتباه است', en: 'Invalid OTP code', ar: 'رمز التحقق غير صحيح', zh: '验证码错误', ru: 'Неверный код подтверждения' }));
      return;
    }
    router.push('/account');
  }

  function scanPassport() {
    setScanning(true);
    setTimeout(() => {
      setPassportNo('EP' + Math.floor(Math.random() * 9000000 + 1000000));
      setExpiry(new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10));
      setScanning(false);
    }, 1400);
  }

  function submitIdentity() {
    if (!firstFa.trim() || !lastFa.trim() || !/^\d{10}$/.test(nationalId)) {
      setError(lt(locale, { fa: 'نام، فامیل و کد ملی ۱۰ رقمی الزامی است', en: 'Full name and 10-digit National ID required', ar: 'الاسم الكامل والرقم الوطني المكوّن من 10 أرقام مطلوبان', zh: '必填姓名和10位国民身份证号', ru: 'Укажите ФИО и 10-значный национальный ID' }));
      return;
    }
    setError('');
    updateKyc({ firstNameFa: firstFa, lastNameFa: lastFa, nationalId });
    setKycStep('passport_scan');
  }

  function finishKyc() {
    if (!passportNo.trim() || !expiry) {
      setError(lt(locale, { fa: 'اطلاعات پاسپورت را تکمیل یا اسکن کنید', en: 'Please scan or enter passport details', ar: 'يرجى مسح أو إدخال بيانات جواز السفر', zh: '请扫描或填写护照信息', ru: 'Отсканируйте или введите данные паспорта' }));
      return;
    }
    setError('');
    updateKyc({ passportNo, passportExpiry: expiry });
    setKycStep('approved');
    router.push('/account');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-sm">
        {/* Step: Phone input */}
        {step === 'phone' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <LogIn size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('loginTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">{t('loginSubtitle')}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-xs font-bold text-sub mb-1">{t('phone')}</label>
                <input
                  id="identifier"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                id="auth-submit-btn"
                onClick={sendOtp}
                className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('sendOtp')}
              </button>
            </div>
          </div>
        )}

        {/* Step: OTP input */}
        {step === 'otp' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <Lock size={24} />
            </div>
            <h2 className="font-black text-2xl text-ink mb-2">{t('enterOtp')}</h2>
            <p className="text-xs font-bold text-sub mb-6">
              {locale === 'fa' ? `کد ارسال شده به شماره ${phone} را وارد کنید` : `Enter the OTP sent to ${phone}`}
            </p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-sub mb-1">{t('otp')}</label>
                <input
                  id="password"
                  type="text"
                  dir="ltr"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="12345"
                  className="w-full h-12 rounded-xl border border-line px-4 text-center font-mono font-black text-xl tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                id="auth-verify-btn"
                onClick={verifyOtp}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : t('verify')}
              </button>

              <button
                onClick={() => setKycStep('phone')}
                className="w-full text-xs font-bold text-sub hover:text-brand transition py-2"
              >
                {lt(locale, { fa: 'تغییر شماره موبایل', en: 'Change Phone Number', ar: 'تغيير رقم الجوال', zh: '更改手机号', ru: 'Изменить номер телефона' })}
              </button>
            </div>
          </div>
        )}

        {/* Step: Identity Info */}
        {step === 'identity' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <User size={24} />
            </div>
            <h2 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'احراز هویت و مشخصات', en: 'Identity Information', ar: 'التحقق من الهوية والبيانات', zh: '身份认证与资料', ru: 'Верификация и личные данные' })}</h2>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'برای صدور قطعی بلیط و واچر هتل، مشخصات را دقیق وارد کنید', en: 'Please enter details exactly as they appear on official ID', ar: 'لإصدار التذاكر وقسائم الفنادق نهائياً، أدخل البيانات بدقة كما في المستندات الرسمية', zh: '为最终出票和酒店凭证，请准确填写证件信息', ru: 'Для окончательной выдачи билетов и ваучеров вводите данные точно как в документах' })}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام', en: 'First Name', ar: 'الاسم الأول', zh: '名', ru: 'Имя' })}</label>
                  <input
                    type="text"
                    value={firstFa}
                    onChange={(e) => setFirstFa(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام خانوادگی', en: 'Last Name', ar: 'اسم العائلة', zh: '姓', ru: 'Фамилия' })}</label>
                  <input
                    type="text"
                    value={lastFa}
                    onChange={(e) => setLastFa(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'کد ملی ۱۰ رقمی', en: 'National ID (10 digits)', ar: 'الرقم الوطني (10 أرقام)', zh: '国民身份证号（10位）', ru: 'Национальный ID (10 цифр)' })}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="0012345678"
                  className="w-full h-11 rounded-xl border border-line px-3 font-mono font-bold text-sm"
                />
              </div>

              <button
                onClick={submitIdentity}
                className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition"
              >
                {lt(locale, { fa: 'مرحله بعد: اطلاعات پاسپورت', en: 'Next: Passport Details', ar: 'التالي: بيانات جواز السفر', zh: '下一步：护照信息', ru: 'Далее: данные паспорта' })}
              </button>
            </div>
          </div>
        )}

        {/* Step: Passport / OCR */}
        {step === 'passport_scan' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <ScanLine size={24} />
            </div>
            <h2 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'اسکن یا ثبت پاسپورت', en: 'Passport Verification', ar: 'مسح أو تسجيل جواز السفر', zh: '护照扫描或登记', ru: 'Сканирование или ввод паспорта' })}</h2>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'اسکن هوشمند پاسپورت یا ورود دستی شماره و تاریخ انقضا', en: 'OCR scan or manual entry for international bookings', ar: 'مسح ذكي لجواز السفر أو إدخال يدوي للرقم وتاريخ الانتهاء', zh: '护照智能扫描或手动输入号码与有效期', ru: 'Умное сканирование паспорта или ручной ввод номера и срока действия' })}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <button
              onClick={scanPassport}
              disabled={scanning}
              className="w-full p-4 mb-4 rounded-2xl border-2 border-dashed border-brand bg-mint/30 hover:bg-mint/50 transition flex flex-col items-center gap-2 cursor-pointer"
            >
              {scanning ? (
                <Loader2 className="animate-spin text-brand" size={28} />
              ) : (
                <ScanLine className="text-brand" size={28} />
              )}
              <span className="font-black text-xs text-brand-dark">
                {scanning ? (lt(locale, { fa: 'در حال خواندن بارکد پاسپورت...', en: 'Scanning passport MRZ...', ar: 'جارٍ قراءة رمز جواز السفر...', zh: '正在读取护照机读码…', ru: 'Чтение машиночитаемой зоны паспорта…' })) : (lt(locale, { fa: 'اسکن هوشمند پاسپورت (OCR)', en: 'Smart Passport OCR Scan', ar: 'مسح ذكي لجواز السفر (OCR)', zh: '护照智能扫描（OCR）', ru: 'Умное сканирование паспорта (OCR)' }))}
              </span>
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="EP1234567"
                  className="w-full h-11 rounded-xl border border-line px-3 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'تاریخ انقضا', en: 'Expiry Date', ar: 'تاريخ الانتهاء', zh: '有效期至', ru: 'Срок действия' })}</label>
                <input
                  type="date"
                  dir="ltr"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full h-11 rounded-xl border border-line px-3 font-mono font-bold text-sm"
                />
              </div>

              <button
                onClick={finishKyc}
                className="w-full h-12 rounded-xl bg-action hover:bg-action-hover text-[#14201f] font-black text-sm transition shadow-sm"
              >
                {lt(locale, { fa: 'تکمیل و ورود به حساب', en: 'Complete & Enter Account', ar: 'استكمال والدخول إلى الحساب', zh: '完成并进入账户', ru: 'Завершить и войти в аккаунт' })}
              </button>
            </div>
          </div>
        )}

        {/* Step: Complete / Approved */}
        {step === 'approved' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full grid place-items-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'احراز هویت تکمیل شد', en: 'Verification Complete', ar: 'اكتمل التحقق من الهوية', zh: '身份认证已完成', ru: 'Верификация завершена' })}</h2>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'حساب کاربری شما با موفقیت تایید گردید.', en: 'Your account has been fully verified.', ar: 'تم التحقق من حسابك بنجاح.', zh: '您的账户已成功通过认证。', ru: 'Ваш аккаунт успешно верифицирован.' })}</p>
            <button
              onClick={() => router.push('/account')}
              className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition"
            >
              {lt(locale, { fa: 'ورود به پنل کاربری', en: 'Go to Dashboard', ar: 'الدخول إلى لوحة الحساب', zh: '进入用户面板', ru: 'Перейти в личный кабинет' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
