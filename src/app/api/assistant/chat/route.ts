import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { AiRouterService } from '@/domains/ai/AiRouterService';

/**
 * Firuzo AI Assistant chat endpoint (دستیار هوشمند فیروزو).
 *
 * - Multi-provider via AiRouterService (Gemini → DeepSeek → OpenAI → Claude)
 *   with the prompt-injection guard already wired inside the router.
 * - Persists threads per signed-in user (AssistantConversation/Message).
 * - Degrades gracefully: with no LLM keys configured, a local rule-based
 *   travel concierge answers from platform knowledge (same product-truth
 *   convention as /api/plan/refine).
 * - Rate limited per IP+session: 20 messages / 5 minutes.
 */

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().trim().max(64).optional(),
  locale: z.enum(['fa', 'en', 'ar', 'zh', 'ru']).default('fa'),
});

// ---- naive in-memory rate limiter (per warm instance; acceptable guardrail) ----
const rateBucket = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 20;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (rateBucket.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateBucket.set(key, hits);
  if (rateBucket.size > 5000) {
    // opportunistic sweep to keep the map bounded
    for (const [k, v] of rateBucket) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBucket.delete(k);
    }
  }
  return hits.length > RATE_MAX;
}

const PLATFORM_KNOWLEDGE = `Firuzo (فیروزو) is an Iranian online travel agency ("سفر، ساده‌تر از همیشه").
Services: domestic & international flight search/booking, hotels, tours, trains, transfers, travel insurance (Saman), visa services, international eSIM, interpreter SOS service, city-pass, corporate B2B hub, smart trip planner (/plan), travelogues and guides.
Payments: Shetab card gateway, eCardo wallet, USDT (TRC20) crypto, card-to-card receipts review, wallet top-up and multi-currency wallet (IRR Toman / USDT / AED) with exchange.
Booking lifecycle: DRAFT → HELD → PENDING_PAYMENT → PAYMENT_CONFIRMED → CONFIRMING_SUPPLIER → CONFIRMED (with ticket issuing), cancellations and refunds go to wallet after supplier penalty.
Customer panel: /account (dashboard/profile), /my-trips (bookings & vouchers), /wallet, /account/travelers (documents), /account/auto-buy (price-watching bot), /account/organization (B2B).
Loyalty: 7-day streak coins in the wallet, tiers Bronze→Silver→Gold→Platinum.
Support: 24/7 phone +98 21 9100 0000, email support@firuzo.com, Telegram t.me/firuzo_support, plus the on-site call widget.
Pricing truth: AI suggestions are estimates — final guaranteed price and inventory are confirmed only at booking issuance.`;

function buildSystemPrompt(locale: string, history: string): string {
  const langRule =
    locale === 'fa'
      ? 'Always answer in Persian (Farsi), friendly "تو" tone, max 4 short sentences unless the user asks for detail.'
      : locale === 'ar'
        ? 'Always answer in Arabic, friendly tone, max 4 short sentences.'
        : locale === 'zh'
          ? 'Always answer in Chinese, friendly tone, max 4 short sentences.'
          : locale === 'ru'
            ? 'Always answer in Russian, friendly tone, max 4 short sentences.'
            : 'Always answer in English, friendly tone, max 4 short sentences.';

  return `You are "فیروزو" — the AI travel assistant of the Firuzo travel platform. You are cheerful, warm and practical, like the Firuzo leaf mascot.
${langRule}
Stay strictly inside travel topics (flights, hotels, tours, visa, insurance, eSIM, transfers, wallet, bookings, Firuzo platform usage). If asked about anything unrelated, politely steer back to travel.
Never invent live prices, availability, PNRs or flight numbers. If the user needs a guaranteed price or a human, point them to search pages or the 24/7 support channels.
Do not process payments or access private data — you can only explain how the platform works and guide the user step by step.
${history ? `\nConversation so far:\n${history}\n` : ''}
Platform knowledge:
${PLATFORM_KNOWLEDGE}`;
}

