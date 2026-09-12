'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { cn } from '@/lib/utils';
import { FiruzoMascot, FiruzoMascotHead, type FiruzoEmotion } from '@/components/shared/FiruzoMascot';
import { Send, X, RotateCcw, Sparkles } from 'lucide-react';

/**
 * Firuzo AI assistant widget (دستیار هوشمند فیروزو) — mascot-first chat.
 * Mobile: bottom sheet with drag handle (AGENTS.md 1.2). Desktop: floating
 * card above the ContactDock. The mascot mirrors conversation mood.
 */

interface ChatMsg {
  role: 'USER' | 'ASSISTANT';
  content: string;
  isError?: boolean;
}

const CONV_KEY = 'firuzo_chat_conv';

const SUGGESTIONS: Array<{ fa: string; en: string; ar: string; zh: string; ru: string }> = [
  { fa: 'پرواز ارزان تهران→استانبول می‌خوام', en: 'Find me a cheap Tehran→Istanbul flight', ar: 'أريد رحلة رخيصة من طهران إلى إستانبول', zh: '帮我找德黑兰飞伊斯坦布尔的便宜机票', ru: 'Найдите дешёвый рейс Тегеран→Стамбул' },
  { fa: 'چطور بلیطم رو کنسل کنم؟', en: 'How do I cancel my ticket?', ar: 'كيف ألغي تذكرتي؟', zh: '如何取消机票？', ru: 'Как отменить билет?' },
  { fa: 'کیف پولم رو چطور شارژ کنم؟', en: 'How do I top up my wallet?', ar: 'كيف أشحن محفظتي؟', zh: '如何给钱包充值？', ru: 'Как пополнить кошелёк?' },
  { fa: 'بیمه سفر شنگن لازم دارم', en: 'I need Schengen travel insurance', ar: 'أحتاج تأمين سفر شنغن', zh: '我需要申根旅行保险', ru: 'Мне нужна страховка для Шенгена' },
];

