import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {
    fa: 'خرید خودکار و پایش نرخ | فیروزو',
    en: 'Auto-Buy & Price Alerts | Firuzo',
    ar: 'الشراء التلقائي | فيروزو',
    zh: '自动订票与降价提醒 | Firuzo',
    ru: 'Автопокупка | Firuzo',
  },
  description: {
    fa: 'تنظیم ربات‌های خرید خودکار بلیط، هتل و تورهای مسافرتی در فیروزو.',
    en: 'Manage automated booking rules and price alert robots on Firuzo.',
    ar: 'إدارة روبوتات الحجز التلقائي والتنبيهات في فيروزو.',
    zh: '在 Firuzo 管理自动订票规则与智能提醒。',
    ru: 'Управление автоматической покупкой билетов и туров.',
  },
  noindex: true,
});

export default function AutoBuyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
