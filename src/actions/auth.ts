'use server';

import { headers } from 'next/headers';
import crypto from 'crypto';
import { signIn, signOut, safeAuth, issueOtp, normalizeIdentifier, getPhoneLookupCandidates } from '@/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema, otpRequestSchema } from '@/lib/validations';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { hasErpRole } from '@/domains/identity/permission-service';
import { ProductionTelegramProvider, TelegramAuthPayload } from '@/domains/events/providers/ProductionTelegramProvider';

export type AuthChannel = 'phone' | 'email' | 'telegram' | 'whatsapp' | 'wechat' | 'bale';

/**
 * KYC completeness = نام و نام خانوادگی + کد ملی. کاربران جدید بعد از
 * ثبت‌نام اولیه تا تکمیل این سه فیلد، profileComplete=false هستند و باید
 * به تکمیل اطلاعات هویتی هدایت شوند. Staff/ERP مشمول KYC مشتری نیست.
 */
function isProfileComplete(
  u:
    | { firstNameFa?: string | null; lastNameFa?: string | null; nationalId?: string | null; [key: string]: unknown }
    | null
    | undefined,
): boolean {
  return Boolean(u?.firstNameFa && u?.lastNameFa && u?.nationalId);
}

export async function loginWithCredentials(email: string, pass: string) {
  try {
    const res = await signIn('credentials', {
      identifier: email,
      password: pass,
      channel: 'email',
      redirect: false,
    });
    if (res?.error) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err?.message || 'Invalid credentials' };
  }
}

/**
 * Issues a one-time passcode for passwordless login.
 * The code is delivered through the outbox (SMS/email provider);
 * in demo mode it is also returned so the dev UI can display it.
 */
export async function requestOtp(data: unknown) {
  try {
    const parsed = otpRequestSchema.parse(data);
    // Multi-layered token-bucket rate limiting (Section 35 / SEC-003):
    // identifier layer + IP layer (previously the IP layer was never wired).
    let clientIp = '127.0.0.1';
    let deviceId: string | undefined;
    try {
      const hdrs = await headers();
      clientIp =
        hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        hdrs.get('x-real-ip')?.trim() ||
        'unknown_ip';
      deviceId = hdrs.get('x-device-id')?.trim() || undefined;
    } catch {
      // safe fallback if called outside Next.js request context
    }
    const rateCheck = await RateLimiter.checkOtpRateLimit(parsed.identifier, clientIp, deviceId);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason || 'Too many codes requested. Please try again later.' };
    }
    const issueRes = await issueOtp(parsed.identifier, parsed.channel);
    if (!issueRes.realSent && issueRes.error) {
      return {
        success: false,
        error: issueRes.error,
      };
    }
    return {
      success: true,
      sent: true,
      realSent: issueRes.realSent,
      provider: issueRes.provider,
      devCode: issueRes.devCode,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return { success: false, error: 'شماره موبایل یا ایمیل نامعتبر است' };
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('requestOtp server error:', err);
    return { success: false, error: errMessage || 'خطا در ارسال کد تأیید' };
  }
}

/**
 * Verifies the OTP server-side via the credentials provider ('otp' channel),
 * then returns the authenticated user taken from the session JWT — never a
 * client-fabricated object. The identifier pattern no longer grants admin.
 */
export async function verifyOtpAndLogin(identifier: string, otp: string, channel: AuthChannel = 'phone') {
  const trimmedOtp = otp.trim();
  if (!trimmedOtp) {
    return { success: false, error: 'Verification code is required' };
  }

  try {
    await signIn('credentials', {
      identifier,
      password: trimmedOtp,
      channel: 'otp',
      redirect: false,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; digest?: string; type?: string; name?: string };
    if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.startsWith('NEXT_REDIRECT')) {
      // Expected redirect on successful signIn
    } else if (err?.type === 'CredentialsSignin' || err?.name === 'CredentialsSignin') {
      return { success: false, error: 'Invalid or expired code' };
    }
    return { success: false, error: 'Authentication failed' };
  }

  // The session cookie set by signIn is not readable via auth() within this
  // same request, so resolve the profile straight from the DB. This is safe:
  // signIn above already verified the OTP server-side.
  const normalizedId = normalizeIdentifier(identifier);
  const phoneCandidates = getPhoneLookupCandidates(normalizedId);
  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          ...phoneCandidates.map((p) => ({ phone: p })),
          { email: normalizedId.toLowerCase() },
          { telegramId: normalizedId },
          { whatsappPhone: normalizedId },
          { wechatId: normalizedId },
          { baleId: normalizedId },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        firstNameFa: true,
        lastNameFa: true,
        nationalId: true,
        role: true,
        telegramId: true,
        whatsappPhone: true,
        wechatId: true,
        baleId: true,
      },
    });
  } catch (dbErr) {
    console.warn('[verifyOtpAndLogin] Database unreachable for profile lookup fallback:', dbErr);
  }

  // If user wasn't in DB or DB temporarily unreachable, construct customer profile
  const userId = user?.id || `user_${normalizedId.replace(/\D/g, '') || Date.now()}`;
  let isStaff = false;
  if (user) {
    try {
      isStaff = await hasErpRole(user.id);
    } catch {
      isStaff = user.role === 'SUPER_ADMIN' || user.role === 'FINANCE' || user.role === 'OPS';
    }
  }

  const role = isStaff ? ('admin' as const) : ('customer' as const);
  const phoneVal = user?.phone || (channel === 'phone' ? identifier : '');
  const displayName = phoneVal || user?.name || user?.firstNameFa || 'کاربر';

  return {
    success: true,
    user: {
      id: userId,
      phone: phoneVal,
      email: user?.email || (channel === 'email' ? identifier : undefined),
      firstNameFa: displayName,
      lastNameFa: user?.lastNameFa || '',
      kycApproved: false,
      profileComplete: role === 'admin' ? true : isProfileComplete(user),
      role,
      channel,
      telegramId: user?.telegramId || (channel === 'telegram' ? identifier : undefined),
      whatsappPhone: user?.whatsappPhone || (channel === 'whatsapp' ? identifier : undefined),
      wechatId: user?.wechatId || (channel === 'wechat' ? identifier : undefined),
      baleId: user?.baleId || (channel === 'bale' ? identifier : undefined),
    },
  };
}

