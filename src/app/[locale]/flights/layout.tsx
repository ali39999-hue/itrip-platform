import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"بلیط هواپیما | فیروزه","en":"Flight Tickets | Firuzo","ar":"تذاكر الطيران | فيروزو","zh":"机票预订 | Firuzo","ru":"Авиабилеты | Firuzo"},
  description: {"fa":"خرید آنلاین بلیط پروازهای داخلی و خارجی با تضمین کمترین قیمت و صدور آنی.","en":"Book domestic and international flight tickets online with best-price guarantee and instant ticketing.","ar":"احجز تذاكر الطيران الداخلية والدولية عبر الإنترنت مع ضمان أفضل سعر وإصدار فوري.","zh":"在线预订国内和国际机票，最低价格保证，即时出票。","ru":"Бронируйте авиабилеты онлайн с гарантией лучшей цены и мгновенным оформлением."},
  path: '/flights',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
