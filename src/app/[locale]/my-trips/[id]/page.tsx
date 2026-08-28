'use client';

import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  UserRound, LayoutGrid, PlaneTakeoff, Gift, Settings, LogOut,
  ShieldAlert, Plane, BedDouble, Calendar, Map, FileText,
  Clock, MapPin
} from 'lucide-react';

export default function TripDetailsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">وارد نشده‌اید</h1>
        <p className="text-[13px] font-bold text-sub mb-6">برای مشاهده این صفحه ابتدا وارد شوید</p>
        <Button onClick={() => router.push('/auth')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl">
          ورود / ثبت‌نام
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      
      {/* SideNavBar (Desktop & Mobile) */}
      <aside className="w-full md:w-72 shrink-0 bg-surface rounded-xl shadow-elev-1 h-fit md:sticky md:top-24 border border-line/40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-line/60 flex flex-col items-center gap-3 bg-soft/30">
          <span className="w-20 h-20 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center border-4 border-white shadow-sm">
            <UserRound size={36} />
          </span>
          <div className="text-center">
            <h2 className="text-xl font-black text-brand-dark">سلام، {user.firstNameFa}</h2>
            <p className="text-[13px] font-bold text-sub mt-1">امتیاز شما: ۲۵۰۰</p>
          </div>
        </div>
        
        {/* Nav Links */}
        <nav className="flex flex-col gap-1 p-4">
          <button onClick={() => router.push('/account')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <LayoutGrid size={20} /> داشبورد
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black bg-brand/10 text-brand-dark transition-transform active:scale-95">
            <PlaneTakeoff size={20} /> سفرهای من
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <UserRound size={20} /> پروفایل کاربری
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <Gift size={20} /> باشگاه مشتریان
          </button>
          <button onClick={() => router.push('/account')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <Settings size={20} /> تنظیمات
          </button>
          {user.role === 'admin' && (
            <button onClick={() => router.push('/admin')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-brand hover:bg-brand/5 transition-colors mt-2 border border-brand/20">
              <ShieldAlert size={20} /> پنل مدیریت
            </button>
          )}
        </nav>
        
        {/* Footer Action */}
        <div className="p-4 border-t border-line/60 bg-soft/30 mt-auto">
          <button onClick={() => { logout(); router.push('/'); }} className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors text-[14px] font-black">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-[36px] font-black text-ink mb-2 tracking-tight">تور ترکیبی استانبول - آنتالیا</h1>
            <p className="text-[15px] font-bold text-sub">۱۵ مهر - ۲۲ مهر | ۷ شب و ۸ روز | کد رهگیری: TRP-98421</p>
          </div>
          <Button className="bg-brand hover:bg-brand-2 text-surface px-6 h-12 rounded-full font-black shadow-sm shrink-0 flex items-center gap-2">
            <FileText size={18} /> دریافت فایل PDF
          </Button>
        </div>

        {/* Bento Grid Itinerary Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Flights Section (Timeline Style) */}
          <div className="lg:col-span-8 bg-surface shadow-sm rounded-xl p-6 border border-line/50 relative overflow-hidden group">
            <div className="absolute -end-10 -top-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl group-hover:bg-brand/20 transition-colors"></div>
            <div className="flex items-center gap-3 mb-6 border-b border-line/60 pb-4 relative z-10">
              <div className="bg-brand/10 text-brand-dark p-2.5 rounded-xl">
                <Plane size={24} />
              </div>
              <h2 className="text-xl font-black text-brand-dark">مسیر پروازی</h2>
            </div>
            
            <div className="flex flex-col gap-8 relative z-10">
              {/* Outbound Flight */}
              <div className="flex flex-col gap-3">
                <span className="font-black text-[13px] text-sub bg-soft w-fit px-4 py-1.5 rounded-full border border-line/50">رفت - ۱۵ مهر</span>
                <div className="flex flex-col md:flex-row justify-between items-center bg-surface p-5 rounded-xl border border-line/50 hover:shadow-md transition-shadow gap-6 md:gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Mahan Air" className="w-14 h-14 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVEefg8xUL60eIR-jZlX3ltR6ocvrZ22CSAabVUSjzn6iYpZm7Ej64TMeGLvlbCsZ4Qp_r0ditl0bfuCokls_3m3uEdjO8X5sBnlsplmO6z_2K1QVchZlfYgQzlZPWR-o_5v8mMwZrDw4L_ZzS_338riW8QkorOLWRBAGg0T5E7wCGbgutMsnCB6UCgScG4eIJ4YPo4MLLkshwPcAv0IkpzKUhrBOpKOJ7pkTVpo4lfYgT_ODylvqR" />
                    <div>
                      <p className="font-black text-[15px] text-ink">ماهان ایر</p>
                      <p className="font-bold text-[13px] text-sub mt-0.5">پرواز W5-112</p>
                    </div>
                  </div>
                  <div className="flex items-center w-full md:w-auto px-2">
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink">۰۸:۳۰</p>
                      <p className="font-bold text-[13px] text-sub mt-1">تهران (IKA)</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-24 md:w-32 px-4 relative">
                      <p className="font-bold text-[12px] text-sub mb-2">۳ ساعت</p>
                      <div className="w-full h-[2px] bg-line relative">
                        <div className="absolute end-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <div className="absolute start-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <Plane size={18} className="absolute top-1/2 start-1/2 transform -translate-x-1/2 -translate-y-1/2 text-brand bg-surface px-0.5 rotate-[-90deg] rtl:rotate-[90deg]" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink">۱۱:۳۰</p>
                      <p className="font-bold text-[13px] text-sub mt-1">استانبول (IST)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Flight */}
              <div className="flex flex-col gap-3">
                <span className="font-black text-[13px] text-sub bg-soft w-fit px-4 py-1.5 rounded-full border border-line/50">برگشت - ۲۲ مهر</span>
                <div className="flex flex-col md:flex-row justify-between items-center bg-surface p-5 rounded-xl border border-line/50 hover:shadow-md transition-shadow gap-6 md:gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Turkish Airlines" className="w-14 h-14 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjJF8Qmfxl5DFi2Ov9G4l9ZGOALW3e94IvZox770JKOmWgkkdI2JV6s06Lyko75ptz-ctTU6zZUp-EZCNsA7wcl7huPTSfReozeQicySnKmyPLu81gQu8OffFmsedDqhVYBTclLfaCv0UJOlCniwnfx24GAE4TfgkdvJHmhtcm9FVSATuRZSyHDAn_tzutYD78BQh34X7Ic-X_zyXT2pHQeo7WHGg6PTgjGV1VVcIO91k9cPf4EmsI" />
                    <div>
                      <p className="font-black text-[15px] text-ink">ترکیش ایرلاینز</p>
                      <p className="font-bold text-[13px] text-sub mt-0.5">پرواز TK-874</p>
                    </div>
                  </div>
                  <div className="flex items-center w-full md:w-auto px-2">
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink">۱۶:۴۵</p>
                      <p className="font-bold text-[13px] text-sub mt-1">آنتالیا (AYT)</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-24 md:w-32 px-4 relative">
                      <p className="font-bold text-[12px] text-sub mb-2">۴ ساعت</p>
                      <div className="w-full h-[2px] bg-line relative">
                        <div className="absolute end-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <div className="absolute start-0 -top-1 w-2.5 h-2.5 rounded-full bg-brand"></div>
                        <Plane size={18} className="absolute top-1/2 start-1/2 transform -translate-x-1/2 -translate-y-1/2 text-brand bg-surface px-0.5 rotate-[-90deg] rtl:rotate-[90deg]" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-2xl text-ink">۲۰:۴۵</p>
                      <p className="font-bold text-[13px] text-sub mt-1">تهران (IKA)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Stay (Glassmorphism Card) */}
          <div className="lg:col-span-4 bg-surface shadow-sm rounded-xl border border-line/50 overflow-hidden flex flex-col group">
            <div className="h-48 w-full relative overflow-hidden bg-brand-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvPDCK_lXFsQvRLL4q_Cxn_yjmEiOx3cDqULhzx8yQDLSqhJD1tdSOWiS1z11ApbraZJbAEmoJS6dukRTsejBDEFXEa5WYkL3ONLKr0P_CjS5OkbOf07Un2ghsYwl_78EgCK-ZRD0FG--bAWg87e3C-UHRdjkGYpzjMQHCfj0CLqdg-9NJzHhrMT3RdbfQT_d9e-50qQKcUBhfgGzkl8M8vD6Tmdfb7P8HQRGO_jemwkuovlL0DRtN" alt="Hilton Bomonti" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-5 end-5 text-surface">
                <h3 className="text-xl font-black mb-1.5">هتل هیلتون بومونتی</h3>
                <div className="flex items-center gap-1 text-mint-bright">
                  <span className="text-lg">★★★★★</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-4 flex-1">
              <div className="flex justify-between items-center border-b border-line/60 pb-3">
                <div className="flex items-center gap-2 text-sub">
                  <Calendar size={18} />
                  <span className="font-black text-[13px]">ورود</span>
                </div>
                <span className="font-bold text-[14px] text-ink">۱۵ مهر - ۱۴:۰۰</span>
              </div>
              <div className="flex justify-between items-center border-b border-line/60 pb-3">
                <div className="flex items-center gap-2 text-sub">
                  <Clock size={18} />
                  <span className="font-black text-[13px]">خروج</span>
                </div>
                <span className="font-bold text-[14px] text-ink">۱۸ مهر - ۱۲:۰۰</span>
              </div>
              <div className="flex justify-between items-center border-b border-line/60 pb-3">
                <div className="flex items-center gap-2 text-sub">
                  <BedDouble size={18} />
                  <span className="font-black text-[13px]">نوع اتاق</span>
                </div>
                <span className="font-bold text-[14px] text-ink">دبل استاندارد</span>
              </div>
              <div className="mt-auto pt-2">
                <Button variant="outline" className="w-full bg-soft border-line/80 hover:bg-line/40 hover:border-brand/30 transition-colors h-11 rounded-xl font-black text-[14px] text-brand-dark flex items-center justify-center gap-2">
                  <Map size={18} /> نمایش روی نقشه
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Itinerary (Timeline style) */}
        <div className="bg-surface shadow-sm rounded-xl p-6 border border-line/50">
          <div className="flex items-center gap-3 mb-8 border-b border-line/60 pb-4">
            <div className="bg-mint/30 text-brand-dark p-2.5 rounded-xl">
              <MapPin size={24} />
            </div>
            <h2 className="text-xl font-black text-brand-dark">برنامه سفر روزانه</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Vertical Timeline Line */}
            <div className="hidden md:block absolute end-1/2 top-0 bottom-0 w-0.5 bg-line transform translate-x-1/2"></div>
            
            {/* Day 1 */}
            <div className="md:col-span-1 md:ps-12 md:pe-0 relative flex justify-end md:justify-start">
              {/* Timeline Dot */}
              <div className="hidden md:flex absolute -start-3.5 top-5 w-7 h-7 rounded-full bg-brand border-4 border-surface items-center justify-center z-10"></div>
              
              <div className="bg-surface rounded-xl p-5 border border-line/60 hover:shadow-md transition-shadow group w-full relative z-0">
                <h4 className="font-black text-lg text-ink mb-2">روز اول - ورود به استانبول</h4>
                <p className="font-bold text-[14px] text-sub leading-relaxed mb-4">ترانسفر از فرودگاه به هتل و استراحت. بعد از ظهر وقت آزاد برای گشت و گذار در اطراف میدان تکسیم.</p>
                <div className="h-40 rounded-xl overflow-hidden relative bg-brand-dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKlSEsSUJKiDMCAojsgKrO3yqQAuWR7Im9G5OVz514n8eL5-Pxb5z24U0PRFJmnxPnL83TM9IP-eD_aekKDJY0GQE2NSBqkDcbeKeQyNyFwTxN0kfWNEshgsYGZ1TkiE77yt1xP-jV8jnAftuicqRgKiuey9wnZDAQU5NCO1i-ruVQSsKOyLyc24P5qWo-S1jF2gzXs5G_wKp_NFu45XcR41TOVCofhj5XQIPM_XOWpD_QDFp4gD8R" alt="Day 1" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                </div>
              </div>
            </div>
            
            <div className="hidden md:block md:col-span-1"></div>
            
            {/* Day 2 */}
            <div className="hidden md:block md:col-span-1"></div>
            <div className="md:col-span-1 md:pe-12 md:ps-0 relative flex justify-start md:justify-end">
              {/* Timeline Dot */}
              <div className="hidden md:flex absolute -end-3.5 top-5 w-7 h-7 rounded-full bg-brand border-4 border-surface items-center justify-center z-10"></div>
              
              <div className="bg-surface rounded-xl p-5 border border-line/60 hover:shadow-md transition-shadow group w-full relative z-0">
                <h4 className="font-black text-lg text-ink mb-2">روز دوم - گشت شهری</h4>
                <p className="font-bold text-[14px] text-sub leading-relaxed mb-4">بازدید از مسجد ایاصوفیه، مسجد آبی و بازار بزرگ. ناهار در رستوران سنتی (شامل تور).</p>
                <div className="h-40 rounded-xl overflow-hidden relative bg-brand-dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRTvC-g1x9kwdMMWtTw8gN-WFpMZAJ0xi1rTR9l5KQk8tQnG-HVBHnZ__MWpE8hUDMr5wGGXSeJ8g34c9-27kbU1sxD2UTHSk_WOncVvNnYRPDBs3HGkN-B7eJyI-esIUk5DKPFpGHP5sYMHfPNwxO2mNd_Ciu8CGrRb4koGITWtdDjtBxd0plty77ofy1nUKpRmfXqwg75qoOQgdNayDwHByeFRfWphBRdxpZN1Td_C4imyH9BRmX" alt="Day 2" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
