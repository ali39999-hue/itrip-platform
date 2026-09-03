import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"تورهای مسافرتی | فیروزه","en":"Travel Tours | Firuzo","ar":"الجولات السياحية | فيروزو","zh":"旅游套餐 | Firuzo","ru":"Туры | Firuzo"},
  description: {"fa":"تورهای دستچین داخلی و خارجی با برنامه سفر کامل و پرداخت یکجا.","en":"Curated domestic and international tours with complete itineraries and single checkout.","ar":"جولات مختارة داخلية ودولية مع برنامج سفر كامل ودفع واحد.","zh":"精选国内外旅游套餐，完整行程，一次支付。","ru":"Отобранные туры с полным маршрутом и единой оплатой."},
  path: '/tours',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
