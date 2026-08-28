'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Headset, ArrowLeft, ShieldCheck, PlaneTakeoff, X } from 'lucide-react';

const ARTICLES = [
  {
    id: 'a1',
    category: 'ویزا',
    title: 'چک‌لیست سفر به ترکیه',
    readTime: '۵ دقیقه',
    gradient: 'from-rose-warm/80 to-rose-warm',
    excerpt: 'از بیمه مسافرتی اجباری تا رزرو هتل قابل استعلام — همه مدارکی که برای ورود به ترکیه لازم دارید.',
    body: 'برای سفر به ترکیه علاوه بر پاسپورت با حداقل ۵ ماه اعتبار، توصیه می‌کنیم بیمه مسافرتی معتبر تهیه کنید. رزرو هتل و بلیت برگشت نیز ممکن است در گیت ورودی بررسی شود. پول نقد دلار یا یورو همراه داشته باشید؛ کارت‌های ایرانی در ترکیه کاربردی ندارند.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9_AoIZZWjw_cWBgfaIoRRPbRX_FphKkUeRDnFQ5DkdJ7llkzCOxg01mXKRNJylSetW8MR_-VU9onAUo7oyDZBtSTSmyq-rNx6NIqNcJRgkQdYzFLY80ZWwwVvmvjlLW4AjQqz5UKLquN4ILmQthjB7LchL1mXpvkkHDjKuU0EGgpzOupo6IBfuZLTWnvC2ae-vkgNyZdCmOuWHVnzH1PFlXgFuFuXkMuOVibe5hSxeOMwvR-yH0eb2yrxuAjL4vNn1Q'
  },
  {
    id: 'a2',
    category: 'مالی',
    title: 'راهنمای کیف پول چندارزی فیروز',
    readTime: '۷ دقیقه',
    gradient: 'from-brand to-brand-dark',
    excerpt: 'شارژ ریالی با شتاب، نگهداری تتر و درهم، و تبدیل لحظه‌ای با قفل نرخ ۳۰ ثانیه‌ای چگونه کار می‌کند؟',
    body: 'کیف پول فیروز از سه ارز ریال، تتر و درهم پشتیبانی می‌کند. شارژ ریالی از طریق درگاه شتاب انجام می‌شود و تبدیل بین ارزها با نرخ لحظه‌ای و قفل ۳۰ ثانیه‌ای صورت می‌گیرد. تمام تراکنش‌ها در دفتر کل (Ledger) ثبت و قابل دریافت است.',
    icon: ShieldCheck
  },
  {
    id: 'a3',
    category: 'درمانی',
    title: 'سفر درمانی به استانبول',
    readTime: '۹ دقیقه',
    gradient: 'from-flight/80 to-flight',
    excerpt: 'چطور از ویزا تا بیمارستان و مترجم، یک سفر درمانی بی‌دغدغه بچینیم؟',
    body: 'استانبول یکی از قطب‌های گردشگری درمانی منطقه است. پیشنهاد ما ابتدا چکاپ کامل در بیمارستان‌های طرف قرارداد است. با بسته درمانی فیروز، ویزا، پرواز، اقامت نزدیک بیمارستان و مترجم فارسی‌زبان در قالب یک سفارش واحد ارائه می‌شود.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO1u66yynVHs71UnNdz7s6n_p1D7kZ-nzmWNL2nDkknPPrkm0KBcohb5dFlkudd28Q_uOA-BcstQYDOTvgsVa_46xngulIaw4pW5qxBLr7HOt3Vp7ueopEFrkUf5LeWpDc8am55_ntitKJhHboFzA-oyP3M1XHxk_TJHpLX-X6L7LDMnqgA113nAuirStO7smsfJq7WWwCb0HbyRKzEiQR3BfFkpgjhFNUqXf6bMBPwylSR0Gj4YLT'
  },
  {
    id: 'a4',
    category: 'نکات خرید',
    title: '۷ نکته خرید بلیت ارزان چارتری',
    readTime: '۴ دقیقه',
    gradient: 'from-tour/80 to-tour',
    excerpt: 'بلیت چارتری بخریم یا سیستمی؟ کدام برای سفر من مناسب‌تر است؟',
    body: 'بلیت‌های چارتری معمولاً ۲۰ تا ۴۰ درصد ارزان‌ترند اما غیرقابل کنسلی هستند. اگر تاریخ سفر شما قطعی است، چارتری بخرید؛ در غیر این صورت سیستمی با جریمه کم انتخاب بهتری است. با ابزار مقایسه قیمت فیروز می‌توانید قیمت‌ها را در تقویم دوگانه شمسی/میلادی ببینید.',
    icon: PlaneTakeoff
  },
];

