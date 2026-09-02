'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useHydration } from '@/hooks/useHydration';
import { Button } from '@/components/ui/button';
import { shimmerDataUrl } from '@/lib/image-utils';
import { getMyBookings } from '@/actions/booking';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import {
  Plane,
  QrCode,
  Luggage,
  MapPin,
  BedDouble,
  CarFront,
  FileCheck2,
  Wifi,
  ShieldCheck,
  TrainFront,
  Award,
  Loader2,
} from 'lucide-react';
import { lt } from '@/lib/lt';

interface BookingRecordItem {
  id: string;
  type: string;
  details: string;
}

interface BookingRecordSummary {
  id: string;
  reference: string;
  status: string;
  totalAmount: unknown;
  createdAt: Date;
  items: BookingRecordItem[];
}

function getTypeMeta(type: string, locale: string) {
  const normalized = (type || 'HOTEL').toUpperCase();
  const metaMap: Record<string, { label: string; icon: typeof Plane; image: string }> = {
    FLIGHT: {
      label: lt(locale, { fa: 'پرواز', en: 'Flight', ar: 'طيران', zh: '机票', ru: 'Авиабилет' }),
      icon: Plane,
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=70&w=800'
    },
    HOTEL: {
      label: lt(locale, { fa: 'اقامتگاه', en: 'Hotel', ar: 'فندق', zh: '酒店', ru: 'Отель' }),
      icon: BedDouble,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=70&w=800'
    },
    TOUR: {
      label: lt(locale, { fa: 'تور', en: 'Tour', ar: 'جولة', zh: '旅游', ru: 'Тур' }),
      icon: MapPin,
      image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=70&w=800'
    },
    TRANSFER: {
      label: lt(locale, { fa: 'ترانسفر', en: 'Transfer', ar: 'توصيل', zh: '接送', ru: 'Трансфер' }),
      icon: CarFront,
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=70&w=800'
    },
    TRAIN: {
      label: lt(locale, { fa: 'قطار', en: 'Train', ar: 'قطار', zh: '火车', ru: 'Поезд' }),
      icon: TrainFront,
      image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=70&w=800'
    },
    VISA: {
      label: lt(locale, { fa: 'ویزا', en: 'Visa', ar: 'تأشيرة', zh: '签证', ru: 'Виза' }),
      icon: FileCheck2,
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=70&w=800'
    },
    ESIM: {
      label: 'eSIM',
      icon: Wifi,
      image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=70&w=800'
    },
    INSURANCE: {
      label: lt(locale, { fa: 'بیمه', en: 'Insurance', ar: 'تأمين', zh: '保险', ru: 'Страховка' }),
      icon: ShieldCheck,
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=70&w=800'
    },
    'CITY-PASS': {
      label: lt(locale, { fa: 'فیروز پاس', en: 'City Pass', ar: 'بطاقة المدينة', zh: '城市通票', ru: 'Сити Пасс' }),
      icon: Award,
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=70&w=800'
    },
  };

  return metaMap[normalized] || metaMap.HOTEL;
}

