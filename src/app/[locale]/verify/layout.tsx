import type { Metadata } from 'next';
import { lt } from '@/lib/lt';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: {
      absolute: lt(locale, {
        fa: 'تایید اصالت واچر و بلیت | فیروزو',
        en: 'Verify Travel Voucher & E-Ticket | Firuzo',
        ar: 'التحقق من صحة القسيمة والتذكرة | فيروزو',
        zh: '旅行凭证与电子票验证 | Firuzo',
        ru: 'Проверка подлинности ваучера и билета | Firuzo',
      }),
    },
    description: lt(locale, {
      fa: 'سامانه استعلام و تایید اصالت دیجیتال واچر هتل، بلیت پرواز و خدمات سفر فیروزو',
      en: 'Official digital authenticity verification portal for Firuzo travel vouchers and tickets',
      ar: 'البوابة الرسمية للتحقق من صحة القسائم والتذاكر الرقمية لمنصة فيروزو',
      zh: 'Firuzo 旅行凭证和电子票官方数字真实性验证门户',
      ru: 'Официальный портал проверки подлинности цифровых туристических ваучеров и билетов Firuzo',
    }),
    robots: { index: false, follow: false },
  };
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
