'use client';

import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  UserRound, LayoutGrid, PlaneTakeoff, Gift, Settings, LogOut,
  ShieldAlert, Plane, BedDouble, Calendar, FileText,
  Clock
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function TripDetailsPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">{lt(locale, { fa: 'وارد نشده‌اید', en: 'Not Signed In', ar: 'لم تقم بتسجيل الدخول', zh: '未登录', ru: 'Вы не вошли в систему' })}</h1>
        <p className="text-[13px] font-bold text-sub mb-6">{lt(locale, { fa: 'برای مشاهده این صفحه ابتدا وارد شوید', en: 'Please sign in to view your itinerary voucher', ar: 'يرجى تسجيل الدخول لعرض تفاصيل الرحلة', zh: '请登录以查看行程单', ru: 'Войдите, чтобы увидеть ваучер поездки' })}</p>
        <Button onClick={() => router.push('/auth')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl">
          {lt(locale, { fa: 'ورود / ثبت‌نام', en: 'Sign In / Register', ar: 'تسجيل الدخول / إنشاء حساب', zh: '登录 / 注册', ru: 'Вход / Регистрация' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      
      {/* SideNavBar (Desktop & Mobile) */}
      <aside className="w-full md:w-72 shrink-0 bg-surface/95 backdrop-blur-xl rounded-3xl shadow-elev-1 h-fit md:sticky md:top-24 border border-line/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-line/60 flex flex-col items-center gap-3 bg-soft/30">
          <span className="w-20 h-20 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center border-4 border-surface shadow-sm">
            <UserRound size={36} />
          </span>
          <div className="text-center">
            <h2 className="text-xl font-black text-brand-dark">{locale === 'fa' ? `سلام، ${user.firstNameFa}` : `Hello, ${user.firstNameEn || user.firstNameFa}`}</h2>
            <p className="text-[13px] font-bold text-sub mt-1">{lt(locale, { fa: 'امتیاز شما: ۲۵۰۰', en: 'Reward points: 2,500', ar: 'نقاطك: 2,500', zh: '您的积分：2,500', ru: 'Ваши баллы: 2 500' })}</p>
          </div>
        </div>
        
        {/* Nav Links */}
        <nav className="flex flex-col gap-1 p-4">
          <button onClick={() => router.push('/account')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <LayoutGrid size={20} /> {lt(locale, { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', ru: 'Панель управления' })}
          </button>
          <button onClick={() => router.push('/my-trips')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black bg-brand/10 text-brand-dark transition-transform active:scale-95 text-start">
            <PlaneTakeoff size={20} /> {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的旅行', ru: 'Мои поездки' })}
          </button>
          <button onClick={() => router.push('/account')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <UserRound size={20} /> {lt(locale, { fa: 'پروفایل کاربری', en: 'Profile', ar: 'الملف الشخصي', zh: '个人资料', ru: 'Профиль' })}
          </button>
          <button onClick={() => router.push('/wallet')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <Gift size={20} /> {lt(locale, { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards', ar: 'المحفظة والمكافآت', zh: '钱包与奖励', ru: 'Кошелёк и бонусы' })}
          </button>
          <button onClick={() => router.push('/account')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <Settings size={20} /> {lt(locale, { fa: 'تنظیمات', en: 'Settings', ar: 'الإعدادات', zh: '设置', ru: 'Настройки' })}
          </button>
          {user.role === 'admin' && (
            <button onClick={() => router.push('/admin')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-brand hover:bg-brand/5 transition-colors mt-2 border border-brand/20 text-start">
              <ShieldAlert size={20} /> {lt(locale, { fa: 'پنل مدیریت', en: 'Admin Panel', ar: 'لوحة الإدارة', zh: '管理后台', ru: 'Панель администратора' })}
            </button>
          )}
        </nav>
        
        {/* Footer Action */}
        <div className="p-4 border-t border-line/60 bg-soft/30 mt-auto">
          <button onClick={() => { logout(); router.push('/'); }} className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors text-[14px] font-black">
            <LogOut size={18} /> {lt(locale, { fa: 'خروج از حساب', en: 'Log Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти из аккаунта' })}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-[36px] font-black text-ink mb-2 tracking-tight">
              {lt(locale, { fa: 'تور ترکیبی استانبول - آنتالیا', en: 'Istanbul - Antalya Combined Tour', ar: 'جولة إسطنبول وأنطاليا المدمجة', zh: '伊斯坦布尔与安塔利亚定制双城游', ru: 'Комбинированный тур Стамбул — Анталья' })}
            </h1>
            <p className="text-[15px] font-bold text-sub">
              {lt(locale, { fa: '۱۵ مهر - ۲۲ مهر | ۷ شب و ۸ روز | کد پیگیری: TRP-98421', en: 'Oct 7 - Oct 14 | 7 Nights, 8 Days | PNR: TRP-98421', ar: '15 أكتوبر - 22 أكتوبر | 7 ليالٍ و 8 أيام | رمز التتبع: TRP-98421', zh: '10月7日 - 10月14日 | 7晚8天 | 追踪码: TRP-98421', ru: '7 окт — 14 окт | 7 ночей, 8 дней | Код: TRP-98421' })}
            </p>
          </div>
          <Button onClick={() => window.print()} className="bg-brand hover:bg-brand-2 text-surface px-6 h-12 rounded-2xl font-black shadow-sm shrink-0 flex items-center gap-2">
            <FileText size={18} /> {lt(locale, { fa: 'دریافت برگه واچر / PDF', en: 'Download Voucher PDF', ar: 'تحميل قسيمة الحجز PDF', zh: '下载行程单 PDF', ru: 'Скачать ваучер PDF' })}
          </Button>
        </div>

        {/* Bento Grid Itinerary Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Flights Section (Timeline Style) */}
          <div className="lg:col-span-8 bg-surface/95 backdrop-blur-xl shadow-elev-1 rounded-3xl p-6 border border-line/80 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 border-b border-line/60 pb-4 relative z-10">
              <div className="bg-brand/10 text-brand-dark p-2.5 rounded-2xl">
                <Plane size={24} />
              </div>
              <h2 className="text-xl font-black text-brand-dark">{lt(locale, { fa: 'مسیر پروازی و بلیط‌ها', en: 'Flight Routes & Tickets', ar: 'مسارات الطيران والتذاكر', zh: '航班路线与机票', ru: 'Авиамаршрут и билеты' })}</h2>
            </div>
            
            <div className="flex flex-col gap-8 relative z-10 md:ps-0 ps-6 md:before:hidden before:absolute before:start-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-line">
              {/* Outbound Flight */}
              <div className="flex flex-col gap-3">
                <span className="font-black text-[13px] text-sub bg-soft w-fit px-4 py-1.5 rounded-full border border-line/50">
                  {lt(locale, { fa: 'پرواز رفت — ساعت ۰۸:۳۰', en: 'Outbound Flight — 08:30', ar: 'رحلة الذهاب — 08:30', zh: '去程航班 — 08:30', ru: 'Рейс туда — 08:30' })}
                </span>
                <div className="flex flex-col md:flex-row justify-between items-center bg-surface p-5 rounded-2xl border border-line/60 hover:shadow-md transition-shadow gap-6 md:gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-mint/40 grid place-items-center text-brand-dark font-black text-sm">W5</div>
                    <div>
                      <p className="font-black text-[15px] text-ink">Mahan Air</p>
                      <p className="font-bold text-[13px] text-sub mt-0.5">Flight W5-112 • Class Y</p>
                    </div>
                  </div>
                  <div className="flex items-center w-full md:w-auto px-2">
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink font-mono num">08:30</p>
                      <p className="font-bold text-[13px] text-sub mt-1">IKA (Tehran)</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-24 md:w-32 px-4 relative">
                      <p className="font-bold text-[12px] text-sub mb-2">3h 00m</p>
                      <div className="w-full h-[2px] bg-line relative">
                        <div className="absolute end-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <div className="absolute start-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <Plane size={18} className="absolute top-1/2 start-1/2 transform -translate-x-1/2 -translate-y-1/2 text-brand bg-surface px-0.5 rotate-[-90deg] rtl:rotate-[90deg]" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink font-mono num">11:30</p>
                      <p className="font-bold text-[13px] text-sub mt-1">IST (Istanbul)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Stay (Glassmorphism Card) */}
          <div className="lg:col-span-4 bg-surface/95 backdrop-blur-xl shadow-elev-1 rounded-3xl border border-line/80 overflow-hidden flex flex-col group">
            <div className="p-6 flex flex-col gap-4 flex-1">
              <h3 className="text-xl font-black text-ink mb-1">Hilton Bomonti Hotel</h3>
              <div className="flex items-center gap-1 text-gold text-sm font-bold">★★★★★ Luxury 5-Star</div>
              
              <div className="flex justify-between items-center border-b border-line/60 pb-3 mt-4">
                <div className="flex items-center gap-2 text-sub">
                  <Calendar size={18} />
                  <span className="font-black text-[13px]">{lt(locale, { fa: 'تاریخ ورود', en: 'Check-in', ar: 'تاريخ الدخول', zh: '入住日期', ru: 'Заезд' })}</span>
                </div>
                <span className="font-bold text-[14px] text-ink">14:00</span>
              </div>
              <div className="flex justify-between items-center border-b border-line/60 pb-3">
                <div className="flex items-center gap-2 text-sub">
                  <Clock size={18} />
                  <span className="font-black text-[13px]">{lt(locale, { fa: 'تاریخ خروج', en: 'Check-out', ar: 'تاريخ الخروج', zh: '退房日期', ru: 'Выезд' })}</span>
                </div>
                <span className="font-bold text-[14px] text-ink">12:00</span>
              </div>
              <div className="flex justify-between items-center border-b border-line/60 pb-3">
                <div className="flex items-center gap-2 text-sub">
                  <BedDouble size={18} />
                  <span className="font-black text-[13px]">{lt(locale, { fa: 'نوع اتاق', en: 'Room Type', ar: 'نوع الغرفة', zh: '房型', ru: 'Тип номера' })}</span>
                </div>
                <span className="font-bold text-[14px] text-ink">Standard Deluxe Double</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
