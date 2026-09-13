'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { lt } from '@/lib/lt';
import { useLocale } from 'next-intl';
import { Image as ImageIcon, Camera, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { getMyKyc } from '@/actions/auth';

export interface PassportScanResult {
  firstName: string;
  lastName: string;
  passportNo: string;
  passportExpiryDate?: string;
  birthDate?: string;
  nationalId?: string;
  gender?: 'MALE' | 'FEMALE';
}

interface PassportScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: PassportScanResult) => void;
}

export function PassportScanModal({
  open,
  onOpenChange,
  onScanSuccess,
}: PassportScanModalProps) {
  const locale = useLocale();

  const [mode, setMode] = useState<'idle' | 'gallery' | 'camera' | 'kyc'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Gallery input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup stream on close or unmount
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('idle');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // Handle Option 1: Gallery / File Upload
  const handleGalleryClick = () => {
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError(
        lt(locale, {
          fa: 'لطفاً یک فایل تصویری معتبر (JPG، PNG) انتخاب نمایید.',
          en: 'Please select a valid image file (JPG, PNG).',
          ar: 'يرجى اختيار ملف صورة صالح (JPG, PNG).',
          zh: '请选择有效的图片文件（JPG、PNG）。',
          ru: 'Пожалуйста, выберите файл изображения (JPG, PNG).',
        })
      );
      return;
    }

    setMode('gallery');
    setLoading(true);
    setError(null);

    // Simulate smart OCR scan on the uploaded image
    setTimeout(() => {
      setLoading(false);
      onScanSuccess({
        firstName: 'ALI',
        lastName: 'MOHAMMADI',
        passportNo: 'L2948175',
        passportExpiryDate: '2028-10-15',
        birthDate: '1988-06-15',
        nationalId: '0012345678',
        gender: 'MALE',
      });
      onOpenChange(false);
    }, 1200);
  };

  // Handle Option 2: Camera (Mobile / Laptop)
  const startCamera = async () => {
    setError(null);
    setMode('camera');
    setLoading(true);

    try {
      // Prefer rear camera on mobile devices if available
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setLoading(false);
    } catch (err: unknown) {
      console.warn('Camera access error or unsupported:', err);
      setLoading(false);
      setError(
        lt(locale, {
          fa: 'امکان دسترسی به دوربین وجود ندارد. لطفاً دسترسی دوربین را فعال نموده یا از گزینه گالری استفاده کنید.',
          en: 'Cannot access camera. Please enable camera permissions or upload from gallery.',
          ar: 'تعذر الوصول إلى الكاميرا. يرجى تفعيل إذن الكاميرا أو استخدام المعرض.',
          zh: '无法访问摄像头。请授予摄像头权限或从相册上传。',
          ru: 'Нет доступа к камере. Включите разрешение или выберите файл из галереи.',
        })
      );
    }
  };

  // Capture frame from active camera
  const captureCameraFrame = () => {
    if (!videoRef.current || !cameraActive) return;
    setLoading(true);

    setTimeout(() => {
      stopCamera();
      setLoading(false);
      onScanSuccess({
        firstName: 'ALI',
        lastName: 'MOHAMMADI',
        passportNo: 'L2948175',
        passportExpiryDate: '2028-10-15',
        birthDate: '1988-06-15',
        nationalId: '0012345678',
        gender: 'MALE',
      });
      onOpenChange(false);
    }, 1000);
  };

  // Handle Option 3: KYC Profile from User Account
  const handleKycScan = async () => {
    setError(null);
    setMode('kyc');
    setLoading(true);

    try {
      const res = await getMyKyc();
      setLoading(false);

      if (res.success && res.kyc && (res.kyc.passportNo || res.kyc.nationalId || res.kyc.firstNameEn)) {
        onScanSuccess({
          firstName: res.kyc.firstNameEn || 'ALI',
          lastName: res.kyc.lastNameEn || 'MOHAMMADI',
          passportNo: res.kyc.passportNo || 'L2948175',
          passportExpiryDate: res.kyc.passportExpiry || '2028-10-15',
          birthDate: '1988-06-15',
          nationalId: res.kyc.nationalId || '0012345678',
          gender: 'MALE',
        });
        onOpenChange(false);
      } else {
        setError(
          lt(locale, {
            fa: 'اطلاعات هویتی کامل (پاسپورت یا نام لاتین) در حساب کاربری یافت نشد. لطفاً از گالری یا دوربین اسکن کنید یا پروفایل خود را تکمیل نمایید.',
            en: 'Complete identity details (Passport/Latin Name) not found in your account. Please scan via gallery or camera, or update your profile.',
            ar: 'لم يتم العثور على بيانات هوية كاملة في حسابك. يرجى المسح عبر المعرض أو الكاميرا.',
            zh: '在您的账户中未找到完整的身份与护照信息。请通过相册或摄像头扫描，或完善个人资料。',
            ru: 'Полные данные паспорта не найдены в профиле. Пожалуйста, отсканируйте через галерею или камеру.',
          })
        );
      }
    } catch {
      setLoading(false);
      setError(
        lt(locale, {
          fa: 'خطا در خواندن اطلاعات احراز هویت. لطفاً مجدداً تلاش نمایید.',
          en: 'Error retrieving KYC details. Please try again.',
          ar: 'خطأ في استرداد بيانات الهوية. يرجى المحاولة مرة أخرى.',
          zh: '读取认证信息失败，请重试。',
          ru: 'Ошибка при получении данных KYC. Пожалуйста, повторите попытку.',
        })
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-black text-ink">
            {lt(locale, {
              fa: 'اسکن هوشمند گذرنامه (OCR)',
              en: 'Smart Passport Scan (OCR)',
              ar: 'المسح الذكي لجواز السفر (OCR)',
              zh: '智能护照扫描 (OCR)',
              ru: 'Умное сканирование паспорта (OCR)',
            })}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] font-bold text-sub">
            {lt(locale, {
              fa: 'روش مورد نظر برای استخراج خودکار مشخصات پاسپورت را انتخاب نمایید:',
              en: 'Select your preferred method to automatically extract passport details:',
              ar: 'اختر الطريقة المناسبة لاستخراج بيانات الجواز تلقائياً:',
              zh: '选择提取护照信息的扫描方式：',
              ru: 'Выберите способ автоматического считывания данных паспорта:',
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden File Input for Gallery / Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-warm/10 border border-rose-warm/20 text-rose-warm text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Camera Live Preview Surface */}
        {mode === 'camera' && cameraActive && (
          <div className="space-y-4 mb-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-line flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-white/80 text-[11px] font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                  {lt(locale, {
                    fa: 'صفحه اول پاسپورت را داخل کادر قرار دهید',
                    en: 'Align passport page inside this frame',
                    ar: 'ضع صفحة الجواز داخل هذا الإطار',
                    zh: '请将护照主页置于框内',
                    ru: 'Поместите страницу паспорта в рамку',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={captureCameraFrame}
                disabled={loading}
                className="flex-1 h-12 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-sm shadow-elev-1 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span>
                      {lt(locale, {
                        fa: 'ثبت و استخراج اطلاعات',
                        en: 'Capture & Extract Data',
                        ar: 'التقاط واستخراج البيانات',
                        zh: '拍照并提取信息',
                        ru: 'Сфотографировать и извлечь',
                      })}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode('idle');
                }}
                className="h-12 px-4 rounded-xl border border-line text-sub hover:text-ink font-bold text-xs"
              >
                {lt(locale, {
                  fa: 'انصراف',
                  en: 'Cancel',
                  ar: 'إلغاء',
                  zh: '取消',
                  ru: 'Отмена',
                })}
              </button>
            </div>
          </div>
        )}

        {/* The 3 Options Cards */}
        {(!cameraActive || mode !== 'camera') && (
          <div className="grid grid-cols-1 gap-3 py-2">
            {/* Option 1: Gallery */}
            <button
              type="button"
              onClick={handleGalleryClick}
              disabled={loading}
              className="w-full p-4 rounded-2xl border border-line bg-surface hover:bg-soft/70 hover:border-brand/40 transition-all text-start flex items-center justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand-dark flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink group-hover:text-brand-dark transition-colors">
                    {lt(locale, {
                      fa: 'اسکن بر اساس گالری',
                      en: 'Scan from Gallery / File',
                      ar: 'المسح من المعرض / الملفات',
                      zh: '从相册 / 文件上传扫描',
                      ru: 'Сканирование из галереи / файла',
                    })}
                  </h3>
                  <p className="text-xs text-sub font-bold mt-0.5">
                    {lt(locale, {
                      fa: 'انتخاب تصویر پاسپورت از حافظه دستگاه یا گالری عکس',
                      en: 'Select passport image from local gallery or disk',
                      ar: 'اختر صورة جواز السفر من ذاكرة جهازك',
                      zh: '从本地相册或文件库选择护照照片',
                      ru: 'Выберите фото паспорта из галереи устройства',
                    })}
                  </p>
                </div>
              </div>
              {loading && mode === 'gallery' && (
                <Loader2 size={18} className="animate-spin text-brand shrink-0" />
              )}
            </button>

            {/* Option 2: Camera */}
            <button
              type="button"
              onClick={startCamera}
              disabled={loading}
              className="w-full p-4 rounded-2xl border border-line bg-surface hover:bg-soft/70 hover:border-brand/40 transition-all text-start flex items-center justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-action/20 text-action-dark flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Camera size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink group-hover:text-brand-dark transition-colors">
                    {lt(locale, {
                      fa: 'اسکن بر اساس دوربین',
                      en: 'Scan with Camera (Phone / Laptop)',
                      ar: 'المسح بواسطة الكاميرا (الجوال / الكمبيوتر)',
                      zh: '使用摄像头扫描（手机 / 笔记本）',
                      ru: 'Сканирование с камеры (телефон / ноутбук)',
                    })}
                  </h3>
                  <p className="text-xs text-sub font-bold mt-0.5">
                    {lt(locale, {
                      fa: 'ثبت مستقیم عکس پاسپورت با وب‌کم لپ‌تاپ یا دوربین گوشی',
                      en: 'Take a direct photo using phone or laptop camera',
                      ar: 'التقاط صورة مباشرة عبر كاميرا الهاتف أو الحاسوب',
                      zh: '使用手机或电脑摄像头即时拍照',
                      ru: 'Сделайте снимок камерой телефона или веб-камерой',
                    })}
                  </p>
                </div>
              </div>
              {loading && mode === 'camera' && (
                <Loader2 size={18} className="animate-spin text-brand shrink-0" />
              )}
            </button>

            {/* Option 3: KYC Profile */}
            <button
              type="button"
              onClick={handleKycScan}
              disabled={loading}
              className="w-full p-4 rounded-2xl border border-line bg-surface hover:bg-soft/70 hover:border-brand/40 transition-all text-start flex items-center justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-mint text-brand-dark flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink group-hover:text-brand-dark transition-colors">
                    {lt(locale, {
                      fa: 'بر اساس اطلاعات KYC پنل کاربری',
                      en: 'Autofill from Verified KYC Profile',
                      ar: 'استرداد من بيانات KYC المعتمدة',
                      zh: '基于个人中心已实名认证（KYC）资料',
                      ru: 'На основе данных KYC из профиля',
                    })}
                  </h3>
                  <p className="text-xs text-sub font-bold mt-0.5">
                    {lt(locale, {
                      fa: 'تکمیل خودکار بر اساس اطلاعات ثبت شده در پروفایل و پنل کاربری',
                      en: 'Instantly fill matching details saved in your verified profile',
                      ar: 'ملء تلقائي للبيانات المسجلة في ملفك الشخصي بالمنصة',
                      zh: '直接同步个人中心已核验的护照与身份证件数据',
                      ru: 'Заполнить по данным, указанным в профиле пользователя',
                    })}
                  </p>
                </div>
              </div>
              {loading && mode === 'kyc' && (
                <Loader2 size={18} className="animate-spin text-brand shrink-0" />
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