export default function GuidePage() {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const selectedArticle = ARTICLES.find(a => a.id === openId);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 max-w-[1280px]">
      
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden mb-12 min-h-[400px] flex items-end p-8 shadow-sm">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDonc3pJALSi5oDUv59ZyawABTM2A-0tTlTHQ7mFXfTJl5zV9oDt9ngvykdwQfRlDyI-Lmdfjpdsld73NvUBXuEln_zEPV28DN4y6YFOWzdsrdW4Gr91NIlYYADD5PfFnwpYMVXie6V2NnLBjbu2LohUfi8kkM68xmT8fK7o69N1GSZnq_CZWIhDyZ6_tcxq5eYuGcggkjI19ryBd71_x5gzJzTVkuMP6t6NJDUj2xNdjq-HG9gI2XFxwJLPq3H_lOz2A')" }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-deep/80 via-deep/40 to-transparent" />
        <div className="relative z-10 w-full max-w-2xl">
          <span className="inline-block px-4 py-1.5 bg-brand/90 text-surface font-bold text-[13px] rounded-full mb-4 shadow-sm backdrop-blur-md">
            راهنمای سفر
          </span>
          <h1 className="font-black text-[32px] md:text-[40px] text-surface mb-4 leading-tight">
            کشف شگفتی‌های پنهان، سفر به قلب تاریخ
          </h1>
          <p className="font-bold text-[16px] md:text-[18px] text-surface/80 mb-8 leading-relaxed">
            از کوچه پس کوچه‌های باستانی تا مناظر طبیعی بکر، ما راهنمای شما در کشف بهترین مقاصد گردشگری هستیم.
          </p>
          <Button 
            onClick={() => router.push('/tours')}
            className="bg-brand text-surface px-8 h-12 rounded-full font-black text-[15px] hover:bg-brand-2 transition-colors shadow-sm"
          >
            مشاهده تورهای ویژه
          </Button>
        </div>
      </section>

      {/* Bento Grid Tips & Articles */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-black text-[28px] text-brand mb-2">نکات و مقالات کاربردی</h2>
            <p className="font-bold text-[15px] text-sub">برای تجربه‌ای بی‌نظیر، قبل از سفر بخوانید.</p>
          </div>
          <Link href="/travelogues" className="hidden md:flex text-brand hover:text-brand-2 transition-colors font-black text-[14px] items-center gap-1">
            مشاهده همه <ArrowLeft size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[250px]">
          
          {/* Article 1: Large Image (2x2) */}
          <div 
            onClick={() => setOpenId(ARTICLES[0].id)}
            className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${ARTICLES[0].image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity group-hover:opacity-90" />
            <div className="absolute bottom-0 start-0 end-0 p-8">
              <span className="inline-block px-3 py-1.5 bg-surface/20 backdrop-blur-md text-surface font-bold text-[12px] rounded-lg mb-4">
                {ARTICLES[0].category}
              </span>
              <h3 className="font-black text-[24px] md:text-[28px] text-surface mb-3 group-hover:text-brand transition-colors">
                {ARTICLES[0].title}
              </h3>
              <p className="font-bold text-[14px] text-surface/80 line-clamp-2 leading-relaxed">
                {ARTICLES[0].excerpt}
              </p>
            </div>
          </div>

          {/* Article 2: Wide Text Block (2x1) */}
          <div 
            onClick={() => setOpenId(ARTICLES[1].id)}
            className="md:col-span-2 rounded-xl bg-surface border border-line shadow-sm p-8 flex flex-col justify-between hover:border-brand hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {(() => { const Icon = ARTICLES[1].icon; return Icon && <Icon size={28} />; })()}
              </div>
              <span className="text-sub font-bold text-[12px] bg-soft px-3 py-1 rounded-full">
                {ARTICLES[1].readTime}
              </span>
            </div>
            <div>
              <h3 className="font-black text-[20px] text-ink mb-2 group-hover:text-brand transition-colors">
                {ARTICLES[1].title}
              </h3>
              <p className="font-bold text-[14px] text-sub leading-7 line-clamp-2">
                {ARTICLES[1].excerpt}
              </p>
            </div>
          </div>

          {/* Article 3: Small Image Block (1x1) */}
          <div 
            onClick={() => setOpenId(ARTICLES[2].id)}
            className="rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url('${ARTICLES[2].image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent group-hover:bg-black/60 transition-colors" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              <span className="inline-block px-2 py-1 bg-brand text-surface font-bold text-[10px] rounded mb-2 w-fit">
                {ARTICLES[2].category}
              </span>
              <h4 className="font-black text-[16px] text-surface leading-tight">
                {ARTICLES[2].title}
              </h4>
            </div>
          </div>

          {/* Article 4: Colored Block (1x1) */}
          <div 
            onClick={() => setOpenId(ARTICLES[3].id)}
            className="rounded-2xl bg-brand/10 text-brand p-6 flex flex-col justify-center items-center text-center hover:bg-brand hover:text-surface transition-colors shadow-sm cursor-pointer group"
          >
            {(() => { const Icon = ARTICLES[3].icon; return Icon && <Icon size={48} className="mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />; })()}
            <h4 className="font-black text-[18px] leading-tight">
              {ARTICLES[3].title}
            </h4>
          </div>

        </div>
        
        <Link href="/travelogues" className="md:hidden mt-6 flex justify-center text-brand font-black text-[14px] items-center gap-1">
          مشاهده همه مقالات <ArrowLeft size={16} />
        </Link>
      </section>

      {/* Support Section */}
      <div className="bg-gradient-to-l from-brand-dark to-brand rounded-2xl p-8 md:p-10 text-surface flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex items-center gap-5 text-center md:text-end">
          <div className="w-16 h-16 rounded-full bg-surface/20 flex items-center justify-center backdrop-blur-sm shrink-0">
            <Headset size={32} />
          </div>
          <div>
            <p className="font-black text-[24px] mb-1">هنوز سوال دارید؟</p>
            <p className="font-bold text-[15px] opacity-90">کارشناسان فیروز ۲۴ ساعته پاسخگوی شما هستند</p>
          </div>
        </div>
        <Link href="/support" className="relative z-10 w-full md:w-auto">
          <Button variant="outline" className="w-full md:w-auto border-white text-surface hover:bg-surface hover:text-brand px-10 h-14 font-black text-[15px] rounded-xl shadow-sm">
            تماس با پشتیبانی
          </Button>
        </Link>
      </div>

      {/* Modal for Article Reading */}
      {openId && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpenId(null)}>
          <div 
            className="bg-surface rounded-xl shadow-elev-1 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedArticle.image && (
              <div 
                className="h-48 w-full bg-cover bg-center relative"
                style={{ backgroundImage: `url('${selectedArticle.image}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button aria-label="بستن"
                  onClick={() => setOpenId(null)}
                  className="absolute top-4 end-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-surface rounded-full flex items-center justify-center transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {!selectedArticle.image && (
              <div className="flex justify-between items-center p-4 border-b border-line">
                <span className="font-bold text-sub text-[12px] bg-soft px-3 py-1 rounded-full">{selectedArticle.category}</span>
                <button aria-label="بستن"
                  onClick={() => setOpenId(null)}
                  className="w-8 h-8 bg-soft hover:bg-line/50 text-sub rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                {selectedArticle.image && (
                  <span className="font-bold text-surface bg-brand text-[11px] px-3 py-1 rounded-full shadow-sm">{selectedArticle.category}</span>
                )}
                <span className="text-sub font-bold text-[12px] flex items-center gap-1">
                   {selectedArticle.readTime} مطالعه
                </span>
              </div>
              <h2 className="font-black text-[24px] text-ink mb-6 leading-tight">
                {selectedArticle.title}
              </h2>
              <div className="font-bold text-[15px] text-sub leading-8 whitespace-pre-wrap">
                {selectedArticle.body}
              </div>
              
              <div className="mt-8 pt-6 border-t border-line flex justify-end">
                <Button onClick={() => setOpenId(null)} className="bg-brand hover:bg-brand-2 text-surface font-black rounded-xl px-8">
                  بستن
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
