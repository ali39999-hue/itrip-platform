import { useLocale } from 'next-intl';
import { CreditCard, Info, Map, Check } from 'lucide-react';
import { CityPassWidget } from '@/components/city-pass/CityPassWidget';
import { RoutePlannerPreview } from '@/components/city-pass/RoutePlannerPreview';
import { TrustBar } from '@/components/shared/TrustBar';
import { ProcessSteps } from '@/components/shared/ProcessSteps';

export default function CityPassPage() {
  const locale = useLocale();

  return (
    <div className="bg-paper min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint to-paper pt-20 pb-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 text-[13px] font-bold text-brand-dark bg-surface border border-brand/20 rounded-full mb-6">
            <CreditCard size={16} /> فیروز پاس · Firuzo Pass
          </span>
          <h1 className="text-[32px] md:text-[48px] font-black leading-tight tracking-tight mb-4 max-w-[18ch]">
            مترو و اتوبوس شهری، با <em className="not-italic text-brand">یک کارت</em>
          </h1>
          <p className="text-[18px] text-sub max-w-[54ch] leading-relaxed mb-8">
            بدون صف بلیت، بدون پول خرد، بدون تابلوهای فارسیِ نامفهوم. کارت را در هتل تحویل می‌گیرید و پنل مسیریاب انگلیسی‌زبان ما قدم‌به‌قدم تا مقصد همراهتان است.
          </p>

          <CityPassWidget locale={locale} />
        </div>
      </section>

      {/* Scope / Manual Ops */}
      <section className="py-12 max-w-[1180px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex gap-4 items-start p-6 bg-gold-soft border border-gold/30 rounded-2xl">
          <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-action text-[#14201f]">
            <Check size={21} />
          </span>
          <div>
            <h3 className="m-0 mb-2 text-[18px] font-bold">کارت را یک نفر می‌آورد، نه ربات</h3>
            <p className="m-0 text-[14px] text-price leading-[1.7]">
              هر کارت را همکار محلی ما می‌خرد، شارژ می‌کند و به پذیرش هتل تحویل می‌دهد.
              برای همین <b>دست‌کم ۲۴ ساعت پیش از ورود</b> سفارش بدهید. تأیید و شماره‌ی پیگیری را در واتساپ می‌گیرید.
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-start p-6 bg-soft border border-line rounded-2xl">
          <span className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-xl bg-line text-sub">
            <Info size={21} />
          </span>
          <div>
            <h3 className="m-0 mb-2 text-[18px] font-bold">محدوده‌ی اعتبار کارت</h3>
            <p className="m-0 text-[14px] text-sub leading-[1.7]">
              شبکه‌های حمل‌ونقل شهرهای ایران مستقل‌اند و کارت‌هایشان با هم سازگار نیست —
              کارت تهران در اصفهان یا مشهد کار نمی‌کند. اگر به چند شهر می‌روید، برای هر شهر
              سفارش جدا ثبت کنید. کارت در تاکسی اعتبار ندارد.
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16 bg-brand-dark text-surface relative overflow-hidden">
        <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(0,169,165,0.15),transparent_70%)] pointer-events-none" />
        <div className="max-w-[1020px] mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-[28px] font-black mb-3">پنل مسیریاب — بدون نصب اپلیکیشن</h2>
            <p className="text-[18px] text-mint-bright max-w-[60ch] mx-auto">
              لینک اختصاصی شما در مرورگر باز می‌شود و می‌گوید کدام خط را سوار شوید، چند ایستگاه، و در راه چه چیزی ارزش دیدن دارد.
            </p>
          </div>

          <RoutePlannerPreview />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-surface">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-[62ch] mb-12">
            <h2 className="text-[28px] font-black mb-3">یک کارت بکشید، بقیه‌اش با ما</h2>
            <p className="text-[16px] text-sub leading-[1.8]">
              روند پشت صحنه سخت‌گیرانه است تا کاری که شما می‌کنید فقط یک حرکت دست باشد.
            </p>
          </div>

          <ProcessSteps 
            steps={[
              { title: 'سفارش پیش از سفر', description: 'شهر، نوع کارت و نام هتل را وارد کنید. پرداخت با کارت بین‌المللی خودتان.', eta: 'دست‌کم ۲۴ ساعت قبل' },
              { title: 'تهیه و شارژ', description: 'همکار ما کارت را می‌خرد، شارژ می‌کند و به پذیرش هتل شما تحویل می‌دهد.', eta: 'تأیید در واتساپ' },
              { title: 'گیت مترو و BRT', description: 'کارت را روی دستگاه گیت بگذارید. برای اتوبوس‌های تندرو هم همین کارت کافی است.', eta: 'Tap & Go' },
              { title: 'مسیریابی هوشمند', description: 'بدون نصب اپلیکیشن با لینک اختصاصی. برای نمایش ایستگاه نزدیک، دسترسی مکان لازم است.', eta: 'در مرورگر' }
            ]} 
          />
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 mb-16 max-w-[1180px] mx-auto px-6">
        <TrustBar 
          items={[
            { icon: <CreditCard size={22} className="text-brand flex-shrink-0 mt-0.5" />, title: 'مترو و BRT شهر شما', description: 'همان کارتی که شهروندان استفاده می‌کنند، در تمام خطوط مترو و اتوبوس تندرو.' },
            { icon: <Map size={22} className="text-brand flex-shrink-0 mt-0.5" />, title: 'راهنمای انگلیسی', description: 'نام ایستگاه‌ها و خطوط، برخلاف تابلوهای محلی، به انگلیسی و لاتین نمایش داده می‌شود.' },
            { icon: <Check size={22} className="text-brand flex-shrink-0 mt-0.5" />, title: 'بدون صف و پول خرد', description: 'نه دستگاه فروش بلیت، نه بلیت کاغذی تک‌سفره، نه سردرگمی سر گیت.' },
            { icon: <Info size={22} className="text-brand flex-shrink-0 mt-0.5" />, title: 'مفقودی کارت', description: 'اگر کارت گم شد، در همان شهر ظرف یک روز کاری جایگزین می‌کنیم.' }
          ]}
        />
      </section>
    </div>
  );
}
