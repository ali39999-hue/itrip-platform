import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"بلیط هواپیما | فیروزو","en":"Flight Tickets | Firuzo","ar":"تذاكر الطيران | فيروزو","zh":"机票预订 | Firuzo","ru":"Авиабилеты | Firuzo"},
  description: {"fa":"خرید آنلاین بلیط پروازهای داخلی و خارجی با قیمت شفاف و استرداد قانونی.","en":"Book domestic and international flight tickets online with transparent pricing and standard refund policies.","ar":"احجز تذاكر الطيران الداخلية والدولية عبر الإنترنت مع شفافية الأسعار وسياسات الاسترداد المعتمدة.","zh":"在线预订国内和国际机票，价格透明，标准退改保障。","ru":"Бронируйте авиабилеты онлайн с прозрачными ценами и стандартными правилами возврата."},
  path: '/flights',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
