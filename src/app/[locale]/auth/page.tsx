'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { ScanLine, CheckCircle2, Loader2, ArrowLeft, User, Lock, LogIn, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { user, login, setKycStep, updateKyc, kyc } = useAuthStore();

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
      setError('شماره موبایل معتبر نیست (۰۹xxxxxxxxx)');
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
      setError('کد تایید اشتباه است');
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
      setError('نام، فامیل و کد ملی ۱۰ رقمی الزامی است');
      return;
    }
    setError('');
    updateKyc({ firstNameFa: firstFa, lastNameFa: lastFa, nationalId });
    setKycStep('passport_scan');
  }

  if (user) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 end-0 w-full h-full bg-soft opacity-30"></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Background image" className="w-full h-full object-cover opacity-80 mix-blend-overlay dark:opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB25RB3Ic9LiseZMK3BsWb1jqFSboFhVanq3J69_Go03LZRwixmZXTDL2WLWfOoI1UeAw-ltT3-BFUjwqhraUHahInJwfxnJ3jF9lt_JgPk2rI3VwRQjHc-4HsHZkZc24fFM0UC0r1EQXHHVH9-w7bxvbX3DCtVlyb2wJKNCeLx3y-0963JjEMszV14qboN_qVbI-06_Akw1sZvn41EGEucV8-tIYlPNASaRJtJFOYDIdDRtFYGFaQrU4BVujarjyoRbQ" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/50 dark:from-ink dark:to-ink/50"></div>
        </div>

        <div className="bg-surface/85 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl p-10 z-10 w-full max-w-md text-center">
          <CheckCircle2 size={64} className="mx-auto text-success mb-6" />
          <h1 className="text-[24px] font-black text-ink mb-2">خوش آمدید، {user.firstNameFa}</h1>
          <p className="text-[14px] font-bold text-sub mb-8">احراز هویت شما تایید شده است</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push('/account')} className="w-full bg-brand hover:bg-brand-2 text-surface h-12 px-8 font-black rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              حساب کاربری
            </button>
            <button onClick={() => router.push('/my-trips')} className="w-full h-12 font-black border border-line/50 bg-surface/50 text-sub hover:text-ink hover:bg-surface rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              سفرهای من
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 end-0 w-full h-full bg-soft opacity-30"></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Background image" className="w-full h-full object-cover opacity-80 mix-blend-overlay dark:opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB25RB3Ic9LiseZMK3BsWb1jqFSboFhVanq3J69_Go03LZRwixmZXTDL2WLWfOoI1UeAw-ltT3-BFUjwqhraUHahInJwfxnJ3jF9lt_JgPk2rI3VwRQjHc-4HsHZkZc24fFM0UC0r1EQXHHVH9-w7bxvbX3DCtVlyb2wJKNCeLx3y-0963JjEMszV14qboN_qVbI-06_Akw1sZvn41EGEucV8-tIYlPNASaRJtJFOYDIdDRtFYGFaQrU4BVujarjyoRbQ" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/50 dark:from-ink dark:to-ink/50"></div>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-md px-4 z-10 relative">
        <div className="bg-surface/85 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl p-8 md:p-10">
          
          {/* Progress Indicator for KYC Steps */}
          {(step === 'identity' || step === 'passport_scan') && (
            <div className="flex items-center gap-2 mb-8">
              {['phone', 'otp', 'identity', 'passport_scan', 'approved'].map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${['phone', 'otp', 'identity', 'passport_scan'].indexOf(step) >= i ? 'bg-brand' : 'bg-line/50'}`}
                />
              ))}
            </div>
          )}

          {step === 'phone' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h1 className="text-[26px] font-black text-ink mb-2 tracking-tight">خوش آمدید</h1>
                <p className="text-[14px] font-bold text-sub">برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید</p>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }} className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-ink mb-2" htmlFor="identifier">شماره موبایل</label>
                  <div className="relative">
                    <input 
                      id="identifier"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full bg-surface/70 border border-line/50 rounded-xl py-3.5 px-4 text-[15px] font-bold text-ink focus:outline-none focus:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-colors text-start" 
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹" 
                      dir="ltr"
                      type="tel"
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-4 pointer-events-none text-sub/50">
                      <User size={20} aria-hidden="true" />
                    </div>
                  </div>
                  {error && <p className="text-rose-warm text-[12.5px] font-bold mt-2">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-brand text-surface text-[15px] font-black rounded-xl py-4 hover:bg-brand-2 transition-colors shadow-sm flex justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" 
                >
                  <span>ادامه</span>
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
              </form>

              <div className="my-8 flex items-center">
                <div className="flex-grow border-t border-line/50"></div>
                <span className="flex-shrink-0 px-4 text-[12px] font-bold text-sub">یا</span>
                <div className="flex-grow border-t border-line/50"></div>
              </div>

              <div className="space-y-4">
                <button className="w-full bg-surface/60 border border-line/50 text-ink text-[14px] font-black rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                  <LogIn size={20} className="text-sub" aria-hidden="true" />
                  ورود با گوگل
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-center mb-8">
                <h1 className="text-[26px] font-black text-ink mb-2 tracking-tight">تایید شماره</h1>
                <p className="text-[14px] font-bold text-sub">کد پیامک‌شده به {phone} را وارد کنید</p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-3 inline-flex bg-brand/10 text-brand rounded-lg px-3 py-2 text-[12px] font-bold">
                    دمو: کد ثابت <b dir="ltr" className="mx-1">12345</b> است
                  </div>
                )}
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); verifyOtp(); }} className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[13px] font-bold text-ink" htmlFor="password">کد یکبار مصرف</label>
                    <button onClick={() => setKycStep('phone')} className="text-[12px] font-bold text-brand hover:underline">ویرایش شماره</button>
                  </div>
                  <div className="relative">
                    <input 
                      id="password"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="w-full bg-surface/70 border border-line/50 rounded-xl py-3.5 px-4 text-[18px] tracking-[0.3em] font-black text-ink focus:outline-none focus:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-colors text-center" 
                      placeholder="- - - - -" 
                      dir="ltr"
                      type="tel"
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-4 pointer-events-none text-sub/50">
                      <Lock size={20} aria-hidden="true" />
                    </div>
                  </div>
                  {error && <p className="text-rose-warm text-[12.5px] font-bold mt-2">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand text-surface text-[15px] font-black rounded-xl py-4 hover:bg-brand-2 transition-colors shadow-sm flex justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" 
                >
                  {loading ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : (
                    <>
                      <span>تایید و ورود</span>
                      <ArrowLeft size={18} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'identity' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={28} />
                </div>
                <h1 className="text-[24px] font-black text-ink mb-2 tracking-tight">اطلاعات هویتی</h1>
                <p className="text-[13px] font-bold text-sub">برای تکمیل ثبت‌نام و استفاده از کیف پول</p>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstNameFa" className="block text-[12px] font-bold text-ink mb-2">نام (فارسی)</label>
                    <input id="firstNameFa" value={firstFa} onChange={(e) => setFirstFa(e.target.value)} className="w-full bg-surface/70 border border-line/50 rounded-xl h-12 px-4 text-[14px] font-bold text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="lastNameFa" className="block text-[12px] font-bold text-ink mb-2">نام خانوادگی</label>
                    <input id="lastNameFa" value={lastFa} onChange={(e) => setLastFa(e.target.value)} className="w-full bg-surface/70 border border-line/50 rounded-xl h-12 px-4 text-[14px] font-bold text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand transition-colors" />
                  </div>
                </div>
                <div>
                  <label htmlFor="nationalId" className="block text-[12px] font-bold text-ink mb-2">کد ملی</label>
                  <input id="nationalId" value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))} dir="ltr" className="w-full bg-surface/70 border border-line/50 rounded-xl h-12 px-4 text-[14px] font-bold text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand transition-colors text-start" />
                </div>
                {error && <p className="text-rose-warm text-[12.5px] font-bold">{error}</p>}
                
                <button onClick={submitIdentity} className="w-full bg-ink text-surface text-[15px] font-black rounded-xl py-4 mt-2 hover:bg-ink/80 transition-colors shadow-sm flex justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                  <span>ادامه به مرحله بعد</span>
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 'passport_scan' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
                  <ScanLine size={28} />
                </div>
                <h1 className="text-[24px] font-black text-ink mb-2 tracking-tight">اسکن پاسپورت</h1>
                <p className="text-[13px] font-bold text-sub">صفحه اطلاعات را جلوی دوربین بگیرید</p>
              </div>
              
              <div className="space-y-6">
                <button
                  onClick={scanPassport}
                  disabled={scanning}
                  className="w-full border-2 border-dashed border-brand/40 bg-brand/5 rounded-2xl py-10 flex flex-col items-center gap-3 hover:border-brand hover:bg-brand/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  {scanning ? (
                    <Loader2 size={36} className="animate-spin text-brand" aria-hidden="true" />
                  ) : (
                    <ScanLine size={36} className="text-brand" aria-hidden="true" />
                  )}
                  <span className="font-black text-ink">{scanning ? 'در حال اسکن با هوش مصنوعی...' : 'دوربین را روشن کنید'}</span>
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-sub mb-1">شماره پاسپورت</label>
                    <input value={passportNo} onChange={(e) => setPassportNo(e.target.value.toUpperCase())} dir="ltr" className="w-full bg-surface/70 border border-line/50 rounded-xl h-11 px-3 text-[13px] font-bold text-ink uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-sub mb-1">تاریخ انقضا</label>
                    <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full bg-surface/70 border border-line/50 rounded-xl h-11 px-3 text-[13px] font-bold text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand" />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    updateKyc({ passportNo, passportExpiry: expiry, step: 'approved' });
                    router.push('/account');
                  }}
                  disabled={!passportNo || !expiry}
                  className="w-full bg-brand text-surface text-[15px] font-black rounded-xl py-4 hover:bg-brand-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  تایید و ورود به حساب
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
