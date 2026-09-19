import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {
    fa: 'تشریفات اختصاصی فرودگاهی CIP | فیروزو',
    en: 'Airport CIP Lounges & Fast Track | Firuzo',
    ar: 'خدمات تشريفات المطار CIP | فيروزو',
    zh: '机场贵宾室与CIP尊享通道 | Firuzo',
    ru: 'VIP-залы и CIP сервис в аэропортах | Firuzo',
  },
  description: {
    fa: 'رزرو آنلاین جایگاه تشریفات اختصاصی CIP فرودگاه امام خمینی، مشهد، شیراز، کیش و دبی با گیت‌های اختصاصی گذرنامه، ترانسفر پای پرواز، بوفه مجلل و سوئیت اقامتی.',
    en: 'Online booking for Airport CIP lounges at Tehran IKA, Mashhad, Shiraz, Kish, and Dubai with private immigration gates, luxury tarmac escort, and gourmet catering.',
    ar: 'حجز خدمات صالات كبار الشخصيات CIP في مطار الإمام الخميني، مشهد، كيش ودبي مع بوابات جوازات خاصة وبوفيه فاخر.',
    zh: '在线预订德黑兰伊玛目霍梅尼机场、马什哈德及迪拜CIP贵宾厅，尊享独立通关、停机坪摆渡与精致餐饮。',
    ru: 'Онлайн бронирование CIP залов в аэропорту Тегерана (IKA), Мешхеда, Киша и Дубая с отдельным паспортным контролем и трансфером к трапу.',
  },
  path: '/cip',
});

export default function CipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
