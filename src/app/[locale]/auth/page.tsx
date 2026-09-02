'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, User, Lock, LogIn } from 'lucide-react';
import { lt } from '@/lib/lt';
import { Logo } from '@/components/layout/Logo';

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
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
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
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                id="auth-submit-btn"
                onClick={sendOtp}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('sendOtp')}
              </button>
            </div>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <Lock size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('otpTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">{t('otpSubtitle')} {phone}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-sub mb-1">{t('otpLabel')}</label>
                <input
                  id="password"
                  name="otp"
                  type="text"
                  dir="ltr"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="1234"
                  className="w-full h-12 rounded-xl border border-line px-4 text-center tracking-widest text-xl font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <p className="text-[11px] text-sub mt-1 text-center font-bold">کد تستی دمو: 1234 یا هر ۴ رقم</p>
              </div>

              <button
                id="auth-verify-btn"
                onClick={verifyOtp}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {t('verifyOtp')}
              </button>

              <button
                onClick={() => setKycStep('phone')}
                className="w-full text-xs font-bold text-sub hover:text-ink text-center"
              >
                {t('changePhone')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Name Info */}
        {step === 'name_info' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <User size={24} />
            </div>
            <h2 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'نام و نام خانوادگی', en: 'Your Name', ar: 'اسمك الكامل', zh: '您的姓名', ru: 'Ваше имя' })}</h2>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'لطفاً نام و نام خانوادگی خود را دقیق وارد کنید', en: 'Please enter your first and last name accurately', ar: 'يرجى إدخال اسمك الأول والأخير بدقة', zh: '请准确输入您的名字和姓氏', ru: 'Пожалуйста, введите свое имя и фамилию' })}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام (فارسی)', en: 'First Name', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' })}</label>
                  <input
                    type="text"
                    value={firstFa}
                    onChange={(e) => setFirstFa(e.target.value)}
                    placeholder={lt(locale, { fa: 'مثال: علی', en: 'e.g. John', ar: 'مثال: أحمد', zh: '例如：张', ru: 'напр. Иван' })}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام خانوادگی (فارسی)', en: 'Last Name', ar: 'اسم العائلة', zh: '姓氏', ru: 'Фамилия' })}</label>
                  <input
                    type="text"
                    value={lastFa}
                    onChange={(e) => setLastFa(e.target.value)}
                    placeholder={lt(locale, { fa: 'مثال: محمدی', en: 'e.g. Smith', ar: 'مثال: الأحمد', zh: '例如：三', ru: 'напр. Иванов' })}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام (انگلیسی)', en: 'First Name (EN)', ar: 'الاسم الأول (إنجليزي)', zh: '名字（英文）', ru: 'Имя (англ.)' })}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={kyc.firstNameEn || ''}
                    onChange={(e) => updateKyc({ firstNameEn: e.target.value })}
                    placeholder="John"
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام خانوادگی (انگلیسی)', en: 'Last Name (EN)', ar: 'اسم العائلة (إنجليزي)', zh: '姓氏（英文）', ru: 'Фамилия (англ.)' })}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={kyc.lastNameEn || ''}
                    onChange={(e) => updateKyc({ lastNameEn: e.target.value })}
                    placeholder="Smith"
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!firstFa.trim() || !lastFa.trim()) {
                    setError(lt(locale, { fa: 'نام و نام خانوادگی الزامی است', en: 'First and last name are required', ar: 'الاسم الأول والأخير مطلوبان', zh: '姓名和姓氏为必填项', ru: 'Имя и фамилия обязательны' }));
                    return;
                  }
                  setError('');
                  updateKyc({ 
                    firstNameFa, 
                    lastNameFa,
                    firstNameEn: kyc.firstNameEn || firstFa,
                    lastNameEn: kyc.lastNameEn || lastFa,
                  });
                  setKycStep('identity');
                }}
                className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {lt(locale, { fa: 'ادامه', en: 'Continue', ar: 'متابعة', zh: '继续', ru: 'Далее' })}
              </button>
            </div>
          </div>
        )}

        {/* Step: Basic Identity */}
        {step === 'identity' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <User size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('kycTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">{t('kycSubtitle')}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('firstName')}</label>
                <input
                  type="text"
                  value={firstFa}
                  onChange={(e) => setFirstFa(e.target.value)}
                  placeholder="علی"
                  className="w-full h-12 rounded-xl border border-line px-4 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('lastName')}</label>
                <input
                  type="text"
                  value={lastFa}
                  onChange={(e) => setLastFa(e.target.value)}
                  placeholder="محمدی"
                  className="w-full h-12 rounded-xl border border-line px-4 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('nationalId')}</label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="0012345678"
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                onClick={submitIdentity}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Passport Scan */}
        {step === 'passport_scan' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <ScanLine size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('passportTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">{t('passportSubtitle')}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div
                onClick={scanPassport}
                className="border-2 border-dashed border-line hover:border-brand rounded-2xl p-6 text-center cursor-pointer transition bg-soft/50 group"
              >
                <ScanLine size={32} className="mx-auto text-sub group-hover:text-brand mb-2" />
                <p className="font-bold text-xs text-ink">{t('scanPrompt')}</p>
                <p className="text-[11px] text-sub mt-1">{t('scanHint')}</p>
                {scanning && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-brand font-bold">
                    <Loader2 size={14} className="animate-spin" /> {t('scanning')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('passportNo')}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                  placeholder="EP1234567"
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('passportExpiry')}</label>
                <input
                  type="date"
                  dir="ltr"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                onClick={finishKyc}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t('finishKyc')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Approved */}
        {step === 'approved' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full grid place-items-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('approvedTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">{t('approvedSubtitle')}</p>
            <button
              onClick={() => router.push('/account')}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {t('goToAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