export default function MyTripsPage() {
  const t = useTranslations('MyTrips');
  const locale = useLocale();
  const router = useRouter();
  const isHydrated = useHydration();

  const [dbBookings, setDbBookings] = useState<BookingRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'finance'>('upcoming');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await getMyBookings();
        if (active && res.success && res.bookings) {
          setDbBookings(res.bookings as unknown as BookingRecordSummary[]);
        }
      } catch (e) {
        console.error('Failed to load trips:', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const upcoming = dbBookings.filter((b) => {
    const isCancelled = b.status === 'CANCELLED' || b.status === 'refunded';
    return !isCancelled;
  });

  let filtered = dbBookings;
  if (tab === 'upcoming') {
    filtered = upcoming;
  } else if (tab === 'past') {
    filtered = dbBookings.filter((b) => b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'refunded');
  }

  if (!isHydrated) return null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <AccountSidebar activeSection="trips" />

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
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                tab === 'upcoming' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'
              }`}
            >
              {t('upcoming')} ({upcoming.length})
            </button>
            <button
              onClick={() => setTab('past')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                tab === 'past' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'
              }`}
            >
              {t('past')}
            </button>
            <button
              onClick={() => setTab('finance')}
              className={`px-6 py-4 font-black text-[15px] transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                tab === 'finance' ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'
              }`}
            >
              {t('cancelled')}
            </button>
          </div>

          {loading ? (
            <div className="p-16 flex items-center justify-center text-brand">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-surface rounded-xl border border-line p-14 text-center shadow-sm flex flex-col items-center justify-center">
              <Luggage size={64} className="text-line mb-6" />
              <p className="font-black text-[20px] text-ink mb-2">{t('noTrips')}</p>
              <p className="font-bold text-[14px] text-sub mb-8">
                {lt(locale, {
                  fa: 'با فیروزه سفر رویاهاتون رو برنامه‌ریزی کنید.',
                  en: 'Start planning your next adventure with Firuzo.',
                  ar: 'ابدأ التخطيط لرحلة أحلامك مع فيروزو.',
                  zh: '与 Firuzo 一起规划您的梦想之旅。',
                  ru: 'Начните планировать путешествие мечты с Firuzo.',
                })}
              </p>
              <Button
                onClick={() => router.push('/services')}
                className="bg-brand hover:bg-brand-2 text-surface h-12 px-8 font-black rounded-xl text-[15px]"
              >
                {lt(locale, {
                  fa: 'مشاهده خدمات سفر',
                  en: 'Explore Travel Services',
                  ar: 'استكشف خدمات السفر',
                  zh: '浏览旅行服务',
                  ru: 'Открыть туристические услуги',
                })}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filtered.map((b) => {
                const firstItem = b.items?.[0];
                const bType = (firstItem?.type || 'HOTEL').toUpperCase();
                let detailsObj: Record<string, unknown> = {};
                if (firstItem?.details) {
                  try {
                    detailsObj = JSON.parse(firstItem.details);
                  } catch {}
                }

                const title = (detailsObj.itemTitle as string) || (detailsObj.title as string) || `${bType} Booking`;
                const meta = getTypeMeta(bType, locale);
                const Icon = meta.icon;
                const totalAmt = Number(b.totalAmount || 0);

                return (
                  <article
                    key={b.id}
                    className="bg-surface rounded-xl shadow-elev-1 hover:shadow-elev-2 transition-shadow border border-line overflow-hidden flex flex-col md:flex-row group"
                  >
                    <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-soft">
                      <Image
                        alt={title}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        src={meta.image}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        placeholder="blur"
                        blurDataURL={shimmerDataUrl(400, 300)}
                      />
                      <div
                        className={`absolute top-4 end-4 px-3 py-1.5 rounded-full font-black text-[12px] shadow-elev-1 ${
                          b.status === 'CONFIRMED'
                            ? 'bg-brand text-surface'
                            : b.status === 'CANCELLED'
                            ? 'bg-line/90 text-sub'
                            : 'bg-hotel text-surface'
                        }`}
                      >
                        {b.status === 'CONFIRMED'
                          ? lt(locale, { fa: 'تایید شده', en: 'Confirmed', ar: 'مؤكدة', zh: '已确认', ru: 'Подтверждено' })
                          : b.status === 'CANCELLED'
                          ? lt(locale, { fa: 'لغو شده / مسترد', en: 'Cancelled', ar: 'ملغاة', zh: '已取消', ru: 'Отменено' })
                          : lt(locale, { fa: 'در انتظار پرداخت', en: 'Pending', ar: 'في انتظار الدفع', zh: '待支付', ru: 'Ожидает оплаты' })}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-sub flex items-center gap-1.5 bg-soft px-3 py-1 rounded-full">
                            <Icon size={14} className="text-brand-dark" aria-hidden="true" />
                            {meta.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-sub">
                            {lt(locale, { fa: 'کد رزرو:', en: 'Booking Code:', ar: 'رمز الحجز:', zh: '预订码：', ru: 'Код бронирования:' })} #{b.reference || b.id.slice(0, 8)}
                          </span>
                        </div>

                        <h3 className="font-black text-[20px] text-ink mb-1 group-hover:text-brand transition-colors">
                          {title}
                        </h3>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-line text-xs font-bold mt-3">
                          <div>
                            <span className="text-sub block mb-1">
                              {lt(locale, {
                                fa: 'تاریخ ثبت:',
                                en: 'Booking Date:',
                                ar: 'تاريخ الحجز:',
                                zh: '预订日期：',
                                ru: 'Дата бронирования:',
                              })}
                            </span>
                            <span className="text-ink font-mono">
                              {new Date(b.createdAt).toISOString().slice(0, 10)}
                            </span>
                          </div>
                          <div>
                            <span className="text-sub block mb-1">
                              {lt(locale, {
                                fa: 'مبلغ پرداختی:',
                                en: 'Amount Paid:',
                                ar: 'المبلغ المدفوع:',
                                zh: '已付金额：',
                                ru: 'Оплачено:',
                              })}
                            </span>
                            <span className="text-price font-black text-[15px] font-mono num">
                              {totalAmt.toLocaleString(
                                lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                              )}{' '}
                              {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/my-trips/${b.id}`)}
                            className="rounded-xl font-black text-xs gap-1.5 border-line hover:bg-soft"
                          >
                            <QrCode size={14} />
                            {t('viewVoucher')}
                          </Button>
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