export function FiruzoChatWidget() {
  const locale = useLocale();
  const pathname = usePathname() || '';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Same exclusion logic as ContactDock: product pages with sticky bottom CTAs
  const isExcluded =
    !pathname.includes('/search') &&
    (pathname.includes('/checkout') ||
      pathname.includes('/payment-status') ||
      /^\/([a-z]{2}\/)?(hotels|tours)\/(?!search)[^/]+$/.test(pathname));

  // Mobile: hidden until first scroll (same rule as ContactDock). Touch devices
  // are detected post-hydration so SSR never touches `window`.
  const [pastFold, setPastFold] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window);
    function onScroll() {
      setPastFold(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click outside on desktop closes the floating card
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (window.innerWidth >= 768) {
          setOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Restore last conversation id
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CONV_KEY);
      if (saved) setConversationId(saved);
    } catch {
      // private mode
    }
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setInput('');
      setMessages((prev) => [...prev, { role: 'USER', content: trimmed }]);
      setSending(true);
      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, conversationId, locale }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.conversationId) {
            setConversationId(data.conversationId);
            try {
              sessionStorage.setItem(CONV_KEY, data.conversationId);
            } catch {
              // ignore
            }
          }
          setMessages((prev) => [...prev, { role: 'ASSISTANT', content: String(data.reply || '') }]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'ASSISTANT',
              content:
                lt(locale, {
                  fa: 'ای وای، ارتباطم قطع شد 🙁 دوباره امتحان کن یا از پشتیبانی ۲۴ ساعته (۰۲۱-۹۱۰۰۰۰۰۰) کمک بگیر.',
                  en: 'Oops, I lost the connection 🙁 Please try again, or reach 24/7 support at +98 21 9100 0000.',
                  ar: 'انقطع الاتصال 🙁 حاول مرة أخرى أو تواصل مع الدعم.',
                  zh: '连接中断 🙁 请重试或联系 24/7 客服。',
                  ru: 'Соединение прервалось 🙁 Попробуйте ещё раз или обратитесь в поддержку.',
                }) as string,
              isError: true,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ASSISTANT',
            content: lt(locale, {
              fa: 'ارتباط برقرار نشد؛ اینترنتت را بررسی کن و دوباره بپرس 🙏',
              en: 'Could not reach the server; check your connection and try again 🙏',
              ar: 'تعذر الاتصال بالخادم؛ تحقق من اتصالك وحاول مجدداً 🙏',
              zh: '无法连接服务器；请检查网络后重试 🙏',
              ru: 'Не удалось связаться с сервером; проверьте соединение 🙏',
            }) as string,
            isError: true,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, locale, sending],
  );

  function resetConversation() {
    setMessages([]);
    setConversationId(undefined);
    try {
      sessionStorage.removeItem(CONV_KEY);
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  }

  // Mascot mirrors the conversation mood
  const lastMsg = messages[messages.length - 1];
  let emotion: FiruzoEmotion = 'happy';
  if (sending) emotion = 'curious';
  else if (lastMsg?.isError) emotion = 'confused';
  else if (open && messages.length === 0) emotion = 'excited';
  else if (lastMsg?.role === 'ASSISTANT' && /✈️|🎉|🍃|😊/.test(lastMsg.content)) emotion = 'successful';

  const fabVisible = pastFold || !isTouch;

  return (
    <>
      {/* FAB — stacked above the ContactDock */}
      {!open && (
        <div
          className={cn(
            'fixed z-[120] end-4 md:end-6 max-md:transition-all max-md:duration-200',
            isExcluded
              ? 'bottom-[calc(184px+env(safe-area-inset-bottom))] md:bottom-[84px]'
              : 'bottom-[calc(142px+env(safe-area-inset-bottom))] md:bottom-[84px]',
            fabVisible ? 'max-md:opacity-100 max-md:visible' : 'max-md:opacity-0 max-md:invisible max-md:translate-y-2',
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={lt(locale, {
              fa: 'گفتگو با دستیار هوشمند فیروزو',
              en: 'Chat with Firuzo AI assistant',
              ar: 'تحدث مع مساعد فيروزو الذكي',
              zh: '与 Firuzo AI 助手聊天',
              ru: 'Чат с ИИ-помощником Firuzo',
            })}
            aria-expanded={open}
            className="relative min-h-[48px] w-[48px] md:w-auto md:h-12 md:px-4 rounded-full bg-brand hover:bg-brand-2 text-surface border border-brand-dark/30 backdrop-blur-md shadow-elev-2 hover:shadow-elev-3 transition-all inline-flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark active:scale-[0.98]"
          >
            <FiruzoMascotHead size={30} />
            <span className="max-md:hidden text-xs font-black text-surface">
              {lt(locale, { fa: 'دستیار هوشمند', en: 'AI Assistant', ar: 'المساعد الذكي', zh: '智能助手', ru: 'ИИ-помощник' })}
            </span>
            <span aria-hidden="true" className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface" />
          </button>
        </div>
      )}

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[240] bg-ink/50 backdrop-blur-[2px] md:hidden animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-label={lt(locale, { fa: 'گفتگو با دستیار هوشمند فیروزو', en: 'Firuzo AI assistant chat', ar: 'محادثة مساعد فيروزو الذكي', zh: 'Firuzo AI 助手对话', ru: 'Чат с ИИ-помощником Firuzo' })}
            className={cn(
              'fixed z-[250] flex flex-col bg-surface border border-line shadow-elev-3 overflow-hidden',
              // Mobile: bottom sheet with drag handle
              'inset-x-0 bottom-0 rounded-t-3xl h-[86dvh] animate-in slide-in-from-bottom duration-200',
              // Desktop: floating card (explicit flex display & positioning)
              'md:flex md:flex-col md:inset-x-auto md:bottom-[84px] md:end-6 md:h-[580px] md:max-h-[85vh] md:w-[400px] md:rounded-3xl md:animate-in md:fade-in md:slide-in-from-bottom-2 md:duration-150',
            )}
          >
            {/* Drag handle (mobile) */}
            <div className="md:hidden pt-2 pb-1" aria-hidden="true">
              <span className="block w-10 h-1 rounded-full bg-line mx-auto" />
            </div>

            {/* Header */}
            <div className="relative flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-mint/60 to-surface border-b border-line">
              <div className="relative">
                <FiruzoMascot emotion={emotion} size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black text-ink leading-tight">
                  {lt(locale, { fa: 'فیروزو', en: 'Firuzo', ar: 'فيروزو', zh: 'Firuzo', ru: 'Firuzo' })}
                </p>
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-sub">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                  {sending
                    ? lt(locale, { fa: 'دارم فکر می‌کنم…', en: 'Thinking…', ar: 'أفكر…', zh: '思考中…', ru: 'Думаю…' })
                    : lt(locale, { fa: 'دستیار سفر تو، آنلاین', en: 'Your travel assistant, online', ar: 'مساعد سفرك متصل', zh: '你的旅行助手在线', ru: 'Ваш помощник онлайн' })}
                </p>
              </div>
              <button
                type="button"
                onClick={resetConversation}
                aria-label={lt(locale, { fa: 'گفتگوی جدید', en: 'New conversation', ar: 'محادثة جديدة', zh: '新对话', ru: 'Новый чат' })}
                title={lt(locale, { fa: 'گفتگوی جدید', en: 'New conversation', ar: 'محادثة جديدة', zh: '新对话', ru: 'Новый чат' })}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl text-sub transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={lt(locale, { fa: 'بستن گفتگو', en: 'Close chat', ar: 'إغلاق المحادثة', zh: '关闭对话', ru: 'Закрыть чат' })}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl text-sub transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-soft/40"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center gap-2 pt-4">
                  <FiruzoMascot emotion="excited" size={96} />
                  <p className="text-sm font-black text-ink">
                    {lt(locale, { fa: 'سلام! من فیروزو هستم 🍃', en: 'Hi! I am Firuzo 🍃', ar: 'مرحباً! أنا فيروزو 🍃', zh: '你好！我是 Firuzo 🍃', ru: 'Привет! Я Firuzo 🍃' })}
                  </p>
                  <p className="text-[11.5px] font-bold text-sub max-w-[280px] leading-relaxed">
                    {lt(locale, {
                      fa: 'دستیار سفر تو هستم؛ از پرواز و هتل تا ویزا و کیف پول. بپرس تا قدم‌به‌قدم راهنمایی‌ات کنم.',
                      en: 'Your travel companion — flights, hotels, visas and wallet. Ask me anything and I will walk you through it.',
                      ar: 'رفيق سفرك — رحلات وفنادق وتأشيرات ومحفظة. اسألني أي شيء.',
                      zh: '你的旅行伙伴——机票、酒店、签证和钱包。尽管问我。',
                      ru: 'Ваш спутник в путешествиях — рейсы, отели, визы и кошелёк. Спрашивайте!',
                    })}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.en}
                        type="button"
                        onClick={() => send((s as Record<string, string>)[locale] || s.en)}
                        className="min-h-[36px] px-3 py-1.5 rounded-full bg-surface border border-line text-[11px] font-black text-ink hover:border-brand/50 hover:bg-mint/50 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {(s as Record<string, string>)[locale] || s.en}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cn('flex items-end gap-2', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'ASSISTANT' && <FiruzoMascotHead size={26} className="mb-0.5 hidden sm:block" />}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[12.5px] font-bold leading-relaxed shadow-xs whitespace-pre-wrap break-words',
                      m.role === 'USER'
                        ? 'bg-brand text-surface rounded-ee-md'
                        : m.isError
                          ? 'bg-rose-warm/10 text-rose-warm border border-rose-warm/25 rounded-es-md'
                          : 'bg-surface text-ink border border-line rounded-es-md',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-end gap-2 justify-start">
                  <FiruzoMascotHead size={26} className="mb-0.5 hidden sm:block" />
                  <div className="bg-surface border border-line rounded-2xl rounded-es-md px-4 py-3 flex items-center gap-1.5 shadow-xs" aria-label={lt(locale, { fa: 'در حال نوشتن', en: 'Typing', ar: 'يكتب', zh: '输入中', ru: 'Печатает' })}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input row — thumb zone */}
            <div className="border-t border-line bg-surface px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={1000}
                  enterKeyHint="send"
                  aria-label={lt(locale, { fa: 'متن پیام', en: 'Message text', ar: 'نص الرسالة', zh: '消息内容', ru: 'Текст сообщения' })}
                  placeholder={lt(locale, { fa: 'سوال سفرت را بپرس…', en: 'Ask your travel question…', ar: 'اسأل سؤال سفرك…', zh: '输入你的旅行问题…', ru: 'Задайте вопрос о путешествии…' })}
                  className="flex-1 min-h-[44px] rounded-2xl border border-line bg-soft/50 px-4 text-[13px] font-bold text-ink placeholder:text-sub/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label={lt(locale, { fa: 'ارسال پیام', en: 'Send message', ar: 'إرسال الرسالة', zh: '发送消息', ru: 'Отправить' })}
                  className="grid min-h-[44px] min-w-[44px] place-items-center rounded-2xl bg-brand text-surface transition hover:bg-brand-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Send size={17} aria-hidden="true" className="rtl:rotate-180" />
                </button>
              </form>
              <p className="mt-1.5 flex items-center justify-center gap-1 text-[9.5px] font-bold text-sub/70 text-center">
                <Sparkles size={9} aria-hidden="true" />
                {lt(locale, {
                  fa: 'پاسخ‌ها پیشنهاد هوش مصنوعی است؛ قیمت و ظرفیت قطعی در مرحله صدور تثبیت می‌شود.',
                  en: 'AI-generated suggestions; final price & inventory are confirmed at issuance.',
                  ar: 'اقتراحات مولدة بالذكاء الاصطناعي؛ يثبت السعر النهائي عند الإصدار.',
                  zh: 'AI 生成建议；最终价格与库存以出票为准。',
                  ru: 'Предложения ИИ; окончательная цена подтверждается при выписке.',
                })}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
