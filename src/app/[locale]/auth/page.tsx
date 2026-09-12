'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { CheckCircle2, Loader2, Lock, LogIn, Mail, Phone, Send, MessageCircle, QrCode, MessageSquare } from 'lucide-react';
import { lt } from '@/lib/lt';
import { Logo } from '@/components/layout/Logo';
import { OtpPinInput } from '@/components/ui/OtpPinInput';
import { AuthChannel, requestOtp, getAuthCapabilities } from '@/actions/auth';
import type { TelegramAuthPayload } from '@/domains/events/providers/ProductionTelegramProvider';

interface AuthCapabilities {
  google: boolean;
  wechatQr: boolean;
  telegramWidget: boolean;
  telegramBot: boolean;
  whatsappLive: boolean;
  baleLive: boolean;
}

export default function AuthPage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithPassword, loginWithTelegram, setKycStep, kyc, user } = useAuthStore();

  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null);
  useEffect(() => {
    let mounted = true;
    getAuthCapabilities().then((caps) => {
      if (mounted) setCapabilities(caps);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Return the visitor to where they came from (checkout, my-trips, wallet…).
  // Only accept safe internal paths. Supports both callbackUrl and redirect parameters.
  const rawCallback = searchParams.get('callbackUrl') || searchParams.get('redirect');
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

  const [countdown, setCountdown] = useState(120);
  const [isRealSent, setIsRealSent] = useState<boolean>(false);
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

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
  }, [channel, callbackUrl, loginWithTelegram, router, setKycStep]);

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
      if (!/^\+?\d{8,15}$/.test(identifier.replace(/[\s-]/g, ''))) {
        setError(lt(locale, { fa: 'برای دریافت کد، شماره موبایل را وارد کنید (ورود اصلی WeChat از طریق QR است)', en: 'Enter your mobile number to receive the code (main WeChat login is via QR)', ar: 'أدخل رقم هاتفك لاستلام الرمز', zh: '请输入手机号以接收验证码', ru: 'Введите номер телефона для получения кода' }));
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
        if (res.error === 'WECHAT_QR_REQUIRED') {
          setError(
            lt(locale, {
              fa: 'ارسال کد به شناسه وی‌چت ممکن نیست؛ لطفاً از دکمه «اسکن بارکد WeChat» بالا استفاده کنید یا شماره موبایل خود را وارد کنید.',
              en: 'WeChat IDs cannot receive codes; please use the "WeChat QR" button above or enter your mobile number.',
              ar: 'لا يمكن إرسال الرمز إلى معرف وي تشات؛ استخدم زر QR أعلاه أو أدخل رقم هاتفك.',
              zh: '无法向微信号发送验证码；请使用上方的“微信扫码”按钮或输入手机号。',
              ru: 'Нельзя отправить код на WeChat ID; используйте кнопку QR выше или введите номер телефона.',
            })
          );
          return;
        }
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
      setOtp(''); // Require user to input the real code sent to their app
      setIsRealSent(Boolean(res.realSent));
      setDevCode(res.devCode);
      setKycStep('otp');
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      const ok = await login(identifier.trim(), otp.trim(), channel);
      if (!ok) {
        setError(lt(locale, { fa: 'کد تایید اشتباه یا منقضی شده است', en: 'Invalid or expired OTP code', ar: 'رمز التحقق غير صحيح أو منتهي الصلاحية', zh: '验证码错误或已过期', ru: 'Неверный или просроченный код' }));
        return;
      }
      router.push(callbackUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || lt(locale, { fa: 'خطا در احراز هویت', en: 'Authentication error', ar: 'خطأ في المصادقة', zh: '验证错误', ru: 'Ошибка проверки' }));
    } finally {
      setLoading(false);
    }
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

            {/* Google OAuth 2.0 Direct Sign In — only rendered when the upstream
                OAuth client is configured server-side (getAuthCapabilities) */}
            {capabilities?.google && (
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
            )}

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

                {/* Bale Messenger Guidance & Quick Start Link */}
                {channel === 'bale' && (
                  <div className="mb-4 p-3.5 bg-[#00A693]/10 border border-[#00A693]/30 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#00A693]">
                        {lt(locale, {
                          fa: 'بازوی رسمی فیروزو در بله (@firuzootpbot)',
                          en: 'Official Firuzo Bot in Bale (@firuzootpbot)',
                          ar: 'بوت فيروزو الرسمي في بله',
                          zh: 'Firuzo Bale官方机器人',
                          ru: 'Официальный бот Firuzo в Bale'
                        })}
                      </span>
                      <a
                        href="https://ble.ir/firuzootpbot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black bg-[#00A693] text-white px-2.5 py-1 rounded-xl shadow-xs hover:opacity-90 transition"
                      >
                        {lt(locale, { fa: 'باز کردن بازو در بله ↗', en: 'Open Bot ↗', ar: 'فتح البوت ↗', zh: '打开机器人 ↗', ru: 'Открыть бота ↗' })}
                      </a>
                    </div>
                    <p className="text-[11px] text-sub leading-relaxed">
                      {lt(locale, {
                        fa: 'برای دریافت آنی کد در بله، یک‌بار وارد بازو شده و دکمه «شروع» را بزنید؛ سپس شناسه بله یا شماره خود را در کادر زیر وارد کنید.',
                        en: 'Click Open Bot, hit Start once, then enter your Bale username, ID or phone below to receive your instant login code.',
                        ar: 'اضغط على فتح البوت واضغط على ابدأ مرة واحدة، ثم أدخل معرفك لتلقي الرمز.',
                        zh: '打开机器人点击启动一次，即可输入微信号接收验证码。',
                        ru: 'Откройте бота и нажмите Start, затем введите имя пользователя для получения кода.'
                      })}
                    </p>
                  </div>
                )}

                {/* Telegram Login Widget Container */}
                {channel === 'telegram' && capabilities?.telegramWidget && (
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

                {/* Telegram Bot Guidance — the Bot API can only message users who
                    opened the bot once, so guide them to Start before OTP by handle */}
                {channel === 'telegram' && (
                  <div className="mb-4 p-3.5 bg-[#229ED9]/10 border border-[#229ED9]/30 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#229ED9]">
                        {lt(locale, {
                          fa: 'بازوی رسمی فیروزو در تلگرام',
                          en: 'Official Firuzo Bot on Telegram',
                          ar: 'بوت فيروزو الرسمي في تيليجرام',
                          zh: 'Firuzo Telegram官方机器人',
                          ru: 'Официальный бот Firuzo в Telegram',
                        })}
                      </span>
                      {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && (
                        <a
                          href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-black bg-[#229ED9] text-white px-2.5 py-1 rounded-xl shadow-xs hover:opacity-90 transition"
                        >
                          {lt(locale, { fa: 'باز کردن ربات در تلگرام ↗', en: 'Open Bot ↗', ar: 'فتح البوت ↗', zh: '打开机器人 ↗', ru: 'Открыть бота ↗' })}
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-sub leading-relaxed">
                      {lt(locale, {
                        fa: 'تلگرام اجازه‌ی پیام خودکار به کاربرانِ بات را که یک‌بار Start نزده‌اند نمی‌دهد. برای دریافت سریع کد، ویجت بالای صفحه یا بازوی رسمی را باز کرده و «شروع» را بزنید.',
                        en: 'Telegram does not allow bots to message users who never pressed Start. Use the widget above or open the official bot and press Start to receive your code instantly.',
                        ar: 'لا يسمح تلجرام للبوتات بالمراسلة دون الضغط على ابدأ. استخدم الأداة أعلاه أو افتح البوت الرسمي واضغط ابدأ.',
                        zh: 'Telegram不允许机器人主动向未按Start的用户发消息。请使用上方组件或打开官方机器人并点击“启动”。',
                        ru: 'Telegram запрещает ботам писать пользователям без нажатия Start. Используйте виджет выше или откройте бота и нажмите Start.',
                      })}
                    </p>
                  </div>
                )}

                {/* WeChat QR Login — native NextAuth OAuth flow (WebsiteApp QR on
                    desktop, OfficialAccount authorize inside the WeChat browser) */}
                {channel === 'wechat' && (
                  <div className="mb-4">
                    {capabilities?.wechatQr ? (
                      <button
                        type="button"
                        onClick={() => {
                          const isWeChatBrowser = /MicroMessenger/i.test(
                            typeof navigator !== 'undefined' ? navigator.userAgent : ''
                          );
                          signIn(isWeChatBrowser ? 'wechat_mp' : 'wechat', { callbackUrl });
                        }}
                        className="w-full h-11 rounded-xl bg-[#07C160]/10 hover:bg-[#07C160]/20 text-[#07C160] font-black text-xs transition flex items-center justify-center gap-2 border border-[#07C160]/30 active:scale-[0.98]"
                      >
                        <QrCode size={16} />
                        <span>{lt(locale, { fa: 'اسکن بارکد در اپلیکیشن وی‌چت (WeChat QR)', en: 'WeChat Web QR Code Login', ar: 'مسح رمز الاستجابة السريعة في وي تشات', zh: '微信网页版扫码登录', ru: 'Вход через QR-код WeChat' })}</span>
                      </button>
                    ) : (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                        {lt(locale, {
                          fa: 'ورود QR وی‌چت هنوز فعال نشده است (نیاز به WECHAT_APP_ID و WECHAT_APP_SECRET روی سرور). موقتاً با شماره موبایل وارد شوید.',
                          en: 'WeChat QR login is not enabled yet (WECHAT_APP_ID / WECHAT_APP_SECRET required on the server). Please use your phone number for now.',
                          ar: 'لم يتم تنشيط تسجيل الدخول عبر QR في وي تشات بعد. الرجاء استخدام رقم الهاتف.',
                          zh: '微信扫码登录尚未启用，请暂时使用手机号登录。',
                          ru: 'Вход по QR-коду WeChat пока не активирован. Используйте номер телефона.',
                        })}
                      </div>
                    )}
                    <div className="text-center my-2 text-[10px] text-sub font-bold">
                      {lt(locale, { fa: 'یا دریافت کد از طریق شماره موبایل:', en: 'or receive OTP code via mobile number:', ar: 'أو استلام الرمز عبر رقم الهاتف:', zh: '或通过手机号接收验证码：', ru: 'или получить код по телефону:' })}
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
                      {channel === 'wechat' && lt(locale, { fa: 'شماره موبایل متصل به WeChat', en: 'Mobile Number (WeChat channel)', ar: 'رقم الجوال (قناة وي تشات)', zh: '手机号 (WeChat 通道)', ru: 'Номер телефона (канал WeChat)' })}
                    </label>
                    <input
                      id="identifier"
                      type={channel === 'email' ? 'email' : channel === 'phone' ? 'tel' : 'text'}
                      dir="ltr"
                      inputMode={channel === 'phone' ? 'tel' : channel === 'email' ? 'email' : 'text'}
                      autoComplete={channel === 'phone' ? 'tel' : channel === 'email' ? 'email' : 'username'}
                      value={identifier}
                      onChange={(e) => setIdentifier(toAsciiDigits(e.target.value))}
                      placeholder={
                        channel === 'phone' ? '09123456789' :
                        channel === 'email' ? 'user@firuzo.com' :
                        channel === 'telegram' ? '@traveler_user' :
                        channel === 'bale' ? '@bale_user or 0912...' :
                        channel === 'whatsapp' ? '+971501234567' :
                        '+8613800138000'
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

            {isRealSent ? (
              <div className="p-3.5 mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <span>
                  {channel === 'phone'
                    ? lt(locale, {
                        fa: 'کد ۴ رقمی از طریق پیامک برای شما ارسال شد. لطفاً آن را وارد کنید.',
                        en: '4-digit verification code has been sent via SMS. Please enter it below.',
                        ar: 'تم إرسال رمز التحقق المكون من 4 أرقام عبر الرسائل القصيرة.',
                        zh: '4位验证码已通过短信发送，请在下方输入。',
                        ru: '4-значный код подтверждения отправлен по SMS. Пожалуйста, введите его ниже.'
                      })
                    : lt(locale, {
                        fa: 'کد تأیید به حساب شما ارسال گردید. لطفاً آن را در کادر زیر وارد کنید.',
                        en: 'Verification code has been dispatched. Please enter it in the box below.',
                        ar: 'تم إرسال رمز التحقق إلى حسابك. يرجى إدخاله في المربع أدناه.',
                        zh: '验证码已发送至您的账号，请在下方输入。',
                        ru: 'Код подтверждения отправлен. Пожалуйста, введите его ниже.'
                      })}
                </span>
              </div>
            ) : devCode ? (
              <div className="p-3.5 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-2.5">
                <span>{lt(locale, { fa: `کد دسترسی موقت: ${devCode}`, en: `Verification Code: ${devCode}` , ar: `رمز الدخول المؤقت: ${devCode}`, zh: `临时验证码：${devCode}`, ru: `Временный код доступа: ${devCode}`})}</span>
                <button
                  type="button"
                  onClick={() => setOtp(devCode)}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] transition cursor-pointer"
                >
                  {lt(locale, { fa: 'درج خودکار', en: 'Auto-fill', ar: 'إدراج تلقائي', zh: '自动填入', ru: 'Вставить автоматически'})}
                </button>
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-sub mb-3 text-center">
                  {channel === 'phone'
                    ? lt(locale, { fa: 'کد ۴ رقمی پیامک‌شده را وارد کنید', en: 'Enter the 4-digit SMS code', ar: 'أدخل رمز التحقق المكون من 4 أرقام', zh: '请输入4位短信验证码', ru: 'Введите 4-значный код из SMS' })
                    : t('otpLabel')}
                </label>

                {/* 4-digit PIN Boxes for Phone, or 6-digit for other channels */}
                <div className="my-2">
                  <OtpPinInput
                    length={channel === 'phone' ? 4 : 6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (error) setError('');
                    }}
                    onComplete={() => {
                      // Automatically trigger verify when all 4 digits are filled
                      setTimeout(() => {
                        const btn = document.getElementById('auth-verify-btn');
                        btn?.click();
                      }, 100);
                    }}
                    disabled={loading}
                    autoFocus={true}
                  />
                </div>
                
                {/* Live Countdown / Resend Action */}
                <div className="mt-4 flex items-center justify-between text-xs font-bold px-1">
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
                  <span className="text-[11px] font-bold text-sub/80">
                    {channel === 'phone'
                      ? lt(locale, { fa: 'کد ۴ رقمی', en: '4-digit code', ar: 'رمز من 4 أرقام', zh: '4位验证码', ru: '4-значный код' })
                      : lt(locale, { fa: 'کد ۶ رقمی', en: '6-digit code', ar: 'رمز من 6 أرقام', zh: '6位验证码', ru: '6-значный код' })}
                  </span>
                </div>
              </div>

              <button
                id="auth-verify-btn"
                onClick={verifyOtp}
                disabled={loading || otp.trim().length < (channel === 'phone' ? 4 : 6)}
                className="w-full h-12 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-sm transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 shadow-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {t('verifyOtp')}
              </button>

              <button
                onClick={() => setKycStep('phone')}
                className="w-full text-xs font-bold text-sub hover:text-ink text-center pt-1"
              >
                {lt(locale, { fa: 'تغییر روش یا شماره موبایل', en: 'Change method or phone number', ar: 'تغيير الطريقة أو رقم الهاتف', zh: '更换手机号或登录方式', ru: 'Изменить номер или способ' })}
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
