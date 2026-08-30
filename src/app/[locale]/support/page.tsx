'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { shimmerDataUrl } from '@/lib/image-utils';
import { Phone, Mail, MessageSquare, Send, CheckCircle2, Headphones } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { lt } from '@/lib/lt';

export default function SupportPage() {
  const t = useTranslations('Support');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col min-h-screen bg-soft pb-24">
      {/* Hero Section */}
      <section className="relative w-full h-[320px] md:h-[400px] flex items-center justify-center overflow-hidden mb-12">
        <Image
          src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=75&w=1800"
          alt={t('title')}
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={shimmerDataUrl(1800, 400)}
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-soft via-brand-dark/60 to-transparent" />
        
        <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface/20 backdrop-blur-md grid place-items-center text-surface mb-4">
            <Headphones size={28} />
          </div>
          <h1 className="text-[32px] md:text-[40px] font-black text-surface mb-3 tracking-tight drop-shadow-md">{t('title')}</h1>
          <p className="text-[16px] md:text-[18px] font-bold text-surface/90 drop-shadow">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Contact Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('phone')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'پاسخگویی ۲۴ ساعته در تمام روزهای هفته', en: '24/7 round-the-clock availability', ar: 'متاحون على مدار الساعة طوال أيام الأسبوع', zh: '全天候 24/7 在线', ru: 'Круглосуточно, все дни недели' })}</p>
                <a href="tel:+982191000000" dir="ltr" className="text-sm font-black text-brand-dark hover:underline font-mono">
                  +98 (21) 9100-0000
                </a>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('email')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'پاسخگویی به سوالات و استردادها', en: 'Questions, vouchers & refund requests', ar: 'الإجابة على الاستفسارات وطلبات الاسترداد', zh: '解答疑问与退款申请', ru: 'Ответы на вопросы и заявки на возврат' })}</p>
                <a href="mailto:support@firuzo.com" className="text-sm font-black text-brand-dark hover:underline font-mono">
                  support@firuzo.com
                </a>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('liveChat')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'گفتگوی آنلاین با کارشناسان پشتیبانی', en: 'Chat instantly with our dedicated travel experts', ar: 'دردش مباشرة مع خبراء السفر لدينا', zh: '与专属旅行顾问在线聊天', ru: 'Мгновенный чат с нашими экспертами' })}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-success">
                  <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                  {lt(locale, { fa: 'آنلاین — آماده پاسخگویی', en: 'Online — Ready to assist', ar: 'متصلون — جاهزون للمساعدة', zh: '在线 — 随时协助', ru: 'Онлайн — готовы помочь' })}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Form */}
          <div className="lg:col-span-2 bg-surface rounded-2xl p-8 border border-line shadow-sm">
            <h2 className="font-black text-2xl text-ink mb-2">{t('contactForm')}</h2>
            <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'پیام خود را ثبت کنید؛ در سریع‌ترین زمان ممکن پاسخ خواهیم داد.', en: 'Submit your query below and our team will get back to you promptly.', ar: 'سجّل رسالتك وسنرد عليك في أسرع وقت.', zh: '请提交您的问题，我们会尽快回复。', ru: 'Оставьте сообщение — мы ответим как можно скорее.' })}</p>

            {submitted ? (
              <div className="p-8 text-center bg-mint/40 rounded-2xl border border-brand/30 flex flex-col items-center">
                <CheckCircle2 size={48} className="text-brand mb-3" />
                <h3 className="font-black text-lg text-ink mb-1">{lt(locale, { fa: 'پیام شما دریافت شد', en: 'Ticket Submitted Successfully', ar: 'تم استلام رسالتك', zh: '工单提交成功', ru: 'Обращение отправлено' })}</h3>
                <p className="text-xs font-bold text-sub mb-6">{lt(locale, { fa: 'کارشناسان فیروز ظرف کمتر از ۲ ساعت با شما در تماس خواهند بود.', en: 'Our team will review your inquiry and follow up within 2 hours.', ar: 'سيتواصل معك فريق فيروزو خلال أقل من ساعتين.', zh: 'Firuzo 专家将在 2 小时内与您联系。', ru: 'Специалисты Firuzo свяжутся с вами в течение 2 часов.' })}</p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-brand text-surface text-xs font-black"
                >
                  {lt(locale, { fa: 'ثبت پیام جدید', en: 'Send Another Message', ar: 'إرسال رسالة جديدة', zh: '再发一条消息', ru: 'Отправить ещё сообщение' })}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام و نام خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}</label>
                    <Input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={lt(locale, { fa: 'علی رضایی', en: 'John Doe', ar: 'علي رضائي', zh: '阿里·雷扎伊', ru: 'Али Резаи' })}
                      className="font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sub mb-1">{t('email')}</label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="font-bold text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'موضوع پیام', en: 'Subject', ar: 'موضوع الرسالة', zh: '主题', ru: 'Тема' })}</label>
                  <Input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={lt(locale, { fa: 'پیگیری رزرو / استرداد وجه', en: 'Booking inquiry / Refund', ar: 'استفسار عن حجز / استرداد أموال', zh: '预订咨询 / 退款', ru: 'Вопрос по бронированию / Возврат' })}
                    className="font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'متن پیام', en: 'Message', ar: 'نص الرسالة', zh: '消息内容', ru: 'Текст сообщения' })}</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={lt(locale, { fa: 'توضیحات درخواست خود را بنویسید...', en: 'Please describe your request in detail...', ar: 'اشرح طلبك بالتفصيل...', zh: '请详细描述您的需求…', ru: 'Опишите ваш запрос подробно…' })}
                    className="w-full rounded-xl border border-line p-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-action hover:bg-action-hover text-[#14201f] font-black text-sm transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send size={16} />
                  <span>{t('sendMessage')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