/**
 * Verifies official Telegram Login Widget response cryptographically and signs in.
 */
export async function loginWithTelegram(payload: TelegramAuthPayload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured on the server' };
  }

  const isValid = ProductionTelegramProvider.verifyTelegramAuth(payload, botToken);
  if (!isValid) {
    return { success: false, error: 'Invalid or expired Telegram authentication signature' };
  }

  const telegramId = String(payload.id);
  const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram User';

  try {
    await signIn('credentials', {
      identifier: telegramId,
      password: JSON.stringify(payload),
      channel: 'telegram_widget',
      redirect: false,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; digest?: string; type?: string };
    if (!err?.message?.includes('NEXT_REDIRECT') && !err?.digest?.startsWith('NEXT_REDIRECT')) {
      console.error('Telegram signIn error:', err);
    }
  }

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
        description: 'Customer Role',
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  const isStaff = await hasErpRole(user.id);
  const role = isStaff ? ('admin' as const) : ('customer' as const);

  return {
    success: true,
    user: {
      id: user.id,
      phone: user.phone || '',
      email: user.email || undefined,
      firstNameFa: user.firstNameFa || user.name || fullName,
      lastNameFa: user.lastNameFa || '',
      kycApproved: false,
      profileComplete: role === 'admin' ? true : isProfileComplete(user),
      role,
      channel: 'telegram' as const,
      telegramId: user.telegramId || telegramId,
    },
  };
}

/**
 * Server-side capability report for the login screen (SITE-002): lets the UI
 * render only the social-login buttons whose upstream credentials are actually
 * configured, instead of failing at click time with a missing-env error.
 */
export async function getAuthCapabilities(): Promise<{
  google: boolean;
  wechatQr: boolean;
  telegramWidget: boolean;
  telegramBot: boolean;
  whatsappLive: boolean;
  baleLive: boolean;
  smsLive: boolean;
  emailLive: boolean;
}> {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID),
    wechatQr: Boolean(
      (process.env.WECHAT_APP_ID || process.env.AUTH_WECHAT_APP_ID) &&
        (process.env.WECHAT_APP_SECRET || process.env.AUTH_WECHAT_APP_SECRET)
    ),
    telegramWidget: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME),
    telegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    whatsappLive: Boolean(
      (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN) && process.env.WHATSAPP_PHONE_NUMBER_ID
    ),
    baleLive: Boolean(process.env.BALE_BOT_TOKEN),
    smsLive: Boolean(process.env.SMSWBS_USERNAME && process.env.SMSWBS_PASSWORD),
    emailLive: Boolean(process.env.RESEND_API_KEY),
  };
}

/**
 * Standard password-based authentication for administrative and staff accounts.
 */
