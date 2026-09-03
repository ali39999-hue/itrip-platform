import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"خرید eSIM بین‌المللی | فیروزه","en":"International eSIM | Firuzo","ar":"eSIM الدولية | فيروزو","zh":"国际 eSIM | Firuzo","ru":"Международный eSIM | Firuzo"},
  description: {"fa":"سیم‌کارت دیجیتال بیش از ۱۹۰ کشور با فعال‌سازی آنی و پرداخت ریالی.","en":"Digital SIM for 190+ countries with instant activation and Rial payment.","ar":"شريحة رقمية لأكثر من 190 دولة مع تنشيط فوري ودفع بالريال.","zh":"覆盖 190+ 个国家的数字 SIM 卡，即时激活，支持里亚尔支付。","ru":"Цифровая SIM для 190+ стран с мгновенной активацией и оплатой в риалах."},
  path: '/esim',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
