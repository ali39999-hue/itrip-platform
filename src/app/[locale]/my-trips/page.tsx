'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { useHydration } from '@/hooks/useHydration';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { shimmerDataUrl } from '@/lib/image-utils';
import { Link } from '@/i18n/routing';
import {
  Plane, QrCode, RotateCcw, Luggage,
  MapPin, BedDouble, CarFront, FileCheck2, Wifi, ShieldCheck,
  TrainFront, LogOut, Settings, Gift, User, LayoutGrid,
  PlaneTakeoff, Award
} from 'lucide-react';
import { lt } from '@/lib/lt';

const TYPE_META: Record<Booking['type'], { label: string; icon: typeof Plane; image: string }> = {
  flights: { label: 'پرواز', icon: Plane, image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=70&w=800' },
  hotels: { label: 'اقامتگاه', icon: BedDouble, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=800' },
  tours: { label: 'تور', icon: MapPin, image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=70&w=800' },
  transfers: { label: 'ترانسفر', icon: CarFront, image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=70&w=800' },
  trains: { label: 'قطار', icon: TrainFront, image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=70&w=800' },
  visa: { label: 'ویزا', icon: FileCheck2, image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=70&w=800' },
  esim: { label: 'eSIM', icon: Wifi, image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=70&w=800' },
  insurance: { label: 'بیمه', icon: ShieldCheck, image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=70&w=800' },
  'city-pass': { label: 'فیروز پاس', icon: Award, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=70&w=800' },
  snapp: { label: 'شارژ اسنپ', icon: CarFront, image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=70&w=800' },
  interpreter: { label: 'مترجم همزمان', icon: User, image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=70&w=800' },
  travelogue: { label: 'سفرنامه', icon: MapPin, image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=70&w=800' },
};

export default function MyTripsPage() {
  const t = useTranslations('MyTrips');
  const locale = useLocale();
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
          <div className="p-6 border-b border-line flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-sm border-2 border-surface relative">
              <Image 
                alt="Profile" 
                className="object-cover" 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=70&w=160" 
                fill
                sizes="80px"
              />
            </div>
            <h2 className="text-[20px] font-black text-brand mb-1">{lt(locale, { fa: 'سلام، علی رضایی', en: 'Hello, John Doe', ar: 'مرحباً، علي رضائي', zh: '您好，阿里·雷扎伊', ru: 'Привет, Али Резаи' })}</h2>
            <p className="font-bold text-[13px] text-sub">{lt(locale, { fa: 'امتیاز شما: ۲۵۰۰', en: 'Reward points: 2,500', ar: 'نقاطك: 2,500', zh: '您的积分：2,500', ru: 'Ваши баллы: 2 500' })}</p>
          </div>
          
          <nav className="flex flex-col gap-2 p-4">
            <Link href="/account" className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <LayoutGrid size={20} />
              {lt(locale, { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', ru: 'Панель управления' })}
            </Link>
            <Link href="/my-trips" className="bg-brand text-surface flex items-center gap-3 px-4 py-3 font-black text-[14px] rounded-xl shadow-sm cursor-pointer">
              <PlaneTakeoff size={20} />
              {t('title')}
            </Link>
            <Link href="/account" className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <User size={20} />
              {lt(locale, { fa: 'پروفایل کاربری', en: 'Profile', ar: 'الملف الشخصي', zh: '个人资料', ru: 'Профиль' })}
            </Link>
            <Link href="/wallet" className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <Gift size={20} />
              {lt(locale, { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards', ar: 'المحفظة والمكافآت', zh: '钱包与奖励', ru: 'Кошелёк и бонусы' })}
            </Link>
            <Link href="/account" className="text-sub flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl hover:bg-surface transition-all cursor-pointer">
              <Settings size={20} />
              {lt(locale, { fa: 'تنظیمات', en: 'Settings', ar: 'الإعدادات', zh: '设置', ru: 'Настройки' })}
            </Link>
          </nav>
          
          <div className="p-4 mt-auto">
            <button className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors font-black text-[14px]">
              <LogOut size={20} />
              {lt(locale, { fa: 'خروج', en: 'Sign Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти' })}
            </button>
          </div>
        </aside>

        {/* Main Dashboard Content */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="w-full h-56 rounded-2xl overflow-hidden shadow-sm relative mb-2">
            <Image 
              alt={t('title')} 
              className="object-cover" 
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=75&w=1800" 
              fill
              sizes="100vw"
              placeholder="blur"
              blurDataURL={shimmerDataUrl(1800, 300)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
            <div className="absolute bottom-8 end-8 text-surface">
              <h1 className="font-black text-[28px] md:text-[32px] mb-2">{t('title')}</h1>
              <p className="font-bold text-[15px] md:text-[16px] text-surface/90">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center border-b border-line mb-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button 
              onClick={() => setTab('upcoming')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'upcoming' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              {t('upcoming')} ({upcoming.length})
            </button>
            <button 
              onClick={() => setTab('past')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'past' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              {t('past')}
            </button>
            <button 
              onClick={() => setTab('finance')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === 'finance' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'}`}
            >
              {t('cancelled')}
            </button>
          </div>

          {tab === 'finance' ? (
            <LedgerView />
          ) : filtered.length === 0 ? (
            <div className="bg-surface rounded-xl border border-line p-14 text-center shadow-sm flex flex-col items-center justify-center">
              <Luggage size={64} className="text-line mb-6" />
              <p className="font-black text-[20px] text-ink mb-2">{t('noTrips')}</p>
              <p className="font-bold text-[14px] text-sub mb-8">{lt(locale, { fa: 'با فیروز سفر رویاهاتون رو برنامه‌ریزی کنید.', en: 'Start planning your next adventure with Firuzo.', ar: 'ابدأ التخطيط لرحلة أحلامك مع فيروزو.', zh: '与 Firuzo 一起规划您的梦想之旅。', ru: 'Начните планировать путешествие мечты с Firuzo.' })}</p>
              <Button onClick={() => router.push('/services')} className="bg-brand hover:bg-brand-2 text-surface h-12 px-8 font-black rounded-xl text-[15px]">
                {lt(locale, { fa: 'مشاهده خدمات سفر', en: 'Explore Travel Services', ar: 'استكشف خدمات السفر', zh: '浏览旅行服务', ru: 'Открыть туристические услуги' })}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filtered.map((b) => {
                const meta = TYPE_META[b.type] || TYPE_META.flights;
                const Icon = meta.icon;
                return (
                  <article key={b.id} className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow border border-line overflow-hidden flex flex-col md:flex-row group">
                    <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-soft">
                      <Image 
                        alt={b.title} 
                        className="object-cover transition-transform duration-500 group-hover:scale-105" 
                        src={meta.image} 
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        placeholder="blur"
                        blurDataURL={shimmerDataUrl(400, 300)}
                      />
                      <div className={`absolute top-4 end-4 px-3 py-1.5 rounded-full font-black text-[12px] shadow-sm ${
                        b.status === 'confirmed' ? 'bg-brand text-surface' :
                        b.status === 'refunded' ? 'bg-line/90 text-sub' :
                        'bg-hotel text-surface'
                      }`}>
                        {b.status === 'confirmed' ? (lt(locale, { fa: 'در جریان', en: 'Confirmed', ar: 'مؤكدة', zh: '已确认', ru: 'Подтверждено' })) : b.status === 'refunded' ? (lt(locale, { fa: 'مسترد شده', en: 'Refunded', ar: 'تم الاسترداد', zh: '已退款', ru: 'Возвращено' })) : (lt(locale, { fa: 'در انتظار پرداخت', en: 'Pending', ar: 'في انتظار الدفع', zh: '待支付', ru: 'Ожидает оплаты' }))}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-sub flex items-center gap-1.5 bg-soft px-3 py-1 rounded-full">
                            <Icon size={14} className="text-brand-dark" />
                            {meta.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-sub">کد پیگیری: #{b.id.slice(0, 8)}</span>
                        </div>

                        <h3 className="font-black text-[20px] text-ink mb-1 group-hover:text-brand transition-colors">{b.title}</h3>
                        <p className="text-xs font-bold text-sub mb-4">{b.subtitle}</p>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-line text-xs font-bold">
                          <div>
                            <span className="text-sub block mb-1">{lt(locale, { fa: 'تاریخ حرکت / ورود:', en: 'Travel Date:', ar: 'تاريخ المغادرة / الوصول:', zh: '出发/到达日期：', ru: 'Дата выезда / заезда:' })}</span>
                            <span className="text-ink font-mono">{b.travelDate}</span>
                          </div>
                          <div>
                            <span className="text-sub block mb-1">{lt(locale, { fa: 'مبلغ پرداختی:', en: 'Amount Paid:', ar: 'المبلغ المدفوع:', zh: '已付金额：', ru: 'Оплачено:' })}</span>
                            <span className="text-price font-black text-[15px] font-mono num">
                              {b.amount.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-2">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push(`/book?id=${b.id}`)}
                            className="rounded-xl font-black text-xs gap-1.5 border-line hover:bg-soft"
                          >
                            <QrCode size={14} />
                            {t('viewVoucher')}
                          </Button>
                          {b.status === 'confirmed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => refundBooking(b.id)}
                              className="rounded-xl font-black text-xs text-rose-warm hover:bg-rose-warm/10 gap-1.5"
                            >
                              <RotateCcw size={14} />
                              {t('cancelTrip')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LedgerView() {
  const transactions = useBookingStore((s) => s.transactions);
  const locale = useLocale();

  return (
    <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
      <h3 className="font-black text-[18px] text-ink mb-4">{lt(locale, { fa: 'دفتر تراکنش‌های مالی و استردادها', en: 'Transaction & Refund History', ar: 'سجل المعاملات المالية والاستردادات', zh: '交易与退款记录', ru: 'История операций и возвратов' })}</h3>
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-sub text-sm font-bold">{lt(locale, { fa: 'هیچ تراکنشی ثبت نشده است.', en: 'No transactions found.', ar: 'لا توجد معاملات.', zh: '暂无交易记录。', ru: 'Операций пока нет.' })}</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center p-3.5 rounded-xl border border-line bg-soft/50 text-xs font-bold">
              <div>
                <span className="font-black text-ink block mb-0.5">{tx.description}</span>
                <span className="text-[11px] text-sub font-mono">{tx.createdAt} • {tx.type}</span>
              </div>
              <div className="text-end">
                <span className={`font-black text-base font-mono num ${tx.amount > 0 ? 'text-success' : 'text-rose-warm'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                </span>
                <span className="block text-[10.5px] text-sub">{tx.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