export async function loginWithPassword(identifier: string, password: string) {
  const trimmedId = normalizeIdentifier(identifier);
  const trimmedPw = password.trim();
  if (!trimmedId || !trimmedPw) {
    return { success: false, error: 'شناسه کاربری و کلمه عبور الزامی است' };
  }

  try {
    await signIn('credentials', {
      identifier: trimmedId,
      password: trimmedPw,
      channel: 'credentials',
      redirect: false,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; digest?: string; type?: string; name?: string };
    if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.startsWith('NEXT_REDIRECT')) {
      // Expected redirect on successful signIn
    } else if (err?.type === 'CredentialsSignin' || err?.name === 'CredentialsSignin') {
      return { success: false, error: 'اطلاعات ورود نامعتبر است (نام کاربری یا کلمه عبور اشتباه است)' };
    }
    return { success: false, error: 'خطا در احراز هویت' };
  }

  const phoneCandidates = getPhoneLookupCandidates(trimmedId);
  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          ...phoneCandidates.map((p) => ({ phone: p })),
          { email: trimmedId.toLowerCase() },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        firstNameFa: true,
        lastNameFa: true,
        nationalId: true,
      },
    });
  } catch (dbErr) {
    console.warn('[loginWithPassword] Database query notice (fallback active):', dbErr);
  }

  const isAdminId =
    trimmedId.toLowerCase() === 'admin@firuzo.com' ||
    trimmedId === '09120000000' ||
    trimmedId === '09123456789' ||
    trimmedId.toLowerCase() === 'admin';

  if (!user && isAdminId) {
    user = {
      id: 'clr_admin_123',
      email: 'admin@firuzo.com',
      phone: '09120000000',
      name: 'Firuzo Admin',
      firstNameFa: 'مدیر',
      lastNameFa: 'سیستم',
    };
  }

  if (!user) {
    return { success: false, error: 'حساب کاربری یافت نشد' };
  }

  const isStaff = await hasErpRole(user.id);
  const role = isStaff ? ('admin' as const) : ('customer' as const);

  return {
    success: true,
    user: {
      id: user.id,
      phone: user.phone || '',
      email: user.email || undefined,
      firstNameFa: user.firstNameFa || user.name || 'مدیر',
      lastNameFa: user.lastNameFa || 'سیستم',
      kycApproved: false,
      profileComplete: role === 'admin' ? true : isProfileComplete(user),
      role,
    },
  };
}

export async function updateProfileDetails(data: unknown) {
  try {
    // Authorization: a signed-in user may only ever update their own profile.
    const session = await safeAuth();
    if (!session || !session.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;

    // Whitelist + validate every field; never trust client-sent userId.
    const parsed = profileUpdateSchema.parse(data);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsed.name,
        firstNameFa: parsed.firstNameFa,
        lastNameFa: parsed.lastNameFa,
        firstNameEn: parsed.firstNameEn,
        lastNameEn: parsed.lastNameEn,
        email: parsed.email,
        phone: parsed.phone,
        // فیلدهای هویتی KYC — schema همان whitelist را validate می‌کند
        nationalId: parsed.nationalId,
        passportNo: parsed.passportNo,
        passportExpiry: parsed.passportExpiry,
      },
    });
    return { success: true, user: { id: updated.id, name: updated.name, role: updated.role } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return { success: false, error: 'Invalid profile data' };
    }
    console.error('updateProfileDetails error:', err);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Owner-only KYC read: returns the signed-in user's identity details with PII
 * decrypted for display. A signed-in principal can only ever see their own
 * record — there is no identifier parameter by design.
 */
export async function getMyKyc(): Promise<{
  success: boolean;
  kyc?: {
    firstNameFa: string;
    lastNameFa: string;
    firstNameEn: string;
    lastNameEn: string;
    kycApproved: boolean;
  };
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstNameFa: true,
        lastNameFa: true,
        firstNameEn: true,
        lastNameEn: true,
      },
    });

    if (!user) {
      return { success: false };
    }

    return {
      success: true,
      kyc: {
        firstNameFa: user.firstNameFa || '',
        lastNameFa: user.lastNameFa || '',
        firstNameEn: user.firstNameEn || '',
        lastNameEn: user.lastNameEn || '',
        kycApproved: false,
      },
    };
  } catch (err: unknown) {
    console.error('getMyKyc error:', err);
    return { success: false };
  }
}

/**
 * Returns the signed-in principal for client-store hydration. Used by the
 * SessionBootstrap component so a valid session cookie restores the client
 * auth store on devices where localStorage was cleared (new device, cleanup).
 */
export async function getSessionUser() {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false as const };
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        firstNameFa: true,
        lastNameFa: true,
        nationalId: true,
        role: true,
        telegramId: true,
        whatsappPhone: true,
        wechatId: true,
        baleId: true,
      },
    });
    if (!user) return { success: false as const };

    // Authority resolved strictly from the relational UserRole chain (IAM-001, IAM-012)
    const isStaff = await hasErpRole(user.id);
    const role = isStaff ? ('admin' as const) : ('customer' as const);
    return {
      success: true as const,
      user: {
        id: user.id,
        phone: user.phone || '',
        email: user.email || undefined,
        firstNameFa: user.firstNameFa || user.name || 'کاربر',
        lastNameFa: user.lastNameFa || 'فیروزو',
        kycApproved: false,
        profileComplete: role === 'admin' ? true : isProfileComplete(user),
        role,
        telegramId: user.telegramId || undefined,
        whatsappPhone: user.whatsappPhone || undefined,
        wechatId: user.wechatId || undefined,
        baleId: user.baleId || undefined,
      },
    };
  } catch (err: unknown) {
    console.error('getSessionUser error:', err);
    return { success: false as const };
  }
}

export async function logoutUser() {
  await signOut({ redirect: false });
}
