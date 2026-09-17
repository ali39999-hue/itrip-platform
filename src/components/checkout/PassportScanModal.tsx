'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { lt } from '@/lib/lt';
import { useLocale } from 'next-intl';
import {
  UserCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PassportImageScanner } from './PassportImageScanner';
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
  defaultCountry?: string;
}

export function PassportScanModal({
  open,
  onOpenChange,
  onScanSuccess,
}: PassportScanModalProps) {
  const locale = useLocale();

  const [imageActive, setImageActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState<'idle' | 'kyc'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Invalidate in-flight KYC reads on dismissal, close/reopen, and unmount.
  const requestRef = useRef(0);
  const pendingRef = useRef(false);

  useEffect(() => {
    setImageActive(false);
    setDismissed(false);
    setMode('idle');
    setError(null);
    setLoading(false);
    pendingRef.current = false;
    return () => {
      requestRef.current += 1;
      pendingRef.current = false;
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDismissed(true);
      requestRef.current += 1;
      pendingRef.current = false;
    }
    onOpenChange(nextOpen);
  };

  const scanDescription = lt(locale, {
    fa: 'تصویر فقط روی دستگاه شما پردازش می‌شود و ارسال نمی‌شود. پیش از تکمیل فرم، اطلاعات را بازبینی کنید یا دستی وارد کنید.',
    en: 'Images are processed only on your device, never uploaded. Review details before autofill, or enter them manually.',
    ar: 'تُعالج الصور على جهازك فقط دون رفعها. راجع البيانات قبل ملء النموذج أو أدخلها يدوياً.',
    zh: '图片仅在您的设备上处理，不会上传。自动填写前请核对信息，或手动输入。',
    ru: 'Изображения обрабатываются только на вашем устройстве, без загрузки. Проверьте данные перед заполнением или введите их вручную.',
  });

  // Handle Option 3: KYC Profile from User Account
  const handleKycScan = async () => {
    if (!open || dismissed || imageActive || pendingRef.current) return;
    pendingRef.current = true;
    const request = ++requestRef.current;
    setError(null);
    setMode('kyc');
    setLoading(true);

    try {
      const res = await getMyKyc();
      if (request !== requestRef.current) return;
      pendingRef.current = false;
      setLoading(false);

      const kyc = res.success ? res.kyc : undefined;
      if (kyc?.kycApproved && kyc.firstNameEn?.trim() && kyc.lastNameEn?.trim() && kyc.passportNo?.trim()) {
        onScanSuccess({
          firstName: kyc.firstNameEn,
          lastName: kyc.lastNameEn,
          passportNo: kyc.passportNo,
          ...(kyc.passportExpiry ? { passportExpiryDate: kyc.passportExpiry } : {}),
          ...(kyc.nationalId ? { nationalId: kyc.nationalId } : {}),
        });
        handleOpenChange(false);
      } else {
        setError(
          lt(locale, {
            fa: 'اطلاعات کامل و تأییدشده گذرنامه در حساب شما یافت نشد. اطلاعات را دستی وارد کنید یا پروفایل KYC را تکمیل کنید.',
            en: 'Complete approved passport details were not found in your account. Enter details manually or complete your KYC profile.',
            ar: 'لم يتم العثور على بيانات جواز سفر كاملة ومعتمدة. أدخل البيانات يدوياً أو أكمل ملف KYC.',
            zh: '账户中没有完整的已认证护照信息。请手动输入或完善 KYC 资料。',
            ru: 'Полные подтверждённые паспортные данные не найдены. Введите данные вручную или заполните профиль KYC.',
          })
        );
      }
    } catch {
      if (request !== requestRef.current) return;
      pendingRef.current = false;
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
    <Dialog open={open && !dismissed} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-[17px] font-black text-ink">
              {lt(locale, {
                fa: 'اطلاعات گذرنامه و کارت ملی',
                en: 'Passport & ID Details',
                ar: 'بيانات جواز السفر والهوية',
                zh: '护照与身份证信息',
                ru: 'Данные паспорта и удостоверения личности',
              })}
            </DialogTitle>

          </div>
          <DialogDescription className="text-[12.5px] font-bold text-sub">
            {scanDescription}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Options Cards */}
        {(
          <div className="grid grid-cols-1 gap-2.5 py-1">
            {open && !dismissed && <PassportImageScanner
              disabled={loading}
              onActiveChange={setImageActive}
              onConfirm={data => {
                onScanSuccess({ firstName: data.firstName, lastName: data.lastName, passportNo: data.passportNo,
                  passportExpiryDate: data.passportExpiryDate, birthDate: data.birthDate,
                  ...(data.gender ? { gender: data.gender } : {}),
                });
                handleOpenChange(false);
              }}
            />}

            {/* Option 3: KYC Profile */}
            <button
              type="button"
              onClick={handleKycScan}
              disabled={loading || imageActive}
              className="min-h-[44px] min-w-[44px] w-full p-3.5 rounded-2xl border border-line bg-surface hover:bg-soft/70 hover:border-brand/40 transition-all text-start flex items-center justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint text-brand-dark flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-ink group-hover:text-brand-dark transition-colors m-0">
                    {lt(locale, {
                      fa: 'استخراج از پروفایل تاییدشده KYC کاربر',
                      en: 'Autofill from Verified KYC Profile',
                      ar: 'استرداد من بيانات KYC المعتمدة',
                      zh: '基于个人中心已认证 KYC 资料',
                      ru: 'Заполнить из подтвержденного профиля KYC',
                    })}
                  </h4>
                  <p className="text-[11px] text-sub font-bold mt-0.5 mb-0">
                    {lt(locale, {
                      fa: 'تکمیل خودکار بر اساس کد ملی و پاسپورت ثبت‌شده در پنل',
                      en: 'Autofill using verified national ID & passport in your account',
                      ar: 'ملء تلقائي للبيانات المسجلة في ملفك الشخصي',
                      zh: '同步账户已认证的身份证与护照信息',
                      ru: 'Автозаполнение по проверенным данным из профиля',
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
