'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Download,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Lock,
  WifiOff,
  CreditCard,
  Languages,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { LATEST_MOBILE_RELEASE } from '@/app/api/download/apk/route';

type DetectedPlatform = 'android' | 'ios' | 'desktop';

export default function AppDownloadPage() {
  const locale = useLocale();
  const [platform, setPlatform] = useState<DetectedPlatform>('desktop');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    // 1. Detect user platform
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) {
      setPlatform('android');
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else {
      setPlatform('desktop');
    }

    // 2. Generate canonical QR code pointing to public download page
    const publicUrl = `https://itrip-platform.vercel.app/${locale}/app`;
    void QRCode.toDataURL(publicUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    }).then(setQrCodeDataUrl);
  }, [locale]);

  const copyChecksum = () => {
    navigator.clipboard.writeText(LATEST_MOBILE_RELEASE.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isRtl = locale === 'fa' || locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span>{lt(locale, { fa: 'نسخه رسمی و امضاشده v0.2.0', en: 'Official Verified Release v0.2.0', ar: 'النسخة الرسمية المعتمدة v0.2.0', zh: '官方已验证版本 v0.2.0', ru: 'Официальный релиз v0.2.0' })}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {lt(locale, {
                fa: 'همراه هوشمند و گاوصندوق دیجیتال سفر iTRIP',
                en: 'iTRIP Mobile: Smart Companion & Digital Travel Vault',
                ar: 'تطبيق iTRIP: الرفيق الذكي وخزنة السفر الرقمية',
                zh: 'iTRIP 手机应用：您的智能旅行伴侣与数字保险库',
                ru: 'iTRIP Mobile: Умный спутник и цифровой сейф путешественника',
              })}
            </h1>

            <p className="text-base sm:text-lg text-teal-100/90 leading-relaxed font-normal">
              {lt(locale, {
                fa: 'دسترسی آفلاین دائمی به بلیت‌های پرواز، کارت آدرس فارسی برای رانندگان تاکسی، کیف پول NewCash و اتصال به شتاب.',
                en: 'Guaranteed offline access to flight passes, Persian taxi cards, NewCash tourist wallet, and airport QR barcodes.',
                ar: 'وصول دائم ودون إنترنت إلى تذاكر الطيران، وبطاقة التاكسي الفارسية، ومحفظة NewCash السياحية.',
                zh: '离线访问航班机票、出租车波斯语地址卡、NewCash 旅游钱包及机场扫码登机牌。',
                ru: 'Постоянный офлайн-доступ к авиабилетам, карточке отеля для такси, кошельку NewCash и QR-кодам аэропорта.',
              })}
            </p>

            {/* Smart Download Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href={LATEST_MOBILE_RELEASE.downloadUrl}
                download={LATEST_MOBILE_RELEASE.apkName}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
              >
                <Download className="w-5 h-5" />
                <span>
                  {lt(locale, {
                    fa: `دانلود مستقیم فایل APK (${LATEST_MOBILE_RELEASE.approximateSizeMb})`,
                    en: `Download APK Directly (${LATEST_MOBILE_RELEASE.approximateSizeMb})`,
                    ar: `تحميل ملف APK مباشرة (${LATEST_MOBILE_RELEASE.approximateSizeMb})`,
                    zh: `直接下载 APK (${LATEST_MOBILE_RELEASE.approximateSizeMb})`,
                    ru: `Скачать APK напрямую (${LATEST_MOBILE_RELEASE.approximateSizeMb})`,
                  })}
                </span>
              </a>

              <a
                href="https://github.com/ali39999-hue/itrip-mobile/releases/tag/v0.2.0"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all text-center"
              >
                <span>{lt(locale, { fa: 'مشاهده در GitHub Releases', en: 'View on GitHub Releases', ar: 'عرض في GitHub Releases', zh: '在 GitHub Releases 查看', ru: 'Релиз на GitHub' })}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Device-Specific Banner */}
            {platform === 'ios' && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {lt(locale, {
                    fa: 'نسخه iOS از طریق TestFlight و اپ استور به زودی منتشر می‌شود. کاربران اندروید می‌توانند هم‌اکنون APK را دانلود کنند.',
                    en: 'iOS version is coming soon via TestFlight and App Store. Android users can download the APK right now.',
                    ar: 'نسخة iOS ستتوفر قريباً عبر TestFlight وApp Store. يمكن لمستخدمي Android تنزيل APK الآن.',
                    zh: 'iOS 版本即将通过 TestFlight 和 App Store 发布。Android 用户可立即下载 APK。',
                    ru: 'Версия для iOS скоро появится в TestFlight и App Store. Пользователи Android могут скачать APK прямо сейчас.',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop QR Scan Card + Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR Code Card (Desktop / Tablet Companion) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center justify-between">
            <div className="space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'اسکن با دوربین گوشی', en: 'Scan with Phone Camera', ar: 'المسح بكاميرا الهاتف', zh: '用手机相机扫码', ru: 'Сканируйте камерой' })}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lt(locale, {
                  fa: 'جهت دانلود سریع روی گوشی هوشمند، بارکد را اسکن کنید',
                  en: 'Scan to open this download page directly on your phone',
                  ar: 'امسح الباركود لفتح صفحة التنزيل على هاتفك',
                  zh: '扫码即可在手机上直接打开本下载页',
                  ru: 'Сканируйте для загрузки прямо на телефон',
                })}
              </p>
            </div>

            <div className="my-4 p-3 bg-white rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
              {qrCodeDataUrl ? (
                <Image
                  src={qrCodeDataUrl}
                  alt="iTRIP App Download QR"
                  width={176}
                  height={176}
                  unoptimized
                  className="w-44 h-44 rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>

            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium font-mono">
              firuzo.online/{locale}/app
            </span>
          </div>

          {/* Core App Highlights (2 Columns) */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <WifiOff className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'گاوصندوق ۱۰۰٪ آفلاین', en: '100% Offline Travel Vault', ar: 'خزنة سفر دون إنترنت', zh: '100% 离线旅行保险库', ru: '100% офлайн-сейф' })}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lt(locale, {
                  fa: 'بلیت‌های پرواز، کدهای QR فرودگاهی و ووچرهای اقامت حتی در حالت هواپیما بدون نیاز به اینترنت در دسترس هستند.',
                  en: 'Flight tickets, boarding barcodes, and hotel vouchers remain viewable in airplane mode without cellular data.',
                  ar: 'تذاكر الطيران، وأكواد الصعود، وقسائم الإقامة متاحة حتى في وضع الطيران دون اتصال بالإنترنت.',
                  zh: '飞行机票、登机牌二维码和住宿凭证在飞行模式下无需网络均可正常出示。',
                  ru: 'Авиабилеты, посадочные талоны и ваучеры доступны в режиме полета без интернета.',
                })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'کارت راننده و خدمات محلی', en: 'Driver Card & Local Services', ar: 'بطاقة السائق والخدمات المحلية', zh: '出租车司机卡与本地服务', ru: 'Карточка для такси' })}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lt(locale, {
                  fa: 'نمایش آدرس هتل به خط درشت فارسی برای رانندگان تاکسی بدون نیاز به ترجمه یا تماس تلفنی.',
                  en: 'Large Persian hotel address card for local taxi drivers without translation barriers.',
                  ar: 'عرض عنوان الفندق بالفارسية لسائقي التاكسي دون حواجز لغوية.',
                  zh: '为出租车司机提供醒目的波斯语酒店地址卡，消除语言障碍。',
                  ru: 'Крупный адрес отеля на фарси для водителей такси без языкового барьера.',
                })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'امنیت سخت‌افزاری بیومتریک', en: 'Hardware Biometric Security', ar: 'أمان بيومتري معتمد', zh: '硬件生物识别安全', ru: 'Биометрическая защита' })}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lt(locale, {
                  fa: 'محافظت از موجودی کیف پول و نشست کاربر از طریق اثر انگشت، تشخیص چهره و Android Keystore.',
                  en: 'Wallet balances and session tokens are protected by Android Keystore, fingerprint, and Face Unlock.',
                  ar: 'حماية رصيد المحفظة والجلسات عبر بصمة الإصبع والتعرف على الوجه ونظام Android Keystore.',
                  zh: '钱包余额与会话受 Android Keystore、指纹与面部识别严格保护。',
                  ru: 'Баланс кошелька и сессии защищены биометрией и аппаратным хранилищем Android Keystore.',
                })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Languages className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'پشتیبانی کامل ۵ زبانه', en: 'Full 5-Language Support', ar: 'دعم كامل لخمس لغات', zh: '完整五种语言支持', ru: 'Поддержка 5 языков' })}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lt(locale, {
                  fa: 'پوشش کامل فارسی، انگلیسی، عربی، چینی و روسی با چیدمان استاندارد دوجهته (RTL/LTR).',
                  en: 'Complete coverage for English, Persian, Arabic, Chinese, and Russian with bidirectional RTL/LTR layout.',
                  ar: 'تغطية كاملة للفارسية والإنجليزية والعربية والصينية والروسية مع محاذاة ثنائية الاتجاه.',
                  zh: '完整覆盖波斯语、英语、阿拉伯语、中文及俄语，完美支持双向布局。',
                  ru: 'Полная поддержка фарси, английского, арабского, китайского и русского языков.',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Installation Guide (Phase 11 Requirements) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {lt(locale, {
              fa: 'راهنمای نصب آسان برنامه روی گوشی اندروید',
              en: 'Simple Step-by-Step Android Installation Guide',
              ar: 'دليل تثبيت التطبيق على هواتف أندرويد بسهولة',
              zh: '简易 Android 应用安装指南',
              ru: 'Простая инструкция по установке на Android',
            })}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              {
                step: lt(locale, { fa: '۱', en: '1', ar: '١', zh: '1', ru: '1' }),
                title: lt(locale, { fa: 'دانلود APK', en: 'Download APK', ar: 'تنزيل APK', zh: '下载 APK', ru: 'Скачать APK' }),
                desc: lt(locale, { fa: 'روی دکمه دانلود مستقیم کلیک کنید.', en: 'Tap the direct download button above.', ar: 'اضغط على زر التنزيل المباشر أعلاه.', zh: '点击上方的直接下载按钮。', ru: 'Нажмите кнопку прямой загрузки выше.' }),
              },
              {
                step: lt(locale, { fa: '۲', en: '2', ar: '٢', zh: '2', ru: '2' }),
                title: lt(locale, { fa: 'باز کردن فایل', en: 'Open File', ar: 'فتح الملف', zh: '打开文件', ru: 'Открыть файл' }),
                desc: lt(locale, { fa: 'فایل دانلود شده را از نوار اعلان‌ها یا پوشه Downloads باز کنید.', en: 'Open downloaded file from notification bar or Downloads folder.', ar: 'افتح الملف الذي تم تنزيله من شريط الإشعارات أو التنزيلات.', zh: '从通知栏或下载文件夹中打开已下载文件。', ru: 'Откройте загруженный файл из шторки уведомлений.' }),
              },
              {
                step: lt(locale, { fa: '۳', en: '3', ar: '٣', zh: '3', ru: '3' }),
                title: lt(locale, { fa: 'تأیید نصب', en: 'Allow Install', ar: 'السماح بالتثبيت', zh: '允许安装', ru: 'Разрешить установку' }),
                desc: lt(locale, { fa: 'در صورت نمایش پیام امنیتی، گزینه Allow from this source را بزنید.', en: 'If prompted by Android, tap Settings and allow installation.', ar: 'إذا ظهرت رسالة أمان، اسمح بالتثبيت من هذا المصدر.', zh: '若系统提示安全警告，点击设置并允许安装。', ru: 'При запросе системы включите установку из источника.' }),
              },
              {
                step: lt(locale, { fa: '۴', en: '4', ar: '٤', zh: '4', ru: '4' }),
                title: lt(locale, { fa: 'نصب برنامه', en: 'Tap Install', ar: 'تثبيت التطبيق', zh: '确认安装', ru: 'Установить' }),
                desc: lt(locale, { fa: 'دکمه Install را بزنید و چند ثانیه صبر کنید.', en: 'Tap Install and wait a few seconds.', ar: 'اضغط على تثبيت وانتظر بضع ثوانٍ.', zh: '点击“安装”并稍候几秒钟。', ru: 'Нажмите «Установить» и подождите.' }),
              },
              {
                step: lt(locale, { fa: '۵', en: '5', ar: '٥', zh: '5', ru: '5' }),
                title: lt(locale, { fa: 'ورود به اپ', en: 'Launch & Travel', ar: 'تشغيل والتسجيل', zh: '开启旅程', ru: 'Запуск и поездка' }),
                desc: lt(locale, { fa: 'اپ را باز کنید؛ وارد شوید یا به عنوان مهمان سفر کنید.', en: 'Open iTRIP, sign in or explore as a guest traveler.', ar: 'افتح التطبيق وسجل الدخول أو تصفح كزائر.', zh: '打开 iTRIP，登录或直接以游客身份使用。', ru: 'Запустите iTRIP и используйте сейф.' }),
              },
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-black text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Specs & SHA256 Checksum Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {lt(locale, { fa: 'مشخصات فنی و سلامت فایل (SHA-256)', en: 'Technical Specifications & Integrity', ar: 'المواصفات الفنية وسلامة الملف', zh: '技术规范与完整性校验', ru: 'Технические характеристики и хэш' })}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lt(locale, { fa: 'کد هش جهت راستی‌آزمایی و اطمینان از اصالت فایل APK', en: 'Cryptographic hash to verify package authenticity and safety', ar: 'رمز التجزئة للتحقق من أمان وصحة حزمة التطبيق', zh: '加密哈希值，用于验证安装包的完整性与安全性', ru: 'Хэш для проверки подлинности пакета APK' })}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Signed & Safe</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Version</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">v{LATEST_MOBILE_RELEASE.version} (Build {LATEST_MOBILE_RELEASE.buildNumber})</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Package ID</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{LATEST_MOBILE_RELEASE.packageId}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Min Android</span>
              <span className="font-bold text-slate-900 dark:text-white">{LATEST_MOBILE_RELEASE.minAndroidVersion}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">File Size</span>
              <span className="font-bold text-slate-900 dark:text-white">{LATEST_MOBILE_RELEASE.approximateSizeMb}</span>
            </div>
          </div>

          {/* SHA256 Checksum Box with Copy */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SHA-256 Checksum</span>
              <code className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all block">
                {LATEST_MOBILE_RELEASE.sha256}
              </code>
            </div>
            <button
              onClick={copyChecksum}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex-shrink-0"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHash ? lt(locale, { fa: 'کپی شد', en: 'Copied', ar: 'تم النسخ', zh: '已复制', ru: 'Скопировано' }) : lt(locale, { fa: 'کپی', en: 'Copy', ar: 'نسخ', zh: '复制', ru: 'Копировать' })}</span>
            </button>
          </div>
        </div>

        {/* Official Store Channels Status */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {lt(locale, { fa: 'کانال‌های رسمی انتشار و مارکت‌ها', en: 'Official App Distribution Channels', ar: 'قنوات ومتاجر التوزيع الرسمية', zh: '官方分发渠道', ru: 'Официальные каналы публикации' })}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Direct APK</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {lt(locale, { fa: 'دانلود مستقیم رسمی', en: 'Official Direct Download', ar: 'تنزيل مباشر رسمي', zh: '官方直接下载', ru: 'Прямая загрузка' })}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                {lt(locale, { fa: 'فعال', en: 'Active', ar: 'نشط', zh: '已启用', ru: 'Активно' })}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Google Play</span>
                <span className="text-[11px] text-slate-400 font-normal">AAB Package Ready</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {lt(locale, { fa: 'به زودی', en: 'Coming Soon', ar: 'قريباً', zh: '即将推出', ru: 'Скоро' })}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {lt(locale, { fa: 'کافه بازار (Bazaar)', en: 'Cafe Bazaar', ar: 'كافيه بازار', zh: 'Cafe Bazaar', ru: 'Cafe Bazaar' })}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {lt(locale, { fa: 'در حال داوری', en: 'In Review', ar: 'قيد المراجعة', zh: '审核中', ru: 'На проверке' })}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {lt(locale, { fa: 'به زودی', en: 'Coming Soon', ar: 'قريباً', zh: '即将推出', ru: 'Скоро' })}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {lt(locale, { fa: 'مایکت (Myket)', en: 'Myket Store', ar: 'مايكت', zh: 'Myket 应用商店', ru: 'Myket' })}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {lt(locale, { fa: 'در حال داوری', en: 'In Review', ar: 'قيد المراجعة', zh: '审核中', ru: 'На проверке' })}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {lt(locale, { fa: 'به زودی', en: 'Coming Soon', ar: 'قريباً', zh: '即将推出', ru: 'Скоро' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
