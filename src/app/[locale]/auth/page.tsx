'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, User, Lock, LogIn, Mail, Phone, Send, MessageCircle, QrCode, MessageSquare } from 'lucide-react';
import { lt } from '@/lib/lt';
import { Logo } from '@/components/layout/Logo';
import { AuthChannel, requestOtp, getWeChatAuthUrl } from '@/actions/auth';
import type { TelegramAuthPayload } from '@/domains/events/providers/ProductionTelegramProvider';

export default function AuthPage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithPassword, loginWithTelegram, setKycStep, updateKyc, kyc, user } = useAuthStore();

  // Return the visitor to where they came from (checkout, my-trips, wallet…).
  // Only accept safe internal paths.
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/account';

  const [authMode, setAuthMode] = useState<'otp' | 'password'>(
    callbackUrl.includes('/admin') ? 'password' : 'otp'
  );
  const [password, setPassword] = useState('');
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
  const [countdown, setCountdown] = useState(120);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [isRealSent, setIsRealSent] = useState<boolean>(false);

  // Already signed-in users don't need the auth flow — send them on their way.
  useEffect(() => {
    if (kyc?.step === 'approved' && user) {
      router.push(callbackUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kyc?.step, user]);

  // Load official Telegram Login Widget dynamically if bot username is configured
  useEffect(() => {
    if (channel !== 'telegram') return;
    const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUser) return;

    (window as unknown as { onTelegramAuth?: (user: TelegramAuthPayload) => void }).onTelegramAuth = async (tgUser) => {
      setLoading(true);
      setError('');
      try {
        const res = await loginWithTelegram(tgUser);
        if (res.success) {
          router.push(callbackUrl);
        } else {
          setError(res.error || 'خطا در احراز هویت تلگرام');
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'خطا در احراز هویت تلگرام');
      } finally {
        setLoading(false);
      }
    };

    const container = document.getElementById('telegram-login-container');
    if (container && !container.hasChildNodes()) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUser);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '12');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.async = true;
      container.appendChild(script);
    }
  }, [channel, callbackUrl, loginWithTelegram, router]);

  const step = kyc?.step || 'phone';

  useEffect(() => {
    if (step !== 'otp') return;
    setCountdown(120);
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  function formatCountdown(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function toAsciiDigits(input: string): string {
    const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const a = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let res = input;
    for (let i = 0; i < 10; i++) {
      res = res.replaceAll(p[i], String(i)).replaceAll(a[i], String(i));
    }
    return res;
  }

  function validateIdentifier(): boolean {
    const normalized = toAsciiDigits(identifier).trim();
    if (channel === 'phone') {
      if (!/^09\d{9}$/.test(normalized) && !/^\+\d{10,14}$/.test(normalized)) {
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
        setError(lt(locale, { fa: 'شناسه وی‌چت (WeChat ID) یا شماره موبایل الزامی است', en: 'WeChat ID or mobile phone required', ar: 'معرف وي تشات أو الجوال مطلوب', zh: '微信号或绑定的手机号必填', ru: 'Введите WeChat ID یا телефон' }));
        return false;
      }
    } else if (channel === 'bale') {
      if (!identifier.trim() || identifier.length < 3) {
        setError(lt(locale, { fa: 'شناسه بله (@username) یا شماره موبایل را وارد کنید', en: 'Enter Bale username or phone', ar: 'أدخل معرّف بله أو الهاتف', zh: '请输入Bale用户名或手机号', ru: 'Введите имя пользователя Bale или номер' }));
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
      if (res.devCode) {
        setDevOtpCode(res.devCode);
        setOtp(res.devCode);
      } else {
        setDevOtpCode(null);
      }
      setIsRealSent(Boolean(res.realSent));
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

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError(lt(locale, { fa: 'شناسه کاربری و کلمه عبور را وارد نمایید', en: 'Identifier and password are required', ar: 'المعرف وكلمة المرور مطلوبان', zh: '用户名和密码必填', ru: 'Логин и пароль обязательны' }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await loginWithPassword(identifier.trim(), password.trim());
      if (!res.success) {
        setError(res.error || lt(locale, { fa: 'اطلاعات ورود اشتباه است', en: 'Invalid credentials', ar: 'بيانات الدخول غير صحيحة', zh: '登录信息无效', ru: 'Неверные учетные данные' }));
        return;
      }
      router.push(callbackUrl);
    } finally {
      setLoading(false);
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
    router.push(callbackUrl);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        {/* Step: Multi-channel identifier input or Staff Password Login */}
        {step === 'phone' && (
          <div>
            <div className="w-12 h-12 bg-mint rounded-2xl grid place-items-center text-brand-dark mb-6">
              <LogIn size={24} />
            </div>
            <h1 className="font-black text-2xl text-ink mb-2">
              {authMode === 'password' ? lt(locale, { fa: 'ورود سازمانی و مدیریت ERP', en: 'Staff & ERP Management Login', ar: 'تسجيل دخول الإدارة وERP', zh: '管理与ERP系统登录', ru: 'Вход для персонала и ERP' }) : t('loginTitle')}
            </h1>
            <p className="text-xs font-bold text-sub mb-4">
              {authMode === 'password' ? lt(locale, { fa: 'ورود با کلمه عبور اختصاصی مدیران و کارشناسان پشتیبانی', en: 'Sign in with administrator credentials for ERP access', ar: 'تسجيل الدخول ببيانات الإدارة للوصول إلى ERP', zh: '使用管理员凭据登录ERP工作台', ru: 'Вход с учетными данными администратора для доступа к ERP' }) : t('loginSubtitle')}
            </p>

            {/* Auth Mode Toggle: OTP vs Staff Password */}
            <div className="flex bg-soft p-1 rounded-2xl mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('otp'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-center transition ${authMode === 'otp' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'ورود با کد یک‌بار مصرف', en: 'One-Time Code (OTP)', ar: 'رمز لمرة واحدة', zh: '短信/邮箱验证码', ru: 'Одноразовый код' })}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('password'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-center transition ${authMode === 'password' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
              >
                {lt(locale, { fa: 'ورود با کلمه عبور (ERP)', en: 'Password Login (ERP)', ar: 'كلمة المرور (ERP)', zh: '密码登录 (ERP)', ru: 'Пароль (ERP)' })}
              </button>
            </div>

            {/* Google OAuth 2.0 Direct Sign In */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl })}
                className="w-full h-12 rounded-2xl border border-line bg-surface hover:bg-soft text-ink font-black text-xs flex items-center justify-center gap-3 transition shadow-2xs hover:shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{lt(locale, { fa: 'ورود مستقیم با حساب گوگل', en: 'Continue with Google', ar: 'تسجيل الدخول باستخدام جوجل', zh: '使用Google账号登录', ru: 'Продолжить с Google' })}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-line"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-sub">
                  {lt(locale, { fa: 'یا انتخاب کانال ورود', en: 'or select channel', ar: 'أو حدد القناة', zh: '或选择验证方式', ru: 'или выберите канал' })}
                </span>
                <div className="flex-grow border-t border-line"></div>
              </div>
            </div>

            {authMode === 'otp' ? (
              <>
                {/* Channels Switcher with Capability-Aware Badges (SITE-002) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-soft rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => { setChannel('phone'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'phone' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="SMS / Phone"
                  >
                    <Phone size={16} />
                    <span className="text-[10px]">SMS</span>
                    <span className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 rounded-full">LIVE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel('email'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'email' ? 'bg-surface text-brand shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="Email"
                  >
                    <Mail size={16} />
                    <span className="text-[10px]">Email</span>
                    <span className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 rounded-full">LIVE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel('telegram'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'telegram' ? 'bg-[#229ED9]/15 text-[#229ED9] shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="Telegram"
                  >
                    <Send size={16} />
                    <span className="text-[10px]">Telegram</span>
                    <span className="text-[8.5px] font-black text-sky-600 bg-sky-500/10 px-1.5 rounded-full">BETA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel('bale'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'bale' ? 'bg-[#00A693]/15 text-[#00A693] shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="Bale (پیام‌رسان بله)"
                  >
                    <MessageSquare size={16} />
                    <span className="text-[10px]">بله (Bale)</span>
                    <span className="text-[8.5px] font-black text-teal-600 bg-teal-500/10 px-1.5 rounded-full">BETA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel('whatsapp'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'whatsapp' ? 'bg-[#25D366]/15 text-[#25D366] shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="WhatsApp"
                  >
                    <MessageCircle size={16} />
                    <span className="text-[10px]">WhatsApp</span>
                    <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 rounded-full">BETA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel('wechat'); setError(''); setIdentifier(''); }}
                    className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition ${channel === 'wechat' ? 'bg-[#07C160]/15 text-[#07C160] shadow-xs' : 'text-sub hover:text-ink'}`}
                    title="WeChat"
                  >
                    <QrCode size={16} />
                    <span className="text-[10px]">WeChat</span>
                    <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 rounded-full">BETA</span>
                  </button>
                </div>

                {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

                {/* Telegram Login Widget Container */}
                {channel === 'telegram' && (
                  <div className="mb-4 p-3 bg-soft/60 rounded-2xl flex flex-col items-center justify-center gap-2 border border-line">
                    <span className="text-[11px] font-bold text-sub">
                      {lt(locale, { fa: 'ورود سریع از طریق ویجت رسمی تلگرام:', en: 'Quick login via official Telegram widget:', ar: 'تسجيل دخول سريع عبر تيليجرام:', zh: '通过Telegram官方组件快速登录：', ru: 'Быстрый вход через Telegram:' })}
                    </span>
                    <div id="telegram-login-container" className="my-1 min-h-[40px] flex items-center justify-center"></div>
                    <span className="text-[10px] text-sub/70">
                      {lt(locale, { fa: 'یا شماره موبایل / نام کاربری خود را برای دریافت کد وارد کنید:', en: 'or enter your handle / phone to receive verification code:', ar: 'أو أدخل المعرف لتلقي الرمز:', zh: '或输入用户名接收验证码：', ru: 'или введите имя пользователя:' })}
                    </span>
                  </div>
                )}

                {/* WeChat QR Connect Button */}
                {channel === 'wechat' && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await getWeChatAuthUrl(callbackUrl);
                        if (res.success && res.url) {
                          window.location.href = res.url;
                        } else {
                          setError(res.error || lt(locale, { fa: 'شناسه WECHAT_APP_ID روی سرور تنظیم نشده است', en: 'WECHAT_APP_ID is not configured', ar: 'WECHAT_APP_ID غير مكوّن', zh: '未配置WECHAT_APP_ID', ru: 'WECHAT_APP_ID не настроен' }));
                        }
                      }}
                      className="w-full h-11 rounded-xl bg-[#07C160]/10 hover:bg-[#07C160]/20 text-[#07C160] font-black text-xs transition flex items-center justify-center gap-2 border border-[#07C160]/30"
                    >
                      <QrCode size={16} />
                      <span>{lt(locale, { fa: 'اسکن بارکد در اپلیکیشن وی‌چت (WeChat QR)', en: 'WeChat Web QR Code Login', ar: 'مسح رمز الاستجابة السريعة في وي تشات', zh: '微信网页版扫码登录', ru: 'Вход через QR-код WeChat' })}</span>
                    </button>
                    <div className="text-center my-2 text-[10px] text-sub font-bold">
                      {lt(locale, { fa: 'یا دریافت کد از طریق شناسه وی‌چت / شماره موبایل:', en: 'or receive OTP code via WeChat ID / mobile:', ar: 'أو استلام الرمز عبر معرف وي تشات:', zh: '或通过微信号接收验证码：', ru: 'или получить код через WeChat ID:' })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="identifier" className="block text-xs font-bold text-sub mb-1">
                      {channel === 'phone' && lt(locale, { fa: 'شماره موبایل', en: 'Phone Number', ar: 'رقم الهاتف', zh: '手机号', ru: 'Номер телефона' })}
                      {channel === 'email' && lt(locale, { fa: 'آدرس ایمیل', en: 'Email Address', ar: 'البريد الإلكتروني', zh: '电子邮箱', ru: 'Эل. почта' })}
                      {channel === 'telegram' && lt(locale, { fa: 'شناسه تلگرام یا شماره', en: 'Telegram Username / Phone', ar: 'معرف تيليجرام أو الهاتف', zh: 'Telegram 用户名/手机号', ru: 'Telegram Username / Телефон' })}
                      {channel === 'bale' && lt(locale, { fa: 'شناسه بله یا شماره موبایل', en: 'Bale Username / Phone', ar: 'معرف بله أو الهاتف', zh: 'Bale 用户名/手机号', ru: 'Bale Username / Телефон' })}
                      {channel === 'whatsapp' && lt(locale, { fa: 'شماره واتساپ بین‌المللی', en: 'WhatsApp Number (+...)', ar: 'رقم الواتساب الدولي', zh: 'WhatsApp 国际号码', ru: 'Номер WhatsApp (+...)' })}
                      {channel === 'wechat' && lt(locale, { fa: 'شناسه وی‌چت / WeChat ID', en: 'WeChat ID / Mobile', ar: 'معرف وي تشات', zh: '微信号 / 手机号', ru: 'WeChat ID / Телефон' })}
                    </label>
                    <input
                      id="identifier"
                      type={channel === 'email' ? 'email' : 'text'}
                      dir="ltr"
                      value={identifier}
                      onChange={(e) => setIdentifier(toAsciiDigits(e.target.value))}
                      placeholder={
                        channel === 'phone' ? '09123456789' :
                        channel === 'email' ? 'user@firuzo.com' :
                        channel === 'telegram' ? '@traveler_user' :
                        channel === 'bale' ? '@bale_user or 0912...' :
                        channel === 'whatsapp' ? '+971501234567' :
                        'wxid_firuzo2026'
                      }
                      className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    {channel === 'bale' && (
                      <p className="text-[10px] text-sub mt-1 font-medium">
                        {lt(locale, {
                          fa: 'کد تایید ورود مستقیماً از طریق پیام‌رسان بله برای شما ارسال خواهد شد.',
                          en: 'Verification code will be sent to your Bale messenger account.',
                          ar: 'سيتم إرسال رمز التحقق مباشرة إلى حسابك في بله.',
                          zh: '验证码将直接发送至您的Bale账号。',
                          ru: 'Код подтверждения будет отправлен прямо в ваш аккаунт Bale.'
                        })}
                      </p>
                    )}
                    {channel === 'whatsapp' && (
                      <p className="text-[10px] text-sub mt-1 font-medium">
                        {lt(locale, {
                          fa: 'کد تایید مستقیماً به شماره واتساپ شما ارسال خواهد شد.',
                          en: 'Verification code will be sent directly to your WhatsApp.',
                          ar: 'سيتم إرسال رمز التحقق مباشرة إلى رقم واتساب الخاص بك.',
                          zh: '验证码将直接发送至您的WhatsApp。',
                          ru: 'Код подтверждения будет отправлен прямо в ваш WhatsApp.'
                        })}
                      </p>
                    )}
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
              </>
            ) : (
              /* Staff Password Login Form */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

                <div>
                  <label htmlFor="staff-identifier" className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'ایمیل سازمانی یا شماره همراه مدیر', en: 'Staff Email or Phone', ar: 'البريد الإلكتروني أو الهاتف للمسؤول', zh: '管理员邮箱或手机号', ru: 'Эл. почта или телефон администратора' })}
                  </label>
                  <input
                    id="staff-identifier"
                    type="text"
                    dir="ltr"
                    value={identifier}
                    onChange={(e) => setIdentifier(toAsciiDigits(e.target.value))}
                    placeholder="admin@firuzo.com"
                    autoComplete="username"
                    className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <div>
                  <label htmlFor="staff-password" className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'کلمه عبور', en: 'Password', ar: 'كلمة المرور', zh: '密码', ru: 'Пароль' })}
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-12 rounded-xl border border-line px-4 font-mono font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {lt(locale, { fa: 'ورود به پنل مدیریت ERP', en: 'Sign In to ERP Dashboard', ar: 'تسجيل الدخول إلى لوحة ERP', zh: '登录 ERP 控制台', ru: 'Войти в панель ERP' })}
                </button>

                <div className="pt-2 text-center text-xs text-sub">
                  <span className="opacity-80">
                    {lt(locale, {
                      fa: 'حساب پیش‌فرض مدیر: admin@firuzo.com',
                      en: 'Default Admin: admin@firuzo.com',
                      ar: 'الحساب الافتراضي: admin@firuzo.com',
                      zh: '默认管理员：admin@firuzo.com',
                      ru: 'Администратор по умолчанию: admin@firuzo.com',
                    })}
                  </span>
                </div>
              </form>
            )}
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

            {devOtpCode && (
              <div className="p-3.5 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-ink text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-amber-700 dark:text-amber-400">
                    {lt(locale, {
                      fa: '💡 حالت شبیه‌ساز (بدون توکن ربات/پیامک):',
                      en: '💡 Dev Simulator (No Bot/SMS token in .env):',
                      ar: '💡 وضع المحاكاة:',
                      zh: '💡 开发模拟模式：',
                      ru: '💡 Режим симулятора:'
                    })}
                  </span>
                  <span className="font-mono font-black text-sm bg-surface px-2 py-0.5 rounded-lg border border-amber-500/40 text-brand">
                    {devOtpCode}
                  </span>
                </div>
                <p className="text-[11px] text-sub leading-relaxed">
                  {lt(locale, {
                    fa: 'کد تایید در کادر زیر درج شد. پس از قرار دادن BALE_BOT_TOKEN یا TELEGRAM_BOT_TOKEN در فایل .env.local کدها به گوشی کاربر ارسال خواهند شد.',
                    en: 'Code is auto-filled below. Set BALE_BOT_TOKEN or TELEGRAM_BOT_TOKEN in .env.local to dispatch real messages to user devices.',
                    ar: 'تم ملء الرمز أدناه تلقائيًا.',
                    zh: '验证码已自动填充。配置Token后将真实发送到手机。',
                    ru: 'Код заполнен автоматически.'
                  })}
                </p>
              </div>
            )}

            {isRealSent && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>
                  {lt(locale, {
                    fa: 'کد تایید واقعی با موفقیت به پیام‌رسان یا شماره شما ارسال گردید.',
                    en: 'Verification code was dispatched successfully to your account/number.',
                    ar: 'تم إرسال رمز التحقق الفعلي بنجاح.',
                    zh: '验证码已成功发送到您的账号/手机。',
                    ru: 'Код подтверждения успешно отправлен на ваш аккаунт/номер.'
                  })}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-sub mb-1">{t('otpLabel')}</label>
                <input
                  id="password"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  className="w-full h-12 rounded-xl border border-line px-4 text-center tracking-widest text-2xl font-mono font-black text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
                />
                
                {/* Live Countdown / Resend Action */}
                <div className="mt-2.5 flex items-center justify-between text-xs font-bold">
                  {countdown > 0 ? (
                    <span className="text-sub flex items-center gap-1">
                      <span className="font-mono text-brand-dark font-black">{formatCountdown(countdown)}</span>
                      <span>{lt(locale, { fa: 'تا امکان ارسال مجدد کد', en: 'until resend code is available', ar: 'حتى إمكانية إعادة الإرسال', zh: '后可重新发送', ru: 'до повторной отправки' })}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={sending}
                      className="text-brand-dark font-black hover:underline"
                    >
                      {lt(locale, { fa: 'ارسال مجدد کد تأیید', en: 'Resend verification code', ar: 'إعادة إرسال الرمز', zh: '重新发送验证码', ru: 'Отправить код повторно' })}
                    </button>
                  )}
                  <span className="text-[11px] text-sub">
                    {lt(locale, { fa: 'کد ۶ رقمی', en: '6-digit code', ar: 'رمز من 6 أرقام', zh: '6位验证码', ru: '6-значный код' })}
                  </span>
                </div>
              </div>

              <button
                id="auth-verify-btn"
                onClick={verifyOtp}
                disabled={loading || otp.trim().length < 4}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {t('verifyOtp')}
              </button>

              <button
                onClick={() => setKycStep('phone')}
                className="w-full text-xs font-bold text-sub hover:text-ink text-center pt-1"
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
