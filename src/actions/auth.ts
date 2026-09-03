'use server';

import { signIn, signOut, safeAuth, issueOtp } from '@/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema, otpRequestSchema } from '@/lib/validations';

export type AuthChannel = 'phone' | 'email' | 'telegram' | 'whatsapp' | 'wechat';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

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
    // Cheap flood control: at most 3 outstanding codes per identifier.
    const recent = await prisma.otpVerification.count({
      where: {
        identifier: parsed.identifier,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recent >= 3) {
      return { success: false, error: 'Too many codes requested. Please try again later.' };
    }
    const result = await issueOtp(parsed.identifier, parsed.channel);
    return { success: true, sent: true, devCode: result.devCode };
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
      return { success: false, error: DEMO_MODE ? 'Invalid code (demo: any 4-5 digit code works)' : 'Invalid or expired code' };
    }
    return { success: false, error: err?.message || 'Authentication failed' };
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

export async function logoutUser() {
  await signOut({ redirect: false });
}
