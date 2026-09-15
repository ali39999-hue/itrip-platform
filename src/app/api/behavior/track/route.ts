import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { createLogger } from '@/lib/observability/logger';
import { sanitizeBatch } from '@/lib/behavior';

export const dynamic = 'force-dynamic';

const log = createLogger('behavior-track-api');

const EventSchema = z.object({
  type: z.enum(['PAGE_VIEW', 'CLICK', 'SCROLL_DEPTH', 'FUNNEL']),
  route: z.string().min(1).max(400),
  locale: z.string().max(8).optional(),
  xPct: z.number().min(0).max(100).optional(),
  yPct: z.number().min(0).max(100).optional(),
  scrollPct: z.number().int().min(0).max(100).optional(),
  selector: z.string().max(200).optional(),
  viewportW: z.number().int().positive().max(7680).optional(),
  viewportH: z.number().int().positive().max(4320).optional(),
  device: z.string().max(16).optional(),
  event: z.string().max(60).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  ts: z.number().optional(),
});

const BodySchema = z.object({
  anonymousId: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(80),
  events: z.array(EventSchema).min(1).max(50),
});

// Tiny in-memory rate limiter: 120 events / IP / minute.
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string, n: number): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: n, resetAt: now + 60_000 });
    return false;
  }
  b.count += n;
  if (b.count > 120) return true;
  if (buckets.size > 5000) buckets.clear();
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'invalid_batch' }, { status: 400 });
    }
    if (rateLimited(ip, parsed.data.events.length)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const clean = sanitizeBatch(parsed.data.events);
    if (clean.length === 0) {
      return NextResponse.json({ ok: true, stored: 0 });
    }

    // Attach authenticated user when available; anonymous otherwise.
    let userId: string | null = null;
    try {
      const session = await safeAuth();
      userId = session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    const anonymousId = parsed.data.anonymousId.slice(0, 80).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 80) || 'anon';
    const sessionId = parsed.data.sessionId.slice(0, 80).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 80) || 'sess';

    await prisma.behaviorEvent.createMany({
      data: clean.map((e) => ({
        userId,
        anonymousId,
        sessionId,
        type: e.type,
        route: e.route,
        locale: e.locale,
        xPct: e.xPct,
        yPct: e.yPct,
        scrollPct: e.scrollPct,
        selector: e.selector,
        viewportW: e.viewportW,
        viewportH: e.viewportH,
        device: e.device,
        props: e.propsJson,
      })),
    });

    return NextResponse.json({ ok: true, stored: clean.length });
  } catch (err) {
    log.error('behavior ingest failed', { error: err instanceof Error ? err.message : String(err) });
    // Never 500 the booking funnel for analytics — acknowledge and drop.
    return NextResponse.json({ ok: true, stored: 0 });
  }
}
