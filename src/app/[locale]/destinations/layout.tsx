import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"مقصدهای گردشگری | فیروزه","en":"Destinations | Firuzo","ar":"الوجهات السياحية | فيروزو","zh":"热门目的地 | Firuzo","ru":"Направления | Firuzo"},
  description: {"fa":"کاوش در مقاصد محبوب فیروزه: ترکیه، امارات، گرجستان، روسیه، عمان و چین.","en":"Explore Firuzo destinations: Turkey, UAE, Georgia, Russia, Oman and China.","ar":"استكشف وجهات فيروزو: تركيا والإمارات وجورجيا وروسيا وعمان والصين.","zh":"探索 Firuzo 目的地：土耳其、阿联酋、格鲁吉亚、俄罗斯、阿曼和中国。","ru":"Направления Firuzo: Турция, ОАЭ, Грузия, Россия, Оман и Китай."},
  path: '/destinations',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
