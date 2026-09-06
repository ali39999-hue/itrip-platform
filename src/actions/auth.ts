'use server';

import { headers } from 'next/headers';
import { signIn, signOut, safeAuth, issueOtp } from '@/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema, otpRequestSchema } from '@/lib/validations';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { encryptSensitive, decryptSensitive } from '@/lib/security/crypto-vault';

export type AuthChannel = 'phone' | 'email' | 'telegram' | 'whatsapp' | 'wechat';

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
    const hdrs = await headers();
    const clientIp =
      hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      hdrs.get('x-real-ip')?.trim() ||
      'unknown_ip';
    const rateCheck = await RateLimiter.checkOtpRateLimit(parsed.identifier, clientIp);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason || 'Too many codes requested. Please try again later.' };
    }
    await issueOtp(parsed.identifier, parsed.channel);
    return { success: true, sent: true };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return { success: false, error: 'Invalid phone number or email' };
    }
    console.error('requestOtp server error:', err);
    return { success: false, error: 'Failed to send verification code' };
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
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: identifier },
        { email: identifier.toLowerCase() },
        { telegramId: identifier },
        { whatsappPhone: identifier },
        { wechatId: identifier },
      ],
    },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      firstNameFa: true,
      lastNameFa: true,
      role: true,
      telegramId: true,
      whatsappPhone: true,
      wechatId: true,
      nationalId: true,
      passportNo: true,
    },
  });

  if (!user) {
    return { success: false, error: 'Account not found' };
  }

  const role = ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(user.role)
    ? ('admin' as const)
    : ('customer' as const);
  return {
    success: true,
    user: {
      id: user.id,
      phone: user.phone || (channel === 'phone' ? identifier : ''),
      email: user.email || (channel === 'email' ? identifier : undefined),
      firstNameFa: user.firstNameFa || user.name || 'کاربر',
      lastNameFa: user.lastNameFa || 'فیروزه',
      kycApproved: Boolean(user.nationalId),
      role,
      channel,
      telegramId: user.telegramId || (channel === 'telegram' ? identifier : undefined),
      whatsappPhone: user.whatsappPhone || (channel === 'whatsapp' ? identifier : undefined),
      wechatId: user.wechatId || (channel === 'wechat' ? identifier : undefined),
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
        // PII is AES-256-GCM encrypted at rest (Section 34); legacy plaintext
        // rows decrypt transparently on read via decryptSensitive.
        nationalId: parsed.nationalId ? encryptSensitive(parsed.nationalId) : parsed.nationalId,
        passportNo: parsed.passportNo ? encryptSensitive(parsed.passportNo) : parsed.passportNo,
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
    nationalId: string;
    passportNo: string;
    passportExpiry: string;
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
        nationalId: true,
        passportNo: true,
        passportExpiry: true,
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
        nationalId: user.nationalId ? decryptSensitive(user.nationalId) : '',
        passportNo: user.passportNo ? decryptSensitive(user.passportNo) : '',
        passportExpiry: user.passportExpiry || '',
        kycApproved: Boolean(user.nationalId),
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
        role: true,
        telegramId: true,
        whatsappPhone: true,
        wechatId: true,
        nationalId: true,
      },
    });
    if (!user) return { success: false as const };

    const role = ['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(user.role)
      ? ('admin' as const)
      : ('customer' as const);
    return {
      success: true as const,
      user: {
        id: user.id,
        phone: user.phone || '',
        email: user.email || undefined,
        firstNameFa: user.firstNameFa || user.name || 'کاربر',
        lastNameFa: user.lastNameFa || 'فیروزه',
        kycApproved: Boolean(user.nationalId),
        role,
        telegramId: user.telegramId || undefined,
        whatsappPhone: user.whatsappPhone || undefined,
        wechatId: user.wechatId || undefined,
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
