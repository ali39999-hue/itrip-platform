'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import type { PassportOcrResult } from '@/lib/passport-ocr';

interface Props {
  disabled: boolean;
  onActiveChange: (active: boolean) => void;
  onConfirm: (result: PassportOcrResult) => void;
}

const buttonClass = 'min-h-[44px] min-w-[44px] w-full rounded-xl border border-line p-3 text-sm font-bold text-ink text-start flex items-center gap-3 hover:bg-soft disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] transition-transform';

export function PassportImageScanner({ disabled, onActiveChange, onConfirm }: Props) {
  const locale = useLocale();
  const [mode, setMode] = useState<'idle' | 'camera' | 'scanning' | 'review'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<PassportOcrResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const busyRef = useRef(false);

  function stopResources() {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    busyRef.current = false;
  }

  useEffect(() => () => stopResources(), []);

  const scanError = lt(locale, {
    fa: 'خواندن گذرنامه ممکن نشد. تصویر واضح JPG، PNG یا WebP تا ۱۲ مگابایت با هر دو خط پایین گذرنامه انتخاب کنید یا اطلاعات را دستی وارد کنید.',
    en: 'Could not read the passport. Choose a clear JPG, PNG or WebP up to 12 MB showing both bottom passport lines, or enter details manually.',
    ar: 'تعذرت قراءة الجواز. اختر صورة JPG أو PNG أو WebP واضحة حتى 12 ميغابايت تتضمن السطرين السفليين، أو أدخل البيانات يدوياً.',
    zh: '无法读取护照。请选择不超过 12 MB、包含底部两行的清晰 JPG、PNG 或 WebP 图片，或手动输入信息。',
    ru: 'Не удалось прочитать паспорт. Выберите чёткое изображение JPG, PNG или WebP до 12 МБ с обеими нижними строками или введите данные вручную.',
  });
  const cameraError = lt(locale, {
    fa: 'دوربین در دسترس نیست. دسترسی دوربین را در اتصال امن فعال کنید یا تصویر را از گالری انتخاب کنید.',
    en: 'Camera unavailable. Allow camera access on a secure connection or choose a gallery image.',
    ar: 'الكاميرا غير متاحة. اسمح بالوصول عبر اتصال آمن أو اختر صورة من المعرض.',
    zh: '摄像头不可用。请在安全连接下允许摄像头权限，或从相册选择图片。',
    ru: 'Камера недоступна. Разрешите доступ через защищённое соединение или выберите фото из галереи.',
  });

  function reset() {
    stopResources();
    setMode('idle');
    setResult(null);
    setError(null);
    setReady(false);
    onActiveChange(false);
  }

  async function scan(image: Blob | HTMLCanvasElement) {
    stopResources();
    const request = requestRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    busyRef.current = true;
    setMode('scanning');
    setResult(null);
    setError(null);
    setProgress(0);
    onActiveChange(true);
    try {
      // Keep the OCR library off the initial checkout bundle and out of SSR.
      const { scanPassportImage } = await import('@/lib/passport-ocr');
      if (request !== requestRef.current) return;
      const extracted = await scanPassportImage(image, {
        signal: controller.signal,
        onProgress: value => {
          if (request === requestRef.current && Number.isFinite(value)) {
            setProgress(Math.round(Math.max(0, Math.min(1, value)) * 100));
          }
        },
      });
      if (request !== requestRef.current) return;
      setResult(extracted);
      setMode('review');
    } catch {
      if (request !== requestRef.current) return;
      setError(scanError);
      setMode('idle');
      onActiveChange(false);
    } finally {
      if (request === requestRef.current) {
        busyRef.current = false;
        abortRef.current = null;
      }
    }
  }

  async function startCamera() {
    if (disabled || busyRef.current) return;
    stopResources();
    const request = requestRef.current;
    busyRef.current = true;
    setMode('camera');
    setReady(false);
    setError(null);
    onActiveChange(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      if (request !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      if (request !== requestRef.current) return;
      reset();
      setError(cameraError);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!ready || !video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      void scan(canvas);
    } catch {
      reset();
      setError(cameraError);
    }
  }


  const cancelLabel = lt(locale, { fa: 'لغو و بازگشت', en: 'Cancel and go back', ar: 'إلغاء والعودة', zh: '取消并返回', ru: 'Отменить и вернуться' });
  const galleryLabel = lt(locale, { fa: 'اسکن از روی تصویر گالری', en: 'Scan from Gallery / File', ar: 'المسح من المعرض / الملفات', zh: '从相册 / 文件扫描', ru: 'Сканирование из галереи / файла' });
  const scanningLabel = lt(locale, { fa: 'خواندن تصویر در دستگاه…', en: 'Reading image on your device…', ar: 'قراءة الصورة على جهازك…', zh: '正在设备上读取图片…', ru: 'Чтение изображения на устройстве…' });
  const fields = result ? [
    [lt(locale, { fa: 'نام', en: 'First name', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' }), result.firstName],
    [lt(locale, { fa: 'نام خانوادگی', en: 'Last name', ar: 'اسم العائلة', zh: '姓氏', ru: 'Фамилия' }), result.lastName],
    [lt(locale, { fa: 'شماره گذرنامه', en: 'Passport number', ar: 'رقم الجواز', zh: '护照号码', ru: 'Номер паспорта' }), result.passportNo],
    [lt(locale, { fa: 'تاریخ تولد', en: 'Date of birth', ar: 'تاريخ الميلاد', zh: '出生日期', ru: 'Дата рождения' }), result.birthDate],
    [lt(locale, { fa: 'تاریخ انقضا', en: 'Expiry date', ar: 'تاريخ الانتهاء', zh: '有效期', ru: 'Срок действия' }), result.passportExpiryDate],
    [lt(locale, { fa: 'کشور صادرکننده', en: 'Issuing country', ar: 'بلد الإصدار', zh: '签发国家', ru: 'Страна выдачи' }), result.issuingCountry],
    ...(result.gender ? [[lt(locale, { fa: 'جنسیت', en: 'Gender', ar: 'الجنس', zh: '性别', ru: 'Пол' }), result.gender === 'MALE'
      ? lt(locale, { fa: 'مرد', en: 'Male', ar: 'ذكر', zh: '男', ru: 'Мужской' })
      : lt(locale, { fa: 'زن', en: 'Female', ar: 'أنثى', zh: '女', ru: 'Женский' })]] : []),
  ] : [];

  return (
    <section className="min-w-0 space-y-3 leading-relaxed">
      {error && <p role="alert" className="rounded-xl border border-line bg-soft p-3 text-sm text-ink">{error}</p>}
      {mode === 'idle' && <div className="grid gap-2.5">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={galleryLabel} className="hidden" disabled={disabled}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file && !disabled && !busyRef.current) void scan(file);
          }} />
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => fileRef.current?.click()}>
          <ImageIcon size={20} className="shrink-0" />{galleryLabel}
        </button>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => void startCamera()}>
          <Camera size={20} className="shrink-0" />
          {lt(locale, { fa: 'اسکن زنده با دوربین', en: 'Live Camera Scan', ar: 'المسح المباشر بالكاميرا', zh: '摄像头实时扫描', ru: 'Сканирование с камеры' })}
        </button>
      </div>}
      {mode === 'camera' && <div className="space-y-3">
        <p className="text-sm text-sub">{lt(locale, { fa: 'صفحه مشخصات و هر دو خط پایین گذرنامه را کامل و بدون بازتاب نور در کادر قرار دهید.', en: 'Frame the details page and both bottom passport lines clearly, without glare.', ar: 'ضع صفحة البيانات والسطرين السفليين بوضوح داخل الإطار دون انعكاس الضوء.', zh: '请将资料页和底部两行完整放入画面，避免反光。', ru: 'Поместите страницу данных и обе нижние строки в кадр без бликов.' })}</p>
        <video ref={node => { videoRef.current = node; if (node) node.srcObject = streamRef.current; }} autoPlay muted playsInline
          onLoadedData={() => setReady(Boolean(streamRef.current && videoRef.current?.videoWidth))}
          className="aspect-[4/3] w-full rounded-xl bg-ink object-contain"
          aria-label={lt(locale, { fa: 'پیش‌نمایش دوربین گذرنامه', en: 'Passport camera preview', ar: 'معاينة كاميرا الجواز', zh: '护照摄像头预览', ru: 'Предпросмотр камеры паспорта' })} />
        <button type="button" disabled={!ready} className={buttonClass} onClick={capture}>
          {lt(locale, { fa: 'گرفتن عکس و خواندن', en: 'Capture and read', ar: 'التقاط وقراءة', zh: '拍摄并读取', ru: 'Снять и прочитать' })}
        </button>
      </div>}
      {mode === 'scanning' && <div role="status" className="space-y-2 py-4">
        <p className="flex items-center gap-2 text-sm text-ink"><Loader2 className="animate-spin shrink-0" size={20} />{scanningLabel}</p>
        <progress className="w-full" aria-label={scanningLabel} max={100} value={progress} />
        <p className="text-sm text-sub font-en" dir="ltr">{progress}%</p>
      </div>}
      {mode === 'review' && result && <div className="space-y-3">
        <h3 className="font-bold text-ink">{lt(locale, { fa: 'بازبینی اطلاعات خوانده‌شده', en: 'Review extracted details', ar: 'مراجعة البيانات المستخرجة', zh: '核对识别信息', ru: 'Проверьте распознанные данные' })}</h3>
        <p className="text-sm text-sub">{lt(locale, { fa: 'همه موارد را با گذرنامه تطبیق دهید. در صورت اشتباه، لغو کنید و دوباره اسکن کنید یا اطلاعات را دستی وارد کنید.', en: 'Check every field against your passport. If anything is wrong, cancel and rescan or enter details manually.', ar: 'طابق كل حقل مع جوازك. عند وجود خطأ، ألغِ وأعد المسح أو أدخل البيانات يدوياً.', zh: '请逐项与护照核对。如有错误，请取消后重新扫描或手动输入。', ru: 'Сверьте каждое поле с паспортом. При ошибке отмените и повторите сканирование или введите данные вручную.' })}</p>
        <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-soft p-3">
            <dt className="text-xs text-sub">{label}</dt><dd className="m-0 break-words text-sm font-bold text-ink"><bdi>{value}</bdi></dd>
          </div>)}
        </dl>
        {!result.hasSixMonthsValidity && <p role="alert" className="rounded-xl border border-border p-3 text-sm text-ink">{lt(locale, { fa: 'اعتبار گذرنامه کمتر از شش ماه است؛ الزامات مقصد را بررسی کنید.', en: 'Passport validity is under six months; check destination requirements.', ar: 'صلاحية الجواز أقل من ستة أشهر؛ تحقق من متطلبات الوجهة.', zh: '护照有效期不足六个月；请检查目的地要求。', ru: 'Срок действия паспорта менее шести месяцев; проверьте требования страны назначения.' })}</p>}
      </div>}
      {mode !== 'idle' && <div className="sticky bottom-0 z-10 grid gap-2 border-t border-border bg-surface/95 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        {mode === 'review' && result && <button type="button" className={`${buttonClass} bg-brand/10`} onClick={() => {
          const confirmed = result;
          reset();
          onConfirm(confirmed);
        }}>{lt(locale, { fa: 'تأیید اطلاعات و تکمیل فرم', en: 'Confirm details and autofill', ar: 'تأكيد البيانات وملء النموذج', zh: '确认信息并自动填写', ru: 'Подтвердить данные и заполнить' })}</button>}
        <button type="button" className={buttonClass} onClick={reset}>{cancelLabel}</button>
      </div>}
    </section>
  );
}

