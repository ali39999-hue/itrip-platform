import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';

/**
 * Web Push subscription management.
 * GET  → VAPID public key + feature flag (client bootstraps from this).
 * POST → upsert a push subscription (attached to the session user when signed in).
 * DELETE → remove a subscription by endpoint (unsubscribe / permission revoked).
 */

const SubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(500),
    keys: z.object({
      p256dh: z.string().min(40).max(200),
      auth: z.string().min(16).max(200),
    }),
  }),
  locale: z.enum(['fa', 'en', 'ar', 'zh', 'ru']).optional(),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().url().max(500),
});

export async function GET() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ success: true, enabled: Boolean(publicKey), publicKey });
}

export async function POST(req: NextRequest) {
  try {
    const parsed = SubscribeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid subscription payload' }, { status: 400 });
    }
    const { subscription, locale } = parsed.data;
    if (!PushConfigured()) {
      return NextResponse.json({ success: false, error: 'Push not configured' }, { status: 503 });
    }

    const session = await safeAuth().catch(() => null);
    const userId = session?.user?.id || null;

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        locale: locale || 'fa',
        isActive: true,
        userAgent: req.headers.get('user-agent')?.slice(0, 200) || null,
        updatedAt: new Date(),
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        locale: locale || 'fa',
        userAgent: req.headers.get('user-agent')?.slice(0, 200) || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('API /push/subscribe POST error:', err);
    return NextResponse.json({ success: false, error: 'Subscribe failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const parsed = UnsubscribeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid endpoint' }, { status: 400 });
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('API /push/subscribe DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Unsubscribe failed' }, { status: 500 });
  }
}

function PushConfigured(): boolean {
  return Boolean(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY);
}
