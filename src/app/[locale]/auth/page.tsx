'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, User, Lock, LogIn } from 'lucide-react';

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
      setError(locale === 'fa' ? 'شماره موبایل معتبر نیست (۰۹xxxxxxxxx)' : 'Invalid mobile number (09xxxxxxxxx)');
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
      setError(locale === 'fa' ? 'کد تایید اشتباه است' : 'Invalid OTP code');
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
      setError(locale === 'fa' ? 'نام، فامیل و کد ملی ۱۰ رقمی الزامی است' : 'Full name and 10-digit National ID required');
      return;
    }
    setError('');
    updateKyc({ firstNameFa: firstFa, lastNameFa: lastFa, nationalId });
    setKycStep('passport_scan');
  }

  function finishKyc() {
    if (!passportNo.trim() || !expiry) {
      setError(locale === 'fa' ? 'اطلاعات پاسپورت را تکمیل یا اسکن کنید' : 'Please scan or enter passport details');
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
                {locale === 'fa' ? 'تغییر شماره موبایل' : 'Change Phone Number'}
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
            <h2 className="font-black text-2xl text-ink mb-2">{locale === 'fa' ? 'احراز هویت و مشخصات' : 'Identity Information'}</h2>
            <p className="text-xs font-bold text-sub mb-6">{locale === 'fa' ? 'برای صدور قطعی بلیط و واچر هتل، مشخصات را دقیق وارد کنید' : 'Please enter details exactly as they appear on official ID'}</p>

            {error && <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'نام' : 'First Name'}</label>
                  <input
                    type="text"
                    value={firstFa}
                    onChange={(e) => setFirstFa(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'نام خانوادگی' : 'Last Name'}</label>
                  <input
                    type="text"
                    value={lastFa}
                    onChange={(e) => setLastFa(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line px-3 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'کد ملی ۱۰ رقمی' : 'National ID (10 digits)'}</label>
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
                {locale === 'fa' ? 'مرحله بعد: اطلاعات پاسپورت' : 'Next: Passport Details'}
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
            <h2 className="font-black text-2xl text-ink mb-2">{locale === 'fa' ? 'اسکن یا ثبت پاسپورت' : 'Passport Verification'}</h2>
            <p className="text-xs font-bold text-sub mb-6">{locale === 'fa' ? 'اسکن هوشمند پاسپورت یا ورود دستی شماره و تاریخ انقضا' : 'OCR scan or manual entry for international bookings'}</p>

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
                {scanning ? (locale === 'fa' ? 'در حال خواندن بارکد پاسپورت...' : 'Scanning passport MRZ...') : (locale === 'fa' ? 'اسکن هوشمند پاسپورت (OCR)' : 'Smart Passport OCR Scan')}
              </span>
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'شماره پاسپورت' : 'Passport Number'}</label>
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
                <label className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</label>
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
                {locale === 'fa' ? 'تکمیل و ورود به حساب' : 'Complete & Enter Account'}
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
            <h2 className="font-black text-2xl text-ink mb-2">{locale === 'fa' ? 'احراز هویت تکمیل شد' : 'Verification Complete'}</h2>
            <p className="text-xs font-bold text-sub mb-6">{locale === 'fa' ? 'حساب کاربری شما با موفقیت تایید گردید.' : 'Your account has been fully verified.'}</p>
            <button
              onClick={() => router.push('/account')}
              className="w-full h-12 rounded-xl bg-brand text-surface font-black text-sm hover:bg-brand-dark transition"
            >
              {locale === 'fa' ? 'ورود به پنل کاربری' : 'Go to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
