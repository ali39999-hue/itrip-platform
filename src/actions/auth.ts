'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function loginWithCredentials(email: string, pass: string) {
  try {
    await signIn('credentials', {
      email,
      password: pass,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid credentials' };
    }
    throw error;
  }
}

export async function verifyOtpAndLogin(phone: string, otp: string) {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (!isDemo) {
    return { success: false, error: 'Production OTP gateway not configured yet' };
  }

  // Server-side demo validation
  const isValidOtp = otp === '12345' || otp === '1234' || otp.length === 4 || otp.length === 5;
  if (!isValidOtp) {
    return { success: false, error: 'Invalid OTP code' };
  }

  const isAdmin = phone.endsWith('0000');
  const email = isAdmin ? 'admin@firuzo.com' : 'user@firuzo.com';

  const loginRes = await loginWithCredentials(email, 'demo');
  if (!loginRes.success) {
    return { success: false, error: loginRes.error || 'Authentication failed' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, phone: true },
  });

  return {
    success: true,
    user: {
      id: user?.id || (isAdmin ? 'clr_admin_123' : 'clr_mock_user_123'),
      phone,
      firstNameFa: isAdmin ? 'ادمین' : 'کاربر',
      lastNameFa: 'فیروز',
      kycApproved: true,
      role: isAdmin ? ('admin' as const) : ('customer' as const),
    },
  };
}

export async function logoutUser() {
  await signOut({ redirect: false });
}