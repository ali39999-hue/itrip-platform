'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { createBookingDraft, payBooking } from '@/actions/booking';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { useCountryStore } from '@/stores/country-store';
import { chargeContext, formatMoney } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { JalaliDatePicker } from "@/components/ui/DatePicker";
import { passengerSchema, Passenger } from '@/lib/validations';
import {
  ScanLine, User, Loader2, CheckCircle2, ShieldCheck, Wifi,
  Wallet as WalletIcon, Lock, ArrowRight, Luggage,
} from 'lucide-react';

const ESIM_PRICE = 2800000;
const INSURANCE_PRICE = 1900000;

type Phase = 'passengers' | 'payment' | 'issuing' | 'success';

export default function CheckoutPage() {
  const router = useRouter();
  const bookingContext = useBookingStore((s) => s.bookingContext);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const wallet = useBookingStore((s) => s.wallet);
  const { country } = useCountryStore();
  const charge = chargeContext(country);

  const [phase, setPhase] = useState<Phase>('passengers');
  const [addEsim, setAddEsim] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const [method, setMethod] = useState<'wallet_irr' | 'gateway'>('wallet_irr');

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Passenger>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      birthDate: '',
      gender: 'MALE',
    }
  });

  const passportNoValue = watch('passportNo');

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const [countdown, setCountdown] = useState(30);
  const [issueStep, setIssueStep] = useState(0);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [confirmedTitle, setConfirmedTitle] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'issuing') return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const addonsTotal = useMemo(
    () => (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0),
    [addEsim, addInsurance]
  );
  const total = (bookingContext?.amount ?? 0) + addonsTotal;

  function scanPassport() {
    setScanning(true);
    setTimeout(() => {
      setValue('firstName', 'ALI');
      setValue('lastName', 'MOHAMMADI');
      setValue('passportNo', 'L2948175');
      setValue('birthDate', '1985-11-20');
      setValue('nationalId', '0123456789');
      setValue('gender', 'MALE');
      setScanning(false);
    }, 1600);
  }

  const onSubmit = async (data: Passenger) => {
    setError('');
    
    // Fallback if type not provided
    const btype = (bookingContext?.type?.toUpperCase() || 'HOTEL');
    const btypeMap: Record<string, string> = {
       FLIGHTS: 'FLIGHT',
       HOTELS: 'HOTEL',
       TOURS: 'TOUR'
    };
    
    const res = await createBookingDraft({
      type: btypeMap[btype] || btype,
      passengers: [data],
      contactEmail: 'user@firuzo.com',
      contactPhone: '09123456789'
    }, total, charge.currency);
    
    if (!res.success) {
      setError(res.error || 'Failed to create booking draft');
      return;
    }
    setDraftBookingId(res.bookingId!);
    setPhase('payment');
  };

  async function pay() {
    if (!draftBookingId) return;
    setError('');
    setPhase('issuing');
    setIssueStep(1);
    
    // Simulate UI delay for visual saga steps
    await new Promise(r => setTimeout(r, 700));
    setIssueStep(2);
    
    const res = await payBooking(draftBookingId, method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab');
    if (!res.success) {
      setError(res.error || 'Payment failed');
      setPhase('payment');
      return;
    }
    
    await new Promise(r => setTimeout(r, 1100));
    setIssueStep(3);
    await new Promise(r => setTimeout(r, 900));
    
    setConfirmedRef('FZO-' + draftBookingId.slice(-6).toUpperCase());
    setConfirmedTitle(bookingContext!.title);
    setPhase('success');
  }

  const issuingSteps = [
    'قفل وجه در کیف پول (Saga)',
    'صدور قطعی PNR از سمت تامین‌کننده',
    'تسویه نهایی و صدور رسید',
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
      {!bookingContext && phase !== 'success' ? (
        <div className="max-w-md mx-auto bg-surface rounded-xl border border-line p-12 text-center mt-10 shadow-elev-1">
          <Luggage size={48} className="mx-auto text-line mb-4" />
          <h1 className="font-black text-[19px] text-ink mb-2">سبد سفارش خالی است</h1>
          <p className="text-[13px] font-bold text-sub mb-6">ابتدا یک سرویس انتخاب کنید</p>
          <Button onClick={() => router.push('/services')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-8 font-black rounded-xl">
            مشاهده خدمات
          </Button>
        </div>
      ) : phase !== 'success' ? (
        <>
          {/* Progress Stepper */}
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-line mb-8">
            <div className="flex items-center justify-between relative max-w-2xl mx-auto">
              <div className="absolute start-0 end-0 top-1/2 h-0.5 bg-line -z-10 translate-y-[-50%]"></div>
              
              <div className={`absolute start-0 top-1/2 h-0.5 bg-brand -z-10 translate-y-[-50%] transition-all duration-500`} style={{ width: phase === 'passengers' ? '0%' : (phase === 'payment' || phase === 'issuing') ? '50%' : '100%' }}></div>

              <div className="flex flex-col items-center gap-2 bg-surface px-2 md:px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[14px] shadow-sm transition-colors ${phase !== 'passengers' ? 'bg-brand text-surface' : 'border-2 border-brand text-brand'}`}>
                  {phase !== 'passengers' ? <CheckCircle2 size={18} /> : '1'}
                </div>
                <span className={`font-bold text-[12px] md:text-[14px] ${phase === 'passengers' ? 'text-brand' : 'text-sub'}`}>مشخصات مسافران</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 bg-surface px-2 md:px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[14px] shadow-sm transition-colors ${phase === 'issuing' ? 'bg-brand text-surface' : phase === 'payment' ? 'border-2 border-brand text-brand' : 'bg-line text-sub'}`}>
                  {phase === 'issuing' ? <CheckCircle2 size={18} /> : '2'}
                </div>
                <span className={`font-bold text-[12px] md:text-[14px] ${phase === 'payment' ? 'text-brand' : 'text-sub'}`}>پرداخت</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 bg-surface px-2 md:px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[14px] shadow-sm transition-colors ${phase === 'issuing' ? 'border-2 border-brand text-brand' : 'bg-line text-sub'}`}>
                  {'3'}
                </div>
                <span className={`font-bold text-[12px] md:text-[14px] ${phase === 'issuing' ? 'text-brand' : 'text-sub'}`}>صدور کارت</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              {phase === 'passengers' && (
                <form onSubmit={handleSubmit(onSubmit)} className="bg-surface rounded-xl border border-line p-6 shadow-elev-1">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-line/40">
                    <h2 className="text-[17px] font-black text-ink flex items-center gap-2">
                      <User size={20} className="text-brand" /> اطلاعات مسافر اصلی
                    </h2>
                    <Button
                      type="button"
                      variant={passportNoValue ? 'outline' : 'default'}
                      className={`font-black rounded-xl ${passportNoValue ? 'border-success text-success bg-success/10' : 'bg-brand hover:bg-brand-2 text-surface'}`}
                      onClick={scanPassport}
                      disabled={scanning}
                    >
                      {scanning ? (
                        <><Loader2 size={16} className="animate-spin ms-1" /> در حال اسکن...</>
                      ) : passportNoValue ? (
                        <><CheckCircle2 size={16} /> پاسپورت اسکن شد</>
                      ) : (
                        <><ScanLine size={16} /> اسکن پاسپورت (OCR)</>
                      )}
                    </Button>
                  </div>
                  <div className="bg-flight/10 text-flight font-bold text-[12.5px] p-4 rounded-xl mb-6">
                    اطلاعات را دقیقاً مطابق پاسپورت وارد کنید. اسکن OCR خطای تایپی را حذف می‌کند.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">نام (لاتین)</label>
                      <Input {...register('firstName')} placeholder="FIRST NAME" dir="ltr" className="uppercase font-bold border-line rounded-xl" />
                      {errors.firstName && <span className="text-rose-warm text-xs font-bold">{errors.firstName.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">نام خانوادگی (لاتین)</label>
                      <Input {...register('lastName')} placeholder="LAST NAME" dir="ltr" className="uppercase font-bold border-line rounded-xl" />
                      {errors.lastName && <span className="text-rose-warm text-xs font-bold">{errors.lastName.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">کد ملی</label>
                      <Input {...register('nationalId')} placeholder="0123456789" inputMode="numeric" dir="ltr" className="uppercase font-bold border-line rounded-xl" />
                      {errors.nationalId && <span className="text-rose-warm text-xs font-bold">{errors.nationalId.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">شماره پاسپورت</label>
                      <Input {...register('passportNo')} placeholder="Lxxxxxxx" dir="ltr" className="uppercase font-bold border-line rounded-xl" />
                      {errors.passportNo && <span className="text-rose-warm text-xs font-bold">{errors.passportNo.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">تاریخ تولد میلادی</label>
                      <Controller
                        control={control}
                        name="birthDate"
                        render={({ field }) => (
                          <JalaliDatePicker value={field.value} onChange={(date) => field.onChange(date || '')} placeholder="YYYY-MM-DD" />
                        )}
                      />
                      {errors.birthDate && <span className="text-rose-warm text-xs font-bold">{errors.birthDate.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-bold text-sub">جنسیت</label>
                      <select {...register('gender')} className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-sm font-bold">
                        <option value="MALE">مرد</option>
                        <option value="FEMALE">زن</option>
                      </select>
                      {errors.gender && <span className="text-rose-warm text-xs font-bold">{errors.gender.message}</span>}
                    </div>
                  </div>
                  {error && <p className="text-rose-warm text-sm font-bold mt-4 p-2 bg-rose-warm/10 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full h-12 mt-6 bg-brand hover:bg-brand-2 text-surface font-black rounded-xl">
                    ادامه به پرداخت
                  </Button>
                </form>
              )}

              {(phase === 'payment' || phase === 'issuing') && (
                <div className="flex flex-col gap-8">
                  {/* Payment Methods */}
                  <div className="bg-surface rounded-xl border border-line p-8 shadow-sm flex flex-col gap-6">
                    <h2 className="text-[24px] font-black text-brand mb-2">روش پرداخت</h2>
                    <div className="flex flex-col gap-4">
                      {/* Gateway */}
                      <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl cursor-pointer transition-colors border-2 ${method === 'gateway' ? 'border-brand bg-brand/5' : 'border-line hover:bg-soft'}`}>
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                          <input type="radio" name="paymentMethod" checked={method === 'gateway'} onChange={() => setMethod('gateway')} className="w-5 h-5 accent-brand" disabled={phase === 'issuing'} />
                          <div className="flex flex-col">
                            <span className="font-black text-[16px] text-ink">درگاه بانکی شتاب</span>
                            <span className="font-bold text-[14px] text-sub">پرداخت آنلاین با تمامی کارت‌های عضو شتاب</span>
                          </div>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="h-8 object-contain self-end sm:self-auto" alt="Bank logos" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWCjE10ZK_i22XArjG7dfBWNaXVdroYfN2kud2zbTOJ5LUfdimii4-hRvr2lzq_PRe3qLcKhFz8IM-fG1a5QN_7YXD3lXy0E7CydszDs3TolYtCpI4AuheXugoHqGinKZwQKjYNJ9b6sE4zoOlDq7tsLqqdAcd6wwqap2FCsjR21ecNBFwLNi7P2Zqsh0FEKRzlJ99RNne3TQpwptT_R1xakSbqRk4pkYYGIKGiL-E-0LqDl4KUfj1"/>
                      </label>
                      
                      {/* Wallet */}
                      <label className={`flex items-center justify-between p-5 rounded-xl cursor-pointer transition-colors border-2 ${method === 'wallet_irr' ? 'border-brand bg-brand/5' : 'border-line hover:bg-soft'}`}>
                        <div className="flex items-center gap-4">
                          <input type="radio" name="paymentMethod" checked={method === 'wallet_irr'} onChange={() => setMethod('wallet_irr')} className="w-5 h-5 accent-brand" disabled={phase === 'issuing'} />
                          <div className="flex flex-col">
                            <span className="font-black text-[16px] text-ink">کیف پول ریالی</span>
                            <span className="font-bold text-[14px] text-sub">موجودی: {wallet.IRR.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        </div>
                        <WalletIcon className="text-sub w-8 h-8" />
                      </label>
                    </div>

                    {/* Discount Code */}
                    <div className="mt-4 pt-6 border-t border-line">
                      <label className="font-black text-[14px] text-ink mb-3 block">کد تخفیف دارید؟</label>
                      <div className="flex gap-2">
                        <input className="flex-grow px-4 py-3 rounded-xl border border-line bg-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-ink font-bold text-[16px]" placeholder="کد تخفیف خود را وارد کنید" type="text" disabled={phase === 'issuing'} />
                        <Button className="px-6 py-3 h-auto bg-action/20 text-action hover:bg-action/30 rounded-full font-black text-[14px] transition-colors" disabled={phase === 'issuing'}>اعمال</Button>
                      </div>
                    </div>
                  </div>

                  {/* Reference Image */}
                  <div className="bg-surface rounded-xl overflow-hidden shadow-sm border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Payment Context" className="w-full h-32 md:h-48 object-cover opacity-80 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida/AEtjO1XS9ihnEeNRByhe-6iEV-bcLEq8ie0Nlfic2wkvPALD2AoEyh9o81G8idkVvHn2Lfb-CmS5L_zveNPlW37moLsoB31Q_Mvx_C-y88-btC3pWttPBnLYKX_5jwkdwsqzittueO8v3MBz5fd_mBPa-BoaLEokTcbcNMMqmZjuxzfDWZKqWe_qik2edI5cLwhXkVCpD86gH1t5iPGdzc3cyQL6GcX19m93uBA0yvOZa9TS-aR5gm2ucdJbvwo"/>
                  </div>

                  {phase === 'issuing' && (
                    <div className="bg-surface rounded-xl border border-line p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <Loader2 size={18} className="animate-spin text-brand" />
                        <p className="font-black text-ink">در حال صدور...</p>
                        <span className="me-auto bg-hotel/15 text-hotel text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Lock size={11} /> وجه قفل شده — {countdown.toLocaleString('fa-IR')} ثانیه
                        </span>
                      </div>
                      <ol className="space-y-2.5">
                        {issuingSteps.map((s, i) => (
                          <li key={s} className="flex items-center gap-2 text-[13px] font-bold">
                            {issueStep > i ? (
                              <CheckCircle2 size={16} className="text-success" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-line" />
                            )}
                            <span className={issueStep > i ? 'text-ink' : 'text-sub'}>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {error && <p className="text-rose-warm text-sm font-bold mt-4 p-4 bg-rose-warm/10 rounded-xl">{error}</p>}
                </div>
              )}
            </div>

            <aside className="lg:w-[350px] shrink-0 space-y-6">
              {/* Main Booking Summary */}
              <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden sticky top-24">
                <div className="p-6 border-b border-line">
                  <h3 className="font-black text-[24px] text-brand mb-4">جزئیات سفارش</h3>
                  
                  {/* Hero Context Image */}
                  <div className="w-full h-24 mb-6 rounded-xl overflow-hidden bg-soft relative">
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAEnLVpSty3-rj6-m1PQSmmkAtmsXb0t1COv2cAwPSTIM3GR-pnPg1yVlN3MdNsgKTbASR_cOGv2d8s1m4qZgFmlUe23VBpvVtZ8ymYyHXpa2BzNmjFoO-acqE04K3ZZ_6iBcVtAIV-H-uWb4CnqbXit828-oTFHAs5Dy4Kx9d5TPR7qUjAv3NKfPijHvppgAWsEOwcZUUUupZoDmuZDp6YgV6CPlb38RuLAolYfue1HxtYuYue6habGZsg3TBKTMicwg')" }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="text-brand w-10 h-10" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <span className="font-black text-[16px] text-ink">{bookingContext!.title}</span>
                      <span className="font-bold text-[12px] text-brand bg-brand/10 px-2 py-1 rounded">{bookingContext!.subtitle}</span>
                    </div>
                    {bookingContext!.type === 'flights' && (
                      <div className="flex gap-2 items-center text-sub font-bold text-[14px] mt-2">
                        <User size={16} />
                        <span>۲ مسافر (نمونه)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="p-6 bg-soft/50">
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex justify-between items-center font-bold text-[16px] text-sub">
                      <span>مبلغ سرویس‌ها</span>
                      <span className="num">{bookingContext!.amount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    
                    {addEsim && (
                      <div className="flex justify-between items-center font-bold text-[14px] text-sub">
                        <span>eSIM مقصد</span>
                        <span className="num">{ESIM_PRICE.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    )}
                    {addInsurance && (
                      <div className="flex justify-between items-center font-bold text-[14px] text-sub">
                        <span>بیمه مسافرتی</span>
                        <span className="num">{INSURANCE_PRICE.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center font-bold text-[16px] text-sub">
                      <span>مالیات و خدمات</span>
                      <span className="num text-[14px]">محاسبه شده در هزینه</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-[16px] text-rose-warm">
                      <span>تخفیف</span>
                      <span className="num">۰ تومان</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-line flex justify-between items-center mb-6">
                    <span className="font-black text-[20px] text-ink">مبلغ قابل پرداخت</span>
                    <div className="text-start">
                      <p className="text-2xl font-black text-price num">{formatMoney(total, charge.currency)}</p>
                      <p className="text-[12px] font-bold text-sub">{charge.isHome ? 'تومان' : `ارز شارژ: ${charge.currency}`}</p>
                    </div>
                  </div>

                  <Button onClick={pay} disabled={phase !== 'payment'} className="w-full bg-action hover:bg-action-hover text-[#14201f] h-14 rounded-full font-black text-[18px] shadow-sm transition-colors flex items-center justify-center gap-2">
                    پرداخت نهایی
                    <ArrowRight size={20} className="rtl:rotate-180 transition-transform" />
                  </Button>

                  <div className="flex items-center justify-center gap-2 mt-4 text-sub font-bold text-[12px]">
                    <Lock size={14} className="text-brand" />
                    اطلاعات شما به صورت امن پردازش می‌شود
                  </div>
                </div>
              </div>

              {/* Addons Section */}
              <div className="bg-surface rounded-xl border border-line p-6 shadow-sm">
                 <h3 className="font-black text-[16px] text-ink mb-4">خدمات تکمیلی</h3>
                 <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={addEsim} onChange={(e) => setAddEsim(e.target.checked)} className="accent-brand mt-1 w-4 h-4" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-[14px] font-black text-ink"><Wifi size={16} className="text-brand" /> بسته eSIM مقصد</span>
                      <span className="block text-[12px] font-bold text-sub mt-1">۱۰ گیگ، فعال‌سازی فوری</span>
                    </span>
                    <span className="text-[14px] font-black text-brand shrink-0 num">+{ESIM_PRICE.toLocaleString('fa-IR')}</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={addInsurance} onChange={(e) => setAddInsurance(e.target.checked)} className="accent-brand mt-1 w-4 h-4" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-[14px] font-black text-ink"><ShieldCheck size={16} className="text-success" /> بیمه مسافرتی</span>
                      <span className="block text-[12px] font-bold text-sub mt-1">پوشش تا €۳۰٬۰۰۰</span>
                    </span>
                    <span className="text-[14px] font-black text-brand shrink-0 num">+{INSURANCE_PRICE.toLocaleString('fa-IR')}</span>
                  </label>
                 </div>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto bg-surface rounded-xl border border-line p-10 text-center mt-10 shadow-elev-1">
          <CheckCircle2 size={60} className="mx-auto text-success mb-5" />
          <h1 className="text-[20px] font-black text-ink mb-2">پرداخت با موفقیت انجام شد</h1>
          <p className="text-[13.5px] font-bold text-sub mb-6">رزرو شما قطعی شد و کارت سفر دیجیتال آماده است</p>
          <div className="bg-soft rounded-xl p-5 mb-6 text-start space-y-2 text-[13px] font-bold">
            <div className="flex justify-between"><span className="text-sub">کد رهگیری:</span><b className="text-ink font-black tracking-widest" dir="ltr">{confirmedRef}</b></div>
            <div className="flex justify-between"><span className="text-sub">عنوان:</span><b className="text-ink font-black">{confirmedTitle}</b></div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/my-trips')} className="flex-1 h-12 bg-brand hover:bg-brand-2 text-surface font-black rounded-xl">
              مشاهده کارت سفر
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="h-12 px-6 font-black border-line text-sub hover:text-ink rounded-xl">
              صفحه اصلی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
