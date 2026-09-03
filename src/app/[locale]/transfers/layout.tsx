import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"ترانسفر فرودگاهی | فیروزه","en":"Airport Transfers | Firuzo","ar":"النقل المطارئ | فيروزو","zh":"机场接送 | Firuzo","ru":"Трансферы | Firuzo"},
  description: {"fa":"ترانسفر خصوصی فرودگاهی با رانندگان معتبر و قیمت ثابت.","en":"Private airport transfers with vetted drivers and fixed prices.","ar":"نقل مطارئ خاص مع سائقين موثوقين وأسعار ثابتة.","zh":"私人机场接送，认证司机，固定价格。","ru":"Индивидуальные трансферы с проверенными водителями и фиксированной ценой."},
  path: '/transfers',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
