'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { useHydration } from '@/hooks/useHydration';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Plane, QrCode, RotateCcw, Luggage,
  MapPin, BedDouble, CarFront, FileCheck2, Wifi, ShieldCheck,
  TrainFront, LogOut, Settings, Gift, User, LayoutGrid, Info,
  PlaneTakeoff, Award
} from 'lucide-react';

const TYPE_META: Record<Booking['type'], { label: string; icon: typeof Plane; image: string }> = {
  flights: { label: 'پرواز', icon: Plane, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  hotels: { label: 'اقامتگاه', icon: BedDouble, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
  tours: { label: 'تور', icon: MapPin, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
  transfers: { label: 'ترانسفر', icon: CarFront, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  trains: { label: 'قطار', icon: TrainFront, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  visa: { label: 'ویزا', icon: FileCheck2, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
  esim: { label: 'eSIM', icon: Wifi, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  insurance: { label: 'بیمه', icon: ShieldCheck, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
  'city-pass': { label: 'فیروز پاس', icon: Award, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  snapp: { label: 'شارژ اسنپ', icon: CarFront, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHwxbxJZhuxsToCeTvMGFbfDTM-DD0-YKvto2CAFCLBXViNaGf5gK9GFSD7eCI_EeQ_4CswSYku_sVOlg5fYynsviX4AMdQHeriuMgJPpssruxbA1w2okoqN7a7qq-bnxhQP7aOLx_gvCehaHtijuxLBHZy02-sBx4528voW33omXj1RKGr1joZOM8Trvtdo6tqzCKa2GLb6gHSFbCc0dbhxYBRL6JMKFMYeHdLz0jIEfj4oKPZmP' },
  interpreter: { label: 'مترجم همزمان', icon: User, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
  travelogue: { label: 'سفرنامه', icon: MapPin, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCAHRAFbN5IN4_CtBlnkw6M7eyddJqkD1XsGVOr39E8oO_e79NplT0EFHUEjzTUAofpGCqfAf1H0Af0qTjcGPiHTKDwf5xekDYVfB09lNw8aLRyjVaEcaQqgQqFA41mQCmQ4dnpbN7RlDeMSEpCJ4YwZ-VVRBKKp0dtcnj2e_YXsW9ngq3N2DBx6OZeqHhySn2KEnL8XmxvlgbmVzBGJCed_g_SCrVpAUMnQgIrE4cJLaSFbTGEpz' },
};

const STATUS_FA: Record<Booking['status'], string> = {
  pending_payment: 'در انتظار پرداخت',
  confirmed: 'در جریان',
  cancelled: 'کنسل شده',
  refunded: 'مسترد شده',
};

export default function MyTripsPage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const bookings = useBookingStore((s) => s.bookings);
  const refundBooking = useBookingStore((s) => s.refundBooking);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'finance'>('upcoming');

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.travelDate >= now && b.status !== 'refunded');
  
  let filtered = bookings;
  if (tab === 'upcoming') {
    filtered = upcoming;
  } else if (tab === 'past') {
    filtered = bookings.filter((b) => b.travelDate < now || b.status === 'refunded' || b.status === 'cancelled');
  }

  if (!isHydrated) return null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:w-72 flex flex-col gap-4 bg-soft shadow-sm rounded-2xl h-fit lg:sticky top-24 shrink-0">
          {/* Header Profile */}
          <div className="p-6 border-b border-line flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-sm border-2 border-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Profile" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAd3DcNH95zM57BTZdKgEg68uitc71jD7slg2T9l68-d2cQx5hy-R2QvMa8ei61Q4PDXwaLqfrlmyMRMAdtlpTOCbxruK2qE6sc5OJa1XwX5AMlW8tPbF2H6Y9B_8pCd48ijia1ecjUWayXE9ci2d_ma96hfM2mD_lPbKcNPHnltPbXFZ3yZqhP5Nlma8db1je6c8K3PtwhMF-_QU3oe0HIWerzh-1Yi0BM5e2tkLLt462ny_12EX_I" 
              />
            </div>
            <h2 className="text-[20px] font-black text-brand mb-1">سلام، علی رضایی</h2>
            <p className="font-bold text-[13px] text-sub">امتیاز شما: ۲۵۰۰</p>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex flex-col gap-2 p-4">
            <a className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <LayoutGrid size={20} />
              داشبورد
            </a>
            <a className="bg-brand text-surface flex items-center gap-3 px-4 py-3 font-black text-[14px] rounded-xl shadow-sm cursor-pointer">
              <PlaneTakeoff size={20} />
              سفرهای من
            </a>
            <a className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <User size={20} />
              پروفایل کاربری
            </a>
            <a className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <Gift size={20} />
              باشگاه مشتریان
            </a>
            <a className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <Settings size={20} />
              تنظیمات
            </a>
          </nav>
          
          {/* Logout */}
          <div className="p-4 mt-auto">
            <button className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors font-black text-[14px]">
              <LogOut size={20} />
              خروج
            </button>
          </div>
        </aside>

        {/* Main Dashboard Content */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Contextual Banner Image */}
          <div className="w-full h-56 rounded-2xl overflow-hidden shadow-sm relative mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              alt="Travel dashboard hero banner" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvdrdiG6XLt64F1GcxDfOC0AAXSUvg3cvCB9ImFR-iVycBHmmfMA7WbZb4yhKl_x-DmQDdZThQq6tnAmHTtpGr__ASzrQgC07wiP7k-33GnNQSAa1wsu15lUuTStGN6Uiw2hmFREznn5kwnY8-uFxT9eEC_my-iCMGpjk6N73D_w9tic0Pg8uCpGH7eXzdoFHCTD-R0u6RL5Br10GDnXPQEx8cz9gn0zklxlajEqBMMvDaF1SLvP2XXZ7s1EiszHEMEA" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent"></div>
            <div className="absolute bottom-8 end-8 text-surface">
              <h1 className="font-black text-[28px] md:text-[32px] mb-2">مدیریت سفرهای شما</h1>
              <p className="font-bold text-[15px] md:text-[16px] text-surface/90">به راحتی بلیط‌ها، رزرو هتل و برنامه‌های تور خود را پیگیری کنید.</p>
            </div>
          </div>

          {/* Tabs / Filters */}
          <div className="flex items-center border-b border-line mb-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button 
              onClick={() => setTab('upcoming')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'upcoming' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              سفرهای پیش‌رو ({upcoming.length})
            </button>
            <button 
              onClick={() => setTab('past')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'past' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              سفرهای گذشته و کنسل‌شده
            </button>
            <button 
              onClick={() => setTab('finance')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'finance' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              مالی و استرداد
            </button>
          </div>

          {/* Tab Content */}
          {tab === 'finance' ? (
            <LedgerView />
          ) : filtered.length === 0 ? (
            <div className="bg-surface rounded-xl border border-line p-14 text-center shadow-sm flex flex-col items-center justify-center">
              <Luggage size={64} className="text-line mb-6" />
              <p className="font-black text-[20px] text-ink mb-2">هنوز سفری در این دسته ندارید</p>
              <p className="font-bold text-[14px] text-sub mb-8">با فیروز سفر رویاهاتون رو برنامه‌ریزی کنید.</p>
              <Button onClick={() => router.push('/services')} className="bg-brand hover:bg-brand-2 text-surface h-12 px-8 font-black rounded-xl text-[15px]">
                مشاهده خدمات سفر
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filtered.map((b) => {
                const meta = TYPE_META[b.type];
                const Icon = meta.icon;
                return (
                  <article key={b.id} className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow border border-line overflow-hidden flex flex-col md:flex-row group">
                    {/* Image Section */}
                    <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        alt={b.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        src={meta.image} 
                      />
                      <div className={`absolute top-4 end-4 px-3 py-1.5 rounded-full font-black text-[12px] shadow-sm ${
                        b.status === 'confirmed' ? 'bg-brand text-surface' :
                        b.status === 'refunded' ? 'bg-line/90 text-sub' :
                        'bg-hotel text-surface'
                      }`}>
                        {STATUS_FA[b.status]}
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-black text-[20px] text-brand mb-1">{b.title}</h3>
                          <p className="font-bold text-[14px] text-sub">{meta.label} • {b.subtitle}</p>
                        </div>
                        <div className="text-end">
                          <span className="block font-bold text-[12px] text-sub mb-1">تاریخ سفر</span>
                          <span className="font-black text-[15px] text-ink num" dir="ltr">{b.travelDate}</span>
                        </div>
                      </div>
                      
                      {/* Progress/Info Block */}
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-soft p-4 rounded-xl border border-line/50">
                        <div>
                          <span className="block font-bold text-[12px] text-sub mb-2">وضعیت تراکنش</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-[14px] text-ink">{b.amount.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        </div>
                        <div>
                          <span className="block font-bold text-[12px] text-sub mb-2">کد رهگیری</span>
                          <div className="flex items-center gap-2">
                            <QrCode size={16} className="text-sub" />
                            <b dir="ltr" className="font-mono text-ink tracking-widest text-[14px]">{b.reference}</b>
                          </div>
                        </div>
                        {b.addOns.length > 0 && (
                          <div className="md:col-span-2 pt-3 border-t border-line/50">
                            <span className="block font-bold text-[12px] text-sub mb-1">خدمات تکمیلی</span>
                            <span className="font-black text-[13px] text-brand">{b.addOns.join('، ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="mt-auto flex flex-wrap items-center justify-between pt-4 border-t border-line gap-4">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-sub">
                            <Icon size={16} />
                            <span className="font-bold text-[13px]">{meta.label}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {b.status === 'confirmed' && (
                            <button onClick={() => refundBooking(b.id)} className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-line rounded-xl text-sub hover:text-rose-warm hover:border-rose-warm hover:bg-rose-warm/5 transition-colors font-black text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                              <RotateCcw size={16} />
                              درخواست استرداد
                            </button>
                          )}
                          <Link href={`/my-trips/${b.id}`} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-surface rounded-full hover:bg-brand-2 transition-colors font-black text-[13px] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                            <Info size={16} />
                            مشاهده جزئیات
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Analytics/Rewards Widget */}
          <div className="bg-brand rounded-2xl p-6 md:p-8 text-surface shadow-sm flex flex-col md:flex-row justify-between items-center relative overflow-hidden mt-2">
            {/* Decorative pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative z-10 mb-6 md:mb-0 text-center md:text-start">
              <h3 className="font-black text-[20px] md:text-[24px] mb-2 flex items-center justify-center md:justify-start gap-2">
                <Gift className="text-action" size={24} />
                باشگاه مسافران فیروز
              </h3>
              <p className="font-bold text-[14px] md:text-[16px] text-surface/90">شما فقط ۵۰۰ امتیاز تا سطح نقره‌ای فاصله دارید!</p>
            </div>
            
            <div className="relative z-10 flex items-center gap-4 bg-surface/10 px-6 py-4 rounded-xl backdrop-blur-sm border border-surface/20">
              <div className="text-end">
                <span className="block font-black text-[28px] md:text-[32px] text-action drop-shadow-md num">۲,۵۰۰</span>
                <span className="font-bold text-[13px] text-surface/80">امتیاز فعلی</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-surface/20 flex items-center justify-center border-2 border-surface/40">
                <Award size={32} className="text-surface drop-shadow-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerView() {
  const transactions = useBookingStore((s) => s.transactions);
  if (transactions.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-line p-14 text-center text-sub font-bold text-[13.5px] shadow-sm">
        تراکنشی ثبت نشده است
      </div>
    );
  }
  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-sm">
      <table className="w-full text-[13px] font-bold">
        <thead className="bg-soft text-sub text-[11.5px]">
          <tr>
            <th className="p-4 text-start">شرح</th>
            <th className="p-4 text-start">کیف پول</th>
            <th className="p-4 text-end">مبلغ</th>
            <th className="p-4 text-start">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-t border-line/50">
              <td className="p-4 text-ink">{t.description}</td>
              <td className="p-4 text-sub" dir="ltr">{t.wallet}{t.resultWallet ? ` → ${t.resultWallet}` : ''}</td>
              <td className={`p-4 text-end font-black num ${t.type === 'refund' || t.type === 'deposit' ? 'text-success' : 'text-ink'}`} dir="ltr">
                {(t.resultAmount && t.resultWallet ? t.resultAmount : t.amount).toLocaleString()}
              </td>
              <td className="p-4">
                <span className={`text-[11px] font-black px-2.5 py-1.5 rounded-md border ${
                  t.status === 'completed' ? 'bg-success/10 text-success border-success/20'
                  : t.status === 'locked' ? 'bg-hotel/10 text-hotel border-hotel/20'
                  : 'bg-rose-warm/10 text-rose-warm border-rose-warm/20'
                }`}>
                  {t.status === 'completed' ? 'تسویه شد' : t.status === 'locked' ? 'قفل موقت' : 'ناموفق'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
