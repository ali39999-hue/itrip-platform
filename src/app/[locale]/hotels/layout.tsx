import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"رزرو هتل | فیروزه","en":"Hotel Booking | Firuzo","ar":"حجز الفنادق | فيروزو","zh":"酒店预订 | Firuzo","ru":"Бронирование отелей | Firuzo"},
  description: {"fa":"رزرو آنلاین هتل با فیلتر پیشرفته، نقشه تعاملی و تضمین بهترین نرخ.","en":"Book hotels online with advanced filters, an interactive map and best-rate guarantee.","ar":"احجز الفنادق عبر الإنترنت مع فلاتر متقدمة وخريطة تفاعلية وضمان أفضل سعر.","zh":"在线预订酒店：高级筛选、互动地图、最优价格保证。","ru":"Бронируйте отели онлайн: продвинутые фильтры, интерактивная карта, гарантия лучшей цены."},
  path: '/hotels',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
