'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Search, Receipt, CalendarDays, Ticket, Plane, Hotel, Map, User, CreditCard, FileText, ChevronDown, MessageCircle, Headset, X, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FAQS = [
  { q: 'چگونه می‌توانم بلیط پرواز خود را کنسل کنم؟', a: 'برای کنسلی بلیط، به بخش \'سفرهای من\' در حساب کاربری خود بروید. پرواز مورد نظر را انتخاب کرده و روی گزینه \'درخواست استرداد\' کلیک کنید. جریمه کنسلی با توجه به قوانین ایرلاین محاسبه شده و مابقی مبلغ به کیف پول یا حساب بانکی شما بازگردانده می‌شود.' },
  { q: 'مدت زمان بازگشت وجه پس از کنسلی چقدر است؟', a: 'به طور معمول بازگشت وجه به کیف پول بلافاصله انجام می‌شود. در صورت درخواست واریز به حساب بانکی، این فرآیند ممکن است بین ۲۴ تا ۷۲ ساعت کاری زمان ببرد.' },
  { q: 'آیا می‌توانم نام مسافر را در بلیط سیستمی تغییر دهم؟', a: 'در پروازهای سیستمی داخلی، تغییر نام امکان‌پذیر نیست و باید بلیط کنسل شده و مجدداً خریداری شود. در برخی پروازهای چارتری با پرداخت جریمه جزئی ممکن است این امکان وجود داشته باشد. لطفاً با پشتیبانی تماس بگیرید.' },
  { q: 'نحوه شارژ اسنپ برای گردشگران خارجی چگونه است؟', a: 'گردشگران خارجی بدون نیاز به کارت بانکی ایرانی می‌توانند از طریق سرویس شارژ اسنپ با کارت‌های Visa و MasterCard حساب اسنپ خود را در کمتر از ۵ دقیقه شارژ کنند.' },
  { q: 'فیروز پاس در چه شهرهایی کار می‌کند؟', a: 'کارت فیروز پاس در شهرهای تهران، اصفهان، مشهد و شیراز برای خطوط مترو و اتوبوس‌های تندرو (BRT) فعال است.' },
];