/** Local rule-based concierge used when no LLM provider is configured/healthy. */
function heuristicReply(message: string, locale: string): string {
  const m = message.toLowerCase();
  const fa = locale === 'fa';

  const pick = (faText: string, enText: string) => (fa ? faText : enText);

  if (/(بلیط|پرواز|پروازها|flight|ticket|air)/.test(m)) {
    return pick(
      'برای جستجو و خرید بلیط پرواز داخلی و خارجی به بخش «پروازها» برو؛ بعد از پرداخت، وضعیت صدور بلیط را می‌توانی در «سفرهای من» دنبال کنی. اگر پرداخت انجام شده و بلیط صادر نشده، پشتیبانی ۲۴ ساعته (۰۲۱-۹۱۰۰۰۰۰۰) پیگیرت خواهد بود. ✈️',
      'Head to the Flights section to search and book domestic/international tickets. After payment, track ticket issuing under "My Trips". If payment succeeded but the ticket was not issued, our 24/7 support (+98 21 9100 0000) will follow up. ✈️',
    );
  }
  if (/(هتل|اقامت|hotel|room|accommodation)/.test(m)) {
    return pick(
      'رزرو هتل با تایید آنی و واچر رسمی انجام می‌شود؛ از بخش «هتل‌ها» مقصد و تاریخ را انتخاب کن. واچرها در «سفرهای من» قابل دانلودند و در صورت شرایط کنسلی، وجه به کیف پولت برمی‌گردد. 🏨',
      'Hotel bookings are confirmed instantly with an official voucher — pick your destination and dates in the Hotels section. Vouchers live under "My Trips" and cancellable rates refund to your wallet. 🏨',
    );
  }
  if (/(استرداد|لغو|کنسل|refund|cancel)/.test(m)) {
    return pick(
      'برای لغو و استرداد، وارد «سفرهای من» شو و رزرو موردنظر را باز کن؛ اگر شرایط کنسلی داشته باشد دکمه درخواست استرداد فعال است. پس از کسر جریمه تامین‌کننده، مابقی در چند دقیقه به کیف پول فیروزوت برمی‌گردد.',
      'To cancel, open the booking under "My Trips" — if the fare rules allow it, you will see the cancel & refund button. After the supplier penalty is deducted, the rest returns to your Firuzo wallet within minutes.',
    );
  }
  if (/(کیف پول|تتر|شارژ|wallet|usdt|top.?up|پرداخت|payment)/.test(m)) {
    return pick(
      'کیف پول فیروزو چندارزی است (تومان، تتر، درهم) و با درگاه شتاب و eCardo شارژ می‌شود؛ ارز هم می‌توانی داخل کیف پول تبدیل کنی. برای شارژ به بخش «کیف پول» برو.',
      'Your Firuzo wallet is multi-currency (Toman, USDT, AED) and can be topped up via the Shetab gateway or eCardo; you can even exchange currencies inside the wallet. Open the Wallet section to top up.',
    );
  }
  if (/(ویزا|visa)/.test(m)) {
    return pick(
      'خدمات ویزا فیروزو شامل مشاوره، تکمیل مدارک و پیگیری سفارت است؛ از بخش «ویزا» کشور مقصد را انتخاب کن تا مدارک لازم و زمان‌بندی را ببینی.',
      'Firuzo visa services cover consultation, document preparation and embassy follow-up — choose your destination in the Visa section to see requirements and timelines.',
    );
  }
  if (/(بیمه|insurance)/.test(m)) {
    return pick(
      'بیمه‌نامه سفر سامان با پوشش ۳۰ تا ۵۰ هزار یورو و تایید سفارت‌های شنگن از بخش «بیمه مسافرتی» قابل صدور آنی است.',
      'Saman travel insurance with €30k–€50k coverage and full Schengen acceptance can be issued instantly from the Insurance section.',
    );
  }
  if (/(سیم|esim|اینترنت|internet|sim)/.test(m)) {
    return pick(
      'سیم‌کارت بین‌المللی eSIM فیروزو قبل از سفر فعال می‌شود و بدون تعویض سیم‌کارت به اینترنت قطع‌نشده می‌رسی؛ از بخش eSIM بسته مناسب مقصدت را بخر.',
      'The Firuzo eSIM activates before departure and keeps you connected abroad without swapping SIMs — pick a data package for your destination in the eSIM section.',
    );
  }
  if (/(امتیاز|باشگاه|سطح|loyalty|tier|coin|streak)/.test(m)) {
    return pick(
      'با ورود روزانه به داشبورد، سکه‌های باشگاه مشتریان می‌گیری و سطحت از برنزی تا پلاتینیوم بالا می‌رود؛ امتیاز و سطح فعلی‌ات در داشبورد حساب کاربری دیده می‌شود.',
      'Check in daily on your dashboard to collect loyalty coins and climb from Bronze to Platinum — your current tier and progress are shown on your account dashboard.',
    );
  }
  if (/(سلام|درود|hi|hello|hey|خوبی)/.test(m)) {
    return pick(
      'سلام! من فیروزو هستم، دستیار سفرت 🍃 برای پرواز، هتل، تور، ویزا یا هر سوال دیگری درباره سفر اینجام. چه کمکی می‌توانم بکنم؟',
      "Hi! I'm Firuzo, your travel companion 🍃 Ask me anything about flights, hotels, tours, visas or using the platform — how can I help?",
    );
  }
  if (/(پشتیبانی|تماس|شماره|support|contact|phone|انسان|اپراتور)/.test(m)) {
    return pick(
      'پشتیبانی ۲۴ ساعته فیروزو از طریق شماره ۰۲۱-۹۱۰۰۰۰۰۰، ایمیل support@firuzo.com و تلگرام firuzo_support در دسترس است؛ ویجت «تماس و پشتیبانی» پایین صفحه هم مستقیم به کارشناس وصلت می‌کند.',
      'Firuzo 24/7 support is reachable at +98 21 9100 0000, support@firuzo.com and Telegram @firuzo_support — the "Call & support" widget at the bottom corner connects you directly.',
    );
  }
  return pick(
    'من دستیار سفر فیروزو هستم و روی پرواز، هتل، تور، ویزا، بیمه، eSIM و کیف پول مسلط‌ام 🍃 دقیق‌تر بگو دنبال چه چیزی هستی تا قدم‌به‌قدم راهنمایی‌ات کنم؛ برای قیمت قطعی هم جستجوی سایت معتبرترین مرجع است.',
    "I'm Firuzo's travel assistant — flights, hotels, tours, visa, insurance, eSIM and wallet are my turf 🍃 Tell me a bit more about what you need and I'll walk you through it; the site search always shows the guaranteed final price.",
  );
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }
    const { message, conversationId, locale } = parsed.data;

    const session = await safeAuth().catch(() => null);
    const userId = session?.user?.id || null;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (rateLimited(`${ip}:${userId || 'guest'}`)) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', reply: 'کمی آرام‌تر 😊 چند لحظه صبر کن و دوباره بپرس.' },
        { status: 429 },
      );
    }

    // Resolve (or create) the conversation thread
    let convId = conversationId;
    if (convId) {
      const existing = await prisma.assistantConversation.findUnique({ where: { id: convId }, select: { id: true, userId: true } });
      if (!existing || (existing.userId && userId && existing.userId !== userId)) {
        convId = undefined;
      }
    }
    if (!convId) {
      const created = await prisma.assistantConversation.create({
        data: { userId, locale, title: message.slice(0, 60) },
        select: { id: true },
      });
      convId = created.id;
    }

    const historyRows = await prisma.assistantMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const history = historyRows
      .reverse()
      .map((m) => `${m.role === 'USER' ? 'User' : 'Firuzo'}: ${m.content}`)
      .join('\n');

    await prisma.assistantMessage.create({
      data: { conversationId: convId, role: 'USER', content: message },
    });

    let reply: string;
    let provider = 'heuristic_fallback';
    let isFallback = false;

    try {
      const router = new AiRouterService();
      const completion = await router.generateCompletion(
        {
          prompt: message,
          systemPrompt: buildSystemPrompt(locale, history),
          temperature: 0.6,
          maxTokens: 500,
        },
        { timeoutMs: 20000 },
      );
      reply = completion.content.trim() || heuristicReply(message, locale);
      provider = completion.provider;
    } catch {
      // No keys configured / all providers cooling down — product-truth local concierge
      reply = heuristicReply(message, locale);
      isFallback = true;
    }

    await prisma.assistantMessage.create({
      data: { conversationId: convId, role: 'ASSISTANT', content: reply, provider },
    });
    await prisma.assistantConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({ success: true, reply, conversationId: convId, provider, isFallback });
  } catch (err: unknown) {
    console.error('API /assistant/chat error:', err);
    return NextResponse.json({ success: false, error: 'Assistant is temporarily unavailable' }, { status: 500 });
  }
}
