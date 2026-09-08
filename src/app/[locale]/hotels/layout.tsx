import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"رزرو هتل | فیروزو","en":"Hotel Booking | Firuzo","ar":"حجز الفنادق | فيروزو","zh":"酒店预订 | Firuzo","ru":"Бронирование отелей | Firuzo"},
  description: {"fa":"رزرو آنلاین هتل با فیلتر پیشرفته، نقشه تعاملی و بررسی دقیق مشخصات اتاق.","en":"Book hotels online with advanced filters, an interactive map and verified room details.","ar":"احجز الفنادق عبر الإنترنت مع فلاتر متقدمة وخريطة تفاعلية ومواصفات معتمدة للغرف.","zh":"在线预订酒店：高级筛选、互动地图、房型信息全面。","ru":"Бронируйте отели онлайн: продвинутые фильтры, интерактивная карта и проверенные данные о номерах."},
  path: '/hotels',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