const CATEGORIES = [
  { icon: Plane, title: 'پرواز', desc: 'قوانین بار، چک‌این، تاخیرها و تغییر کلاس پروازی', href: '/flights/search' },
  { icon: Hotel, title: 'هتل', desc: 'تحویل اتاق، امکانات، کنسلی و تغییر نفرات', href: '/hotels/search' },
  { icon: Map, title: 'تورها', desc: 'برنامه سفر، راهنما، ترانسفر و خدمات ویژه', href: '/tours' },
  { icon: User, title: 'حساب کاربری', desc: 'رمز عبور، امتیازات، کیف پول و تاریخچه خرید', href: '/account' },
  { icon: CreditCard, title: 'پرداخت و مالی', desc: 'مشکلات درگاه، صدور فاکتور و استرداد وجه', href: '/wallet' },
  { icon: FileText, title: 'ویزا و مدارک', desc: 'مدارک لازم، پیگیری وضعیت و قوانین جدید', href: '/visa' },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'سلام! 👋 من دستیار هوشمند پشتیبانی iTrip هستم. چطور می‌توانم کمکتان کنم؟' },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputMessage('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'پیام شما دریافت شد. یکی از کارشناسان پشتیبانی ۲۴ ساعته ما در حال بررسی درخواست شماست و به‌زودی پاسخ خواهد داد.',
        },
      ]);
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-soft">
      <main className="flex-grow flex flex-col items-center w-full pb-16">
        
        {/* Hero Search Section */}
        <section className="w-full relative h-[300px] md:h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              alt="Hero background" 
              className="w-full h-full object-cover opacity-80" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxlwO8vxZ1PuDcWm7jIvIevT5uYvR8hIxlmgSa4zJOIMFRqdY1yRQEVrpikpr5utAhlVDNzcZFtbmFbo5Y5gUnnHeUhVl1KiIJW4itbLZLafLC6pnRX5AAS0SZ3hgmuPUG8SCtwC13TGWboOJsKfFz7B2lrpbOdE31r403iWT9qTTRdZ3DsYEUtzl13sypfj2JDWqeeS3RHYRwIUbBnDb_5pXxcDPLsXi2mvOruVQ4U0gfYeqNG7obCJibnds5JhJIEA"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/40 to-soft"></div>
          </div>
          
          <div className="z-10 text-center w-full max-w-3xl px-4 md:px-0">
            <h1 className="font-black text-[28px] md:text-[40px] text-ink mb-4 drop-shadow-md">چگونه می‌توانیم به شما کمک کنیم؟</h1>
            <p className="font-bold text-[16px] md:text-[18px] text-sub mb-8 drop-shadow-sm">جستجو در مقالات، سوالات متداول و راهنماهای کاربردی</p>
            
            <div className="relative w-full max-w-2xl mx-auto shadow-md rounded-2xl">
              <div className="absolute inset-y-0 end-0 pe-5 flex items-center pointer-events-none">
                <Search className="text-sub" size={24} />
              </div>
              <input 
                className="w-full ps-4 pe-14 py-4 rounded-xl border-none outline-none ring-1 ring-line bg-surface shadow-sm focus:ring-2 focus:ring-brand text-[16px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" 
                placeholder="جستجوی سوال یا کلمه کلیدی..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Main FAQ Categories */}
          <div className="col-span-1 md:col-span-3 md:order-first flex flex-col gap-12">
            
            {/* Category Grid */}
            <section>
              <h2 className="font-black text-[24px] md:text-[32px] mb-6 text-ink">دسته‌بندی‌های راهنما</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <Link key={idx} href={cat.href} className="group block p-6 bg-surface border border-line rounded-xl hover:shadow-md hover:border-brand/30 transition-all hover:-translate-y-1">
                      <Icon className="text-brand mb-4" size={36} />
                      <h3 className="font-black text-[20px] text-ink mb-2 group-hover:text-brand transition-colors">{cat.title}</h3>
                      <p className="font-bold text-[14px] text-sub">{cat.desc}</p>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* FAQs */}
            <section>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Support Team" 
                className="w-full rounded-2xl object-cover h-[200px] md:h-[300px] mb-8 shadow-sm" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxlwO8vxZ1PuDcWm7jIvIevT5uYvR8hIxlmgSa4zJOIMFRqdY1yRQEVrpikpr5utAhlVDNzcZFtbmFbo5Y5gUnnHeUhVl1KiIJW4itbLZLafLC6pnRX5AAS0SZ3hgmuPUG8SCtwC13TGWboOJsKfFz7B2lrpbOdE31r403iWT9qTTRdZ3DsYEUtzl13sypfj2JDWqeeS3RHYRwIUbBnDb_5pXxcDPLsXi2mvOruVQ4U0gfYeqNG7obCJibnds5JhJIEA"
              />
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-[24px] md:text-[32px] text-ink">سوالات پر تکرار</h2>
                {searchQuery && (
                  <span className="text-xs font-bold text-sub bg-soft px-3 py-1 rounded-full">
                    {filteredFaqs.length} مورد یافت شد
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-line rounded-xl text-sub">
                    موردی مطابق با جستجوی شما یافت نشد. لطفاً از طریق چت زنده با ما در تماس باشید.
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => (
                    <details key={idx} className="group bg-surface border border-line rounded-xl overflow-hidden [&>summary::-webkit-details-marker]:hidden shadow-sm">
                      <summary className="flex justify-between items-center font-black text-[18px] text-ink cursor-pointer p-5 hover:bg-soft transition-colors select-none">
                        <span>{faq.q}</span>
                        <ChevronDown className="text-sub transition-transform duration-300 group-open:rotate-180 shrink-0" size={24} />
                      </summary>
                      <div className="p-5 border-t border-line/60 bg-soft/50 font-bold text-[15px] text-sub leading-relaxed">
                        {faq.a}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Quick Actions (Sidebar) */}
          <aside className="col-span-1 md:order-last">
            <div className="bg-surface rounded-xl p-6 sticky top-24 shadow-sm border border-line">
              <h3 className="font-black text-[20px] text-ink mb-6">دسترسی سریع</h3>
              <div className="flex flex-col gap-4">
                <Link href="/my-trips" className="flex items-center gap-4 p-4 rounded-xl bg-soft hover:bg-line/30 transition-colors shadow-sm group">
                  <div className="w-12 h-12 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-[15px] text-ink">پیگیری استرداد</h4>
                    <p className="font-bold text-[12px] text-sub">وضعیت بازگشت وجه</p>
                  </div>
                </Link>
                
                <Link href="/support" onClick={() => setChatOpen(true)} className="flex items-center gap-4 p-4 rounded-xl bg-soft hover:bg-line/30 transition-colors shadow-sm group">
                  <div className="w-12 h-12 rounded-full bg-action/10 text-action flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-[15px] text-ink">درخواست تغییرات</h4>
                    <p className="font-bold text-[12px] text-sub">تغییر تاریخ یا مشخصات</p>
                  </div>
                </Link>

                <Link href="/my-trips" className="flex items-center gap-4 p-4 rounded-xl bg-soft hover:bg-line/30 transition-colors shadow-sm group">
                  <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Ticket size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-[15px] text-ink">دریافت بلیط</h4>
                    <p className="font-bold text-[12px] text-sub">چاپ یا دانلود مجدد</p>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* Floating Live Chat Button */}
      <button 
        onClick={() => setChatOpen(true)}
        aria-label="پشتیبانی آنلاین" 
        className="fixed bottom-8 start-8 w-16 h-16 bg-brand text-surface rounded-full shadow-lg flex items-center justify-center hover:bg-brand-dark transition-all hover:scale-105 z-50 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <MessageCircle size={28} className="group-hover:hidden block" />
        <Headset size={28} className="hidden group-hover:block" />
      </button>

      {/* Live Chat Modal */}
      {chatOpen && (
        <div className="fixed bottom-24 start-8 z-50 w-[360px] md:w-[400px] h-[480px] bg-surface rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 bg-brand text-surface flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface/20 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-black text-[14px]">پشتیبانی آنلاین ۲۴/۷</h3>
                <span className="text-[11px] text-mint-bright font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-mint-bright animate-pulse" /> آنلاین
                </span>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="w-8 h-8 rounded-full bg-surface/10 hover:bg-surface/20 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-soft/50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-[13px] font-bold leading-relaxed ${
                  m.sender === 'user' ? 'bg-brand text-surface rounded-ee-none' : 'bg-surface text-ink border border-line rounded-es-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-3 bg-surface border-t border-line flex gap-2">
            <input 
              type="text"
              placeholder="پیام خود را بنویسید..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-[13px] bg-soft rounded-xl border border-line focus:outline-none focus:border-brand"
            />
            <Button type="submit" size="sm" className="bg-brand hover:bg-brand-2 text-surface px-4 rounded-xl">
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
