'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, User, Lock, LogIn, Mail, Phone, Send, MessageCircle, QrCode } from 'lucide-react';
import { lt } from '@/lib/lt';
import { Logo } from '@/components/layout/Logo';
import { AuthChannel, requestOtp } from '@/actions/auth';

export default function AuthPage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setKycStep, updateKyc, kyc, user } = useAuthStore();

  // Return the visitor to where they came from (checkout, my-trips, wallet…).
  // Only accept safe internal paths.
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/account';

  // Already signed-in users don't need the auth flow — send them on their way.
  useEffect(() => {
    if (kyc?.step === 'approved' && user) {
      router.push(callbackUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kyc?.step, user]);

  const [channel, setChannel] = useState<AuthChannel>('phone');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [firstFa, setFirstFa] = useState(kyc?.firstNameFa || '');
  const [lastFa, setLastFa] = useState(kyc?.lastNameFa || '');
  const [nationalId, setNationalId] = useState(kyc?.nationalId || '');
  const [scanning, setScanning] = useState(false);
  const [passportNo, setPassportNo] = useState(kyc?.passportNo || '');
  const [expiry, setExpiry] = useState(kyc?.passportExpiry || '');

  const step = kyc?.step || 'phone';

  function validateIdentifier(): boolean {
    if (channel === 'phone') {
      if (!/^09\d{9}$/.test(identifier) && !/^\+\d{10,14}$/.test(identifier)) {
        setError(lt(locale, { fa: 'شماره موبایل معتبر نیست (۰۹xxxxxxxxx یا کد کشور)', en: 'Invalid phone number (09xxxxxxxxx or +...)', ar: 'رقم جوال غير صالح', zh: '手机号格式错误', ru: 'Неверный номер телефона' }));
        return false;
      }
    } else if (channel === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        setError(lt(locale, { fa: 'آدرس ایمیل معتبر نیست', en: 'Invalid email address', ar: 'عنوان بريد إلكتروني غير صالح', zh: '邮箱格式错误', ru: 'Неверный адрес эл. почты' }));
        return false;
      }
    } else if (channel === 'telegram') {
      if (!identifier.trim() || identifier.length < 3) {
        setError(lt(locale, { fa: 'شناسه تلگرام یا شماره موبایل را وارد کنید', en: 'Enter Telegram handle (@username) or phone', ar: 'أدخل معرّف تيليجرام أو الهاتف', zh: '请输入Telegram用户名或手机号', ru: 'Введите имя пользователя или номер' }));
        return false;
      }
    } else if (channel === 'whatsapp') {
      if (!/^\+?\d{9,15}$/.test(identifier.replace(/\s+/g, ''))) {
        setError(lt(locale, { fa: 'شماره واتساپ همراه با پیش‌شماره کشور الزامی است', en: 'Valid WhatsApp number with country code is required', ar: 'رقم واتساب صالح مع رمز الدولة مطلوب', zh: '请输入带国家代码的WhatsApp号码', ru: 'Введите номер WhatsApp с кодом страны' }));
        return false;
      }
    } else if (channel === 'wechat') {
      if (!identifier.trim()) {
        setError(lt(locale, { fa: 'شناسه وی‌چت (WeChat ID) یا شماره موبایل الزامی است', en: 'WeChat ID or mobile phone required', ar: 'معرف وي تشات أو الجوال مطلوب', zh: '微信号或绑定的手机号必填', ru: 'Введите WeChat ID или телефон' }));
        return false;
      }
    }
    return true;
  }

  async function sendOtp() {
    if (!validateIdentifier()) return;
    setError('');
    setSending(true);
    try {
      const res = await requestOtp({ identifier: identifier.trim(), channel });
      if (!res.success) {
        setError(
          res.error
            ? lt(locale, {
                fa: 'ارسال کد ناموفق بود: ' + res.error,
                en: 'Could not send the code: ' + res.error,
                ar: 'فشل إرسال الرمز: ' + res.error,
                zh: '验证码发送失败：' + res.error,
                ru: 'Не удалось отправить код: ' + res.error,
              })
            : lt(locale, { fa: 'ارسال کد ناموفق بود', en: 'Could not send the code', ar: 'فشل إرسال الرمز', zh: '发送失败', ru: 'Ошибка отправки' })
        );
        return;
      }
      setKycStep('otp');
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError('');
    const ok = await login(identifier, otp, channel);
    setLoading(false);
    if (!ok) {
      setError(lt(locale, { fa: 'کد تایید اشتباه است', en: 'Invalid OTP code', ar: 'رمز التحقق غير صحيح', zh: '验证码错误', ru: 'Неверный код подтверждения' }));
      return;
    }
    router.push(callbackUrl);
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
    router.push(callbackUrl);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        {/* Step: Multi-channel identifier input */}
        {step === 'phone' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <LogIn size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('loginTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-4">{t('loginSubtitle')}</p>

            {/* Channels Switcher */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-soft rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setChannel('phone'); setError(''); setIdentifier(''); }}
                className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition ${channel === 'phone' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
                title="SMS / Phone"
              >
                <Phone size={16} />
                <span className="text-[10px]">SMS</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannel('email'); setError(''); setIdentifier(''); }}
                className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition ${channel === 'email' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
                title="Email"
              >
                <Mail size={16} />
                <span className="text-[10px]">Email</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannel('telegram'); setError(''); setIdentifier(''); }}
                className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition ${channel === 'telegram' ? 'bg-[#229ED9]/15 text-[#229ED9] shadow-xs' : 'text-sub hover:text-ink'}`}
                title="Telegram"
              >
                <Send size={16} />
                <span className="text-[10px]">Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannel('whatsapp'); setError(''); setIdentifier(''); }}
                className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition ${channel === 'whatsapp' ? 'bg-[#25D366]/15 text-[#25D366] shadow-xs' : 'text-sub hover:text-ink'}`}
                title="WhatsApp"
              >
                <MessageCircle size={16} />
                <span className="text-[10px]">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannel('wechat'); setError(''); setIdentifier(''); }}
                className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition ${channel === 'wechat' ? 'bg-[#07C160]/15 text-[#07C160] shadow-xs' : 'text-sub hover:text-ink'}`}
                title="WeChat"
              >
                <QrCode size={16} />
                <span className="text-[10px]">WeChat</span>
              </button>
            </div>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-xs font-bold text-sub mb-1">
                  {channel === 'phone' && lt(locale, { fa: 'شماره موبایل', en: 'Phone Number', ar: 'رقم الهاتف', zh: '手机号', ru: 'Номер телефона' })}
                  {channel === 'email' && lt(locale, { fa: 'آدرس ایمیل', en: 'Email Address', ar: 'البريد الإلكتروني', zh: '电子邮箱', ru: 'Эл. почта' })}
                  {channel === 'telegram' && lt(locale, { fa: 'شناسه تلگرام یا شماره', en: 'Telegram Username / Phone', ar: 'معرف تيليجرام أو الهاتف', zh: 'Telegram 用户名/手机号', ru: 'Telegram Username / Телефон' })}
                  {channel === 'whatsapp' && lt(locale, { fa: 'شماره واتساپ بین‌المللی', en: 'WhatsApp Number (+...)', ar: 'رقم الواتساب الدولي', zh: 'WhatsApp 国际号码', ru: 'Номер WhatsApp (+...)' })}
                  {channel === 'wechat' && lt(locale, { fa: 'شناسه وی‌چت / WeChat ID', en: 'WeChat ID / Mobile', ar: 'معرف وي تشات', zh: '微信号 / 手机号', ru: 'WeChat ID / Телефон' })}
                </label>
                <input
                  id="identifier"
                  type={channel === 'email' ? 'email' : 'text'}
                  dir="ltr"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    channel === 'phone' ? '09123456789' :
                    channel === 'email' ? 'user@firuzo.com' :
                    channel === 'telegram' ? '@traveler_user' :
                    channel === 'whatsapp' ? '+971501234567' :
                    'wxid_firuzo2026'
                  }
                  className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <button
                id="auth-submit-btn"
                onClick={sendOtp}
                disabled={sending}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
              >
                {sending && <Loader2 size={16} className="animate-spin" />}
                {channel === 'phone' ? t('sendOtp') : lt(locale, { fa: 'دریافت کد تأیید ورود', en: 'Send Login Code', ar: 'إرسال رمز الدخول', zh: '发送登录验证码', ru: 'Получить код входа' })}
              </button>
            </div>
          </div>
        )}

        {/* Step: OTP Verification */}
        {step === 'otp' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <Lock size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">{t('otpTitle')}</h1>
            <p className="text-xs font-bold text-sub mb-6">
              {lt(locale, { fa: `کد یک‌بار مصرف ارسال شده به ${identifier} را وارد کنید`, en: `Enter the one-time code sent to ${identifier}`, ar: `أدخل الرمز المرسل إلى ${identifier}`, zh: `请输入发送至 ${identifier} 的验证码`, ru: `Введите код, отправленный на ${identifier}` })}
            </p>

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
                  placeholder="••••••"
                  className="w-full h-12 rounded-xl border border-line px-4 text-center tracking-widest text-xl font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <p className="text-[11px] text-sub mt-1 text-center font-bold">{lt(locale, { fa: 'کد تأیید پیامک/ایمیل شد', en: 'The code was sent to you', ar: 'تم إرسال الرمز إليك', zh: '验证码已发送', ru: 'Код отправлен вам' })}</p>
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
                {lt(locale, { fa: 'تغییر روش یا شناسه ورود', en: 'Change method or identifier', ar: 'تغيير الطريقة أو المعرّف', zh: '更换登录方式或账号', ru: 'Изменить метод или идентификатор' })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام', en: 'First Name', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' })}</label>
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

              <button
                onClick={() => {
                  if (!firstFa.trim() || !lastFa.trim()) {
                    setError(lt(locale, { fa: 'نام و نام خانوادگی الزامی است', en: 'First and last name are required', ar: 'الاسم الأول والأخير مطلوبان', zh: '姓名和姓氏为必填项', ru: 'Имя и фамилия обязательны' }));
                    return;
                  }
                  setError('');
                  updateKyc({ 
                    firstNameFa: firstFa, 
                    lastNameFa: lastFa,
                    firstNameEn: kyc.firstNameEn || firstFa,
                    lastNameEn: kyc.lastNameEn || lastFa,
                  });
                  router.push(callbackUrl);
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
                  placeholder={lt(locale, { fa: 'علی', en: 'Ali', ar: 'علي', zh: 'Ali', ru: 'Али' })}
                  className="w-full h-12 rounded-xl border border-line px-4 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{t('lastName')}</label>
                <input
                  type="text"
                  value={lastFa}
                  onChange={(e) => setLastFa(e.target.value)}
                  placeholder={lt(locale, { fa: 'محمدی', en: 'Mohammadi', ar: 'محمدي', zh: 'Mohammadi', ru: 'Мохаммади' })}
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
              onClick={() => router.push(callbackUrl)}
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
