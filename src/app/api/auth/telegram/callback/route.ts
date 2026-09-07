import { NextRequest, NextResponse } from 'next/server';
import { ProductionTelegramProvider, TelegramAuthPayload } from '@/domains/events/providers/ProductionTelegramProvider';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const payload: TelegramAuthPayload = {
    id: params.id,
    first_name: params.first_name,
    last_name: params.last_name,
    username: params.username,
    photo_url: params.photo_url,
    auth_date: params.auth_date,
    hash: params.hash,
  };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  const isValid = ProductionTelegramProvider.verifyTelegramAuth(payload, botToken);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid Telegram signature or expired authentication data' },
      { status: 401 }
    );
  }

  const telegramId = String(payload.id);
  const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram User';

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ telegramId }, { email: `${telegramId}@telegram.firuzo.com` }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        telegramId,
        name: fullName,
        avatar: payload.photo_url,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    const role = await prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: {
        name: 'CUSTOMER',
        permissions: '[]',
        description: 'Customer Role',
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  // Redirect back to account or callback
  const callbackUrl = params.callbackUrl || '/account';
  const redirectUrl = new URL(callbackUrl, req.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramAuthPayload;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const isValid = ProductionTelegramProvider.verifyTelegramAuth(body, botToken);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid Telegram signature or expired token' },
        { status: 401 }
      );
    }

    const telegramId = String(body.id);
    const fullName = [body.first_name, body.last_name].filter(Boolean).join(' ') || body.username || 'Telegram User';

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ telegramId }, { email: `${telegramId}@telegram.firuzo.com` }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          telegramId,
          name: fullName,
          avatar: body.photo_url,
          role: 'CUSTOMER',
          isActive: true,
        },
      });

      const role = await prisma.role.upsert({
        where: { name: 'CUSTOMER' },
        update: {},
        create: {
          name: 'CUSTOMER',
          permissions: '[]',
          description: 'Customer Role',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
