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
  const [authMode, setAuthMode] = useState<'phone' | 'admin'>('phone');
  const [adminEmail, setAdminEmail] = useState('admin@firuzo.com');
  const [adminPassword, setAdminPassword] = useState('demo');

  const [firstFa, setFirstFa] = useState(kyc.firstNameFa || '');
  const [lastFa, setLastFa] = useState(kyc.lastNameFa || '');
  const [nationalId, setNationalId] = useState(kyc.nationalId || '');
  const [scanning, setScanning] = useState(false);
  const [passportNo, setPassportNo] = useState(kyc.passportNo || '');
  const [expiry, setExpiry] = useState(kyc.passportExpiry || '');

  const step = kyc.step;

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { signIn } = await import('next-auth/react');
      const searchParams = new URLSearchParams(window.location.search);
      const rawCallback = searchParams.get('callbackUrl');
      // Decode and ensure locale prefix
      let target = rawCallback ? decodeURIComponent(rawCallback) : `/${locale}/admin`;
      if (!target.match(/^\/(fa|en|ar|zh|ru)\//)) {
        target = `/${locale}${target.startsWith('/') ? target : '/' + target}`;
      }

      const res = await signIn('credentials', {
        redirect: false,
        email: adminEmail,
        password: adminPassword,
      });

      setLoading(false);
      if (res?.error) {
        setError(lt(locale, {
          fa: 'ایمیل یا رمز عبور نامعتبر است',
          en: 'Invalid email or password',
          ar: 'البريد الإلكتروني أو كلمة المرور غير صالحة',
          zh: '电子邮件或密码无效',
          ru: 'Неверный адрес электронной почты или пароль'
        }));
      } else {
        window.location.href = target;
      }
    } catch (err) {
      setLoading(false);
      setError('An unexpected error occurred');
    }
  }

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

    // For V1 Demo purposes, if password is "demo" bypass API and use Zustand
    if (otp === 'demo' || otp === '1234' || otp === '0000') {
      const ok = await login(phone, otp);
      setLoading(false);
      if (ok) {
         window.location.href = `/${locale}/account`;
         return;
      }
    }
    
    // Otherwise use NextAuth API endpoint
    try {
      const { signIn } = await import('next-auth/react');
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl') || `/${locale}/account`;

      const result = await signIn('credentials', {
        redirect: false,
        email: phone, // using email field for phone in mock provider
        password: otp
      });
      
      setLoading(false);
      if (result?.error) {
         setError(lt(locale, { fa: 'کد وارد شده معتبر نیست', en: 'Invalid OTP code', ar: 'الرمز المدخل غير صالح', zh: '无效的验证码', ru: 'Неверный код OTP' }));
      } else {
         window.location.href = callbackUrl.startsWith('/') ? callbackUrl : `/${locale}${callbackUrl}`;
      }
    } catch (e) {
      setLoading(false);
      setError('An error occurred');
    }
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
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        {/* Tab switch between Mobile OTP and ERP Admin Login */}
        <div className="flex bg-soft p-1 rounded-2xl mb-6 border border-line">
          <button
            type="button"
            onClick={() => { setAuthMode('phone'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'phone' ? 'bg-surface text-brand shadow-sm' : 'text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'ورود مسافر (موبایل)', en: 'Passenger Login', ar: 'دخول المسافر', zh: '旅客登录', ru: 'Вход для пассажиров' })}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('admin'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'admin' ? 'bg-surface text-brand shadow-sm' : 'text-sub hover:text-ink'}`}
          >
            {lt(locale, { fa: 'ورود مدیر / ERP', en: 'Staff / ERP Portal', ar: 'بوابة الإدارة', zh: '管理入口', ru: 'Вход для персонала' })}
          </button>
        </div>

        {/* Admin Direct Login Form */}
        {authMode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-4">
              <User size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-1">
              {lt(locale, { fa: 'ورود به پنل مدیریت ERP', en: 'ERP Staff Login', ar: 'تسجيل دخول الإدارة', zh: 'ERP管理员登录', ru: 'Вход в панель ERP' })}
            </h1>
            <p className="text-xs font-bold text-sub mb-4">
              {lt(locale, { fa: 'دسترسی ادمین، مالی و عملیات', en: 'Access Super Admin, Finance, and Ops Hubs', ar: 'الوصول إلى الإدارة والمالية والعمليات', zh: '访问管理、财务与运营中心', ru: 'Доступ к панели управления' })}
            </p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div>
              <label className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'ایمیل پرسنلی', en: 'Staff Email', ar: 'البريد الإلكتروني', zh: '员工邮箱', ru: 'Email' })}
              </label>
              <input
                type="email"
                dir="ltr"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@firuzo.com"
                className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'رمز عبور', en: 'Password', ar: 'كلمة المرور', zh: '密码', ru: 'Пароль' })}
              </label>
              <input
                type="password"
                dir="ltr"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••"
                className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <p className="text-[11px] text-sub mt-1 font-bold">اکانت تستی: admin@firuzo.com / demo</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {lt(locale, { fa: 'ورود به سامانه ERP', en: 'Sign in to ERP', ar: 'دخول النظام', zh: '登录ERP系统', ru: 'Войти в ERP' })}
            </button>
          </form>
        )}

        {/* Step: Phone input */}
        {authMode === 'phone' && step === 'phone' && (
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
            <h1 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'تایید شماره', en: 'Verify Number', ar: 'تأكيد الرقم', zh: '验证号码', ru: 'Подтвердите номер' })}</h1>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'کد تایید ارسال شد به', en: 'Verification code sent to', ar: 'تم إرسال رمز التحقق إلى', zh: '验证码已发送至', ru: 'Код подтверждения отправлен на' })} {phone}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-xs font-bold text-sub mb-1">{t('otpLabel')}</label>
                <input
                  id="otp"
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
                {lt(locale, { fa: 'تغییر شماره', en: 'Change Number', ar: 'تغيير الرقم', zh: '更改号码', ru: 'Изменить номер' })}
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
            <h1 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'اطلاعات هویتی', en: 'Identity Information', ar: 'معلومات الهوية', zh: '身份信息', ru: 'Информация об идентификации' })}</h1>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'لطفا اطلاعات خود را وارد کنید', en: 'Please enter your information', ar: 'يرجى إدخال معلوماتك', zh: '请输入您的信息', ru: 'Пожалуйста, введите свою информацию' })}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام', en: 'First Name', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' })}</label>
                <input
                  type="text"
                  value={firstFa}
                  onChange={(e) => setFirstFa(e.target.value)}
                  placeholder="علی"
                  className="w-full h-12 rounded-xl border border-line px-4 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام خانوادگی', en: 'Last Name', ar: 'اسم العائلة', zh: '姓氏', ru: 'Фамилия' })}</label>
                <input
                  type="text"
                  value={lastFa}
                  onChange={(e) => setLastFa(e.target.value)}
                  placeholder="محمدی"
                  className="w-full h-12 rounded-xl border border-line px-4 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'کد ملی', en: 'National ID', ar: 'الرقم الوطني', zh: '身份证号', ru: 'Национальный ID' })}</label>
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
                {lt(locale, { fa: 'ادامه', en: 'Continue', ar: 'متابعة', zh: '继续', ru: 'Продолжить' })}
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
            <h1 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'اسکن پاسپورت', en: 'Passport Scan', ar: 'مسح جواز السفر', zh: '护照扫描', ru: 'Сканирование паспорта' })}</h1>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'اطلاعات پاسپورت خود را وارد یا اسکن کنید', en: 'Enter or scan your passport details', ar: 'أدخل أو امسح بيانات جواز السفر', zh: '输入或扫描您的护照信息', ru: 'Введите или отсканируйте паспортные данные' })}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div
                onClick={scanPassport}
                className="border-2 border-dashed border-line hover:border-brand rounded-2xl p-6 text-center cursor-pointer transition bg-soft/50 group"
              >
                <ScanLine size={32} className="mx-auto text-sub group-hover:text-brand mb-2" />
                <p className="font-bold text-xs text-ink">{lt(locale, { fa: 'برای اسکن کلیک کنید', en: 'Click to scan', ar: 'انقر للمسح', zh: '点击扫描', ru: 'Нажмите для сканирования' })}</p>
                <p className="text-[11px] text-sub mt-1">{lt(locale, { fa: 'دوربین گوشی شما پاسپورت را میخواند', en: 'Your phone camera will read the passport', ar: 'ستقرأ كاميرا هاتفك جواز السفر', zh: '手机摄像头将读取护照', ru: 'Камера телефона прочитает паспорт' })}</p>
                {scanning && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-brand font-bold">
                    <Loader2 size={14} className="animate-spin" /> {lt(locale, { fa: 'در حال اسکن...', en: 'Scanning...', ar: 'جاري المسح...', zh: '扫描中...', ru: 'Сканирование...' })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}</label>
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
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'تاریخ انقضا', en: 'Expiry Date', ar: 'تاريخ الانتهاء', zh: '到期日', ru: 'Дата истечения' })}</label>
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
                {lt(locale, { fa: 'اتمام و ورود', en: 'Complete & Enter Account', ar: 'إتمام', zh: '完成并进入帐户', ru: 'Завершить и войти' })}
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
            <h1 className="font-black text-2xl text-ink mb-2">{lt(locale, { fa: 'تایید شد', en: 'Verified', ar: 'تم التحقق', zh: '已验证', ru: 'Проверено' })}</h1>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'اطلاعات شما با موفقیت تایید شد.', en: 'Your information has been successfully verified.', ar: 'تم التحقق من معلوماتك بنجاح.', zh: '您的信息已成功验证。', ru: 'Ваша информация была успешно проверена.' })}</p>
            <button
              onClick={() => { window.location.href = `/${locale}/account`; }}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {lt(locale, { fa: 'ورود به حساب کاربری', en: 'Go to Account', ar: 'الذهاب إلى الحساب', zh: '转到帐户', ru: 'Перейти в учетную запись' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
