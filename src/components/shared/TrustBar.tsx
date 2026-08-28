import { Shield, RefreshCw, CreditCard, MessageCircle } from 'lucide-react';

interface TrustItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function TrustBar({ items }: { items?: TrustItem[] }) {
  const defaultItems = [
    {
      icon: <CreditCard size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: 'بدون کارت شتاب',
      description: 'با همان کارت بانکی کشور خودتان، هزینه‌های داخل ایران را مدیریت کنید.',
    },
    {
      icon: <RefreshCw size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: 'نرخ تبدیل لحظه‌ای و شفاف',
      description: 'فاکتور شما دقیقاً بر اساس نرخ روز صرافی محاسبه می‌شود.',
    },
    {
      icon: <Shield size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: 'امنیت کامل',
      description: 'عملیات از طریق درگاه‌های قانونی و شرکتی انجام می‌شود.',
    },
    {
      icon: <MessageCircle size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: 'پشتیبانی لحظه‌ای',
      description: 'در صورت بروز مشکل، تیم پشتیبانی ما به زبان شما با خدمات‌دهندگان صحبت می‌کند.',
    },
  ];

  const displayItems = items || defaultItems;

  return (
    <div className="bg-surface border border-line rounded-2xl p-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {displayItems.map((item, idx) => (
        <div key={idx} className="flex gap-3 items-start">
          {item.icon}
          <div>
            <strong className="block text-[14px] mb-0.5">{item.title}</strong>
            <span className="text-[12px] text-sub leading-[1.55]">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
