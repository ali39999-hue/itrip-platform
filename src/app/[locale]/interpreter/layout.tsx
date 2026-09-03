import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"مترجم همراه | فیروزه","en":"On-demand Interpreter | Firuzo","ar":"مترجم فوري | فيروزو","zh":"随行翻译 | Firuzo","ru":"Переводчик по запросу | Firuzo"},
  description: {"fa":"مترجم حضوری و آنلاین در مقصد؛ رزرو در چند دقیقه.","en":"In-person and online interpreters at your destination — booked in minutes.","ar":"مترجمون حضوريون وعبر الإنترنت في وجهتك — الحجز في دقائق.","zh":"目的地现场与在线译员，几分钟完成预订。","ru":"Очные и онлайн-переводчики в пункте назначения — бронь за минуты."},
  path: '/interpreter',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
