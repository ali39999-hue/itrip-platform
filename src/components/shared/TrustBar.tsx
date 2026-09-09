'use client';

import { Shield, RefreshCw, CreditCard, MessageCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface TrustItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function TrustBar({ items }: { items?: TrustItem[] }) {
  const locale = useLocale();

  const defaultItems: TrustItem[] = [
    {
      icon: <CreditCard size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: lt(locale, { fa: 'بدون نیاز به کارت شتاب', en: 'No Local Card Needed', ar: 'بدون بطاقة محلية', zh: '无需当地银行卡', ru: 'Без местной карты' }),
      description: lt(locale, {
        fa: 'با همان کارت بانکی کشور خودتان یا رمزارز، هزینه‌های سفر را مدیریت کنید.',
        en: 'Manage your travel expenses using your own international bank cards or cryptocurrency.',
        ar: 'قم بإدارة نفقات سفرك باستخدام بطاقتك المصرفية الدولية أو العملات الرقمية.',
        zh: '使用您本国的银行卡或加密货币轻松结算各项出行开支。',
        ru: 'Оплачивайте расходы в поездке своими банковскими картами или криптовалютой.',
      }),
    },
    {
      icon: <RefreshCw size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: lt(locale, { fa: 'نرخ تبدیل لحظه‌ای و شفاف', en: 'Transparent Live Rates', ar: 'أسعار صرف فورية وشفافة', zh: '透明实时兑换汇率', ru: 'Прозрачный курс обмена' }),
      description: lt(locale, {
        fa: 'فاکتور شما دقیقاً بر اساس نرخ روز و بدون کارمزد مخفی محاسبه می‌شود.',
        en: 'Invoices calculated strictly at real-time market rates with zero hidden markups.',
        ar: 'تُحسب فواتيرك بدقة وفق سعر الصرف اليومي ودون رسوم خفية.',
        zh: '账单严格按每日市场汇率核算，绝无任何隐藏手续费。',
        ru: 'Расчет строго по актуальному курсу без скрытых комиссий.',
      }),
    },
    {
      icon: <Shield size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: lt(locale, { fa: 'امنیت کامل پرداخت', en: 'Full Payment Security', ar: 'أمان دفع متكامل', zh: '全流程安全合规支付', ru: 'Полная безопасность платежей' }),
      description: lt(locale, {
        fa: 'کلیه تراکنش‌ها از طریق پروتکل‌های رمزنگاری‌شده و درگاه‌های رسمی انجام می‌شود.',
        en: 'All transactions processed through encrypted protocols and authorized corporate gateways.',
        ar: 'تتم جميع المعاملات عبر بروتوكولات مشفرة وبوابات دفع رسمية.',
        zh: '所有交易均通过高标准加密协议与官方合规企业网关进行。',
        ru: 'Все транзакции проводятся через защищенные протоколы и официальные шлюзы.',
      }),
    },
    {
      icon: <MessageCircle size={22} className="text-brand flex-shrink-0 mt-0.5" />,
      title: lt(locale, { fa: 'پشتیبانی لحظه‌ای ۲۴/۷', en: '24/7 Live Support', ar: 'دعم مباشر ٢٤/٧', zh: '24/7 实时在线客服', ru: 'Круглосуточная поддержка 24/7' }),
      description: lt(locale, {
        fa: 'در صورت بروز هرگونه مشکل، تیم پشتیبانی ما به ۵ زبان پاسخگوی شماست.',
        en: 'Dedicated travel concierges assist you in 5 languages whenever needed.',
        ar: 'فريق الدعم لدينا جاهز لمساعدتك بـ 5 لغات على مدار الساعة.',
        zh: '专业客服团队以 5 种语言随时待命，为您迅速排忧解难。',
        ru: 'Наша служба поддержки на 5 языках готова оперативно помочь в любой ситуации.',
      }),
    },
  ];

  const displayItems = items || defaultItems;

  return (
    <div className="bg-surface border border-line rounded-2xl p-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {displayItems.map((item, idx) => (
        <div key={idx} className="flex gap-3 items-start">
          {item.icon}
          <div>
            <strong className="block text-[14px] mb-0.5 text-ink">{item.title}</strong>
            <span className="text-[12px] text-sub leading-[1.55]">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
