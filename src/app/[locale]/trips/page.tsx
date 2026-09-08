import { safeAuth } from '@/auth';
import { getUserTripsData } from '@/actions/trips';
import Link from 'next/link';
import { 
  Plane, 
  Hotel, 
  Calendar, 
  MapPin, 
  FileText, 
  Sparkles, 
  Compass, 
  Car, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink
} from 'lucide-react';
import { lt } from '@/lib/lt';

function getItemIcon(type?: string) {
  const t = (type || '').toUpperCase();
  if (t.includes('FLIGHT')) return Plane;
  if (t.includes('HOTEL')) return Hotel;
  if (t.includes('TOUR')) return Compass;
  if (t.includes('TRANSFER')) return Car;
  if (t.includes('INSURANCE')) return ShieldCheck;
  return FileText;
}

export default async function MyTripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await safeAuth();
  const isRtl = locale === 'fa' || locale === 'ar';

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 pt-12" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 text-center shadow-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 grid place-items-center">
              <Compass size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {lt(locale, { fa: 'مشاهده و پیگیری سفرهای فیروزو', en: 'Track & Manage Your Firuzo Trips', ar: 'متابعة وإدارة رحلاتك في فيروزو', zh: '查看与管理您的 Firuzo 行程', ru: 'Просмотр и управление поездками Firuzo' })}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                {lt(locale, {
                  fa: 'برای مشاهده واچرها، بلیت‌های الکترونیکی و جزئیات پرواز و هتل، وارد حساب کاربری خود شوید یا جستجوی جدید را آغاز کنید.',
                  en: 'Sign in to access your electronic tickets, hotel vouchers and itinerary details, or start a new search.',
                  ar: 'سجّل الدخول للوصول إلى تذاكرك وقسائم الفنادق، أو ابدأ بحثاً جديداً.',
                  zh: '请登录以查看您的电子行程单与酒店凭证，或开始新的预订。',
                  ru: 'Войдите в аккаунт для доступа к билетам и ваучерам или начните новый поиск.',
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/${locale}/auth?callbackUrl=/${locale}/trips`}
                className="px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-black text-sm transition shadow-md shadow-teal-600/20"
              >
                {lt(locale, { fa: 'ورود به حساب کاربری', en: 'Sign In to Account', ar: 'تسجيل الدخول', zh: '登录账户', ru: 'Войти в аккаунт' })}
              </Link>
              <Link
                href={`/${locale}/flights/search`}
                className="px-6 py-3.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-black text-sm transition"
              >
                {lt(locale, { fa: 'جستجوی پرواز', en: 'Search Flights', ar: 'بحث عن الطيران', zh: '搜索机票', ru: 'Поиск авиабилетов' })}
              </Link>
              <Link
                href={`/${locale}/hotels/search`}
                className="px-6 py-3.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-black text-sm transition"
              >
                {lt(locale, { fa: 'جستجوی هتل', en: 'Search Hotels', ar: 'بحث عن الفنادق', zh: '搜索酒店', ru: 'Поиск отелей' })}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { trips, independentBookings } = await getUserTripsData();
  const hasAnyTrips = trips.length > 0 || independentBookings.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 pt-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {lt(locale, { fa: 'سیستم عامل یکپارچه سفر فیروزو', en: 'Firuzo Travel Operating System', ar: 'نظام تشغيل السفر فيروزو', zh: 'Firuzo 旅行操作系统', ru: 'Операционная система путешествий Firuzo' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的行程', ru: 'Мои поездки' })}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {lt(locale, {
                fa: 'مدیریت یکپارچه بلیت‌های پرواز، واچرهای هتل، ترانسفرها و برنامه‌ریزی روزبه‌روز',
                en: 'Manage your flight tickets, hotel vouchers, transfers, and daily itineraries in one place',
                ar: 'إدارة تذاكر الطيران، وقسائم الفنادق، وخدمات النقل، والجدول اليومي في مكان واحد',
                zh: '一站式管理您的机票、酒店凭证、接送服务与每日行程规划',
                ru: 'Управление авиабилетами, ваучерами отелей, трансферами и планом поездки в одном месте',
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href={`/${locale}/plan`}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs sm:text-sm transition shadow-sm shadow-teal-500/20"
            >
              <Sparkles className="w-4 h-4 me-1.5 text-amber-300 animate-pulse" />
              <span>{lt(locale, { fa: 'سفرساز هوشمند AI', en: 'AI Trip Planner', ar: 'مساعد السفر الذكي', zh: 'AI 智能行程定制', ru: 'AI планировщик' })}</span>
            </Link>
            <Link
              href={`/${locale}/flights`}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Plane className="w-4 h-4 me-1.5 text-blue-500" />
              <span>{lt(locale, { fa: 'رزرو پرواز', en: 'Book Flight', ar: 'حجز طيران', zh: '预订航班', ru: 'Купить авиабилет' })}</span>
            </Link>
            <Link
              href={`/${locale}/hotels`}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Hotel className="w-4 h-4 me-1.5 text-amber-500" />
              <span>{lt(locale, { fa: 'رزرو هتل', en: 'Book Hotel', ar: 'حجز فندق', zh: '预订酒店', ru: 'Забронировать отель' })}</span>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {!hasAnyTrips ? (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500/10 to-amber-500/10 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {lt(locale, { fa: 'هنوز سفری ثبت نکرده‌اید', en: 'No trips booked yet', ar: 'لم تقم بحجز أي رحلة بعد', zh: '您尚无预订的行程', ru: 'У вас пока нет забронированных поездок' })}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
                {lt(locale, {
                  fa: 'با هوش مصنوعی سفرساز فیروزو می‌توانید در کمتر از ۱۰ ثانیه پرواز، هتل و تجربیات اختصاصی مقصدتان را بچینید و با یک کلیک رزرو کنید.',
                  en: 'With Firuzo AI Travel Planner, you can assemble flights, hotels, and signature destination experiences in under 10 seconds.',
                  ar: 'مع مخطط السفر بالذكاء الاصطناعي من فيروزو، يمكنك تجميع رحلات الطيران والفنادق والأنشطة في أقل من 10 ثوانٍ.',
                  zh: '借助 Firuzo AI 智能行程定制器，10秒内即刻为您生成专属机票、酒店与精选行程方案。',
                  ru: 'С помощью AI-планировщика Firuzo вы можете собрать перелеты, отели и экскурсии менее чем за 10 секунд.',
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Link
                href={`/${locale}/plan`}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl font-black text-sm transition shadow-md shadow-teal-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>{lt(locale, { fa: 'شروع برنامه‌ریزی هوشمند رایگان', en: 'Start Free Smart Planner', ar: 'بدء التخطيط الذكي مجاناً', zh: '开启免费智能规划', ru: 'Начать умное планирование' })}</span>
              </Link>
              <Link
                href={`/${locale}/flights`}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Plane size={16} />
                <span>{lt(locale, { fa: 'جستجوی پروازها', en: 'Search Flights', ar: 'البحث عن الرحلات', zh: '搜索机票', ru: 'Поиск рейсов' })}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Organized Trips */}
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                {/* Trip Header Banner */}
                <div className="p-6 bg-slate-50/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          {trip.title}
                        </h2>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          trip.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          <CheckCircle2 size={12} />
                          <span>{trip.status}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{lt(locale, { fa: 'شناسه سفر:', en: 'Trip Ref:', ar: 'رقم الرحلة:', zh: '行程编号：', ru: 'Код поездки:' })}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{trip.reference}</span>
                        {trip.startDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{trip.startDate}</span>
                            {trip.endDate && <span> تا {trip.endDate}</span>}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 bg-slate-200/60 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300">
                      {trip.bookings.length} {lt(locale, { fa: 'رزرو مرتبط', en: 'Linked Bookings', ar: 'حجوزات مرتبطة', zh: '项关联预订', ru: 'броней' })}
                    </span>
                  </div>
                </div>

                {/* Bookings inside trip */}
                <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700/60">
                  {trip.bookings.map((booking) => {
                    const primaryType = booking.items[0]?.type;
                    const Icon = getItemIcon(primaryType);
                    return (
                      <div key={booking.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                {booking.reference}
                              </span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                                booking.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {booking.items.map((i) => i.type).join(' + ')}
                              {booking.travelDate && ` • ${lt(locale, { fa: 'تاریخ سفر: ', en: 'Travel Date: ', ar: 'تاريخ السفر: ', zh: '出行日期：', ru: 'Дата поездки: ' })}${booking.travelDate}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/40">
                          <div className="text-start md:text-end">
                            <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                              {Number(booking.totalAmount).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {booking.currency}
                            </div>
                            <div className="text-xs font-medium text-slate-500">
                              {booking.paymentStatus === 'CAPTURED' 
                                ? lt(locale, { fa: 'پرداخت شده', en: 'Paid', ar: 'تم الدفع', zh: '已支付', ru: 'Оплачено' })
                                : booking.paymentStatus
                              }
                            </div>
                          </div>

                          <Link
                            href={`/${locale}/book?reference=${booking.reference}`}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5"
                          >
                            <span>{lt(locale, { fa: 'مشاهده و واچر', en: 'Voucher & Details', ar: 'القسيمة والتفاصيل', zh: '电子凭证与详情', ru: 'Ваучер и детали' })}</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Standalone bookings */}
            {independentBookings.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
                  {lt(locale, { fa: 'سایر رزروهای منفرد', en: 'Individual Bookings', ar: 'الحجوزات الفردية الأخرى', zh: '其他单项预订', ru: 'Другие отдельные бронирования' })}
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {independentBookings.map((b) => (
                    <div key={b.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{b.reference}</span>
                            <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {b.items.map((i) => i.type).join(', ')} • {new Date(b.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        <div className="text-start md:text-end">
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            {Number(b.totalAmount).toLocaleString(lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' }))} {b.currency}
                          </span>
                        </div>
                        <Link
                          href={`/${locale}/book?reference=${b.reference}`}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                        >
                          {lt(locale, { fa: 'مشاهده', en: 'View', ar: 'عرض', zh: '查看', ru: 'Смотреть' })}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
