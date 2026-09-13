'use server';

import { cookies } from 'next/headers';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  PaymentGatewayMode,
  ADMIN_PAYMENT_MODE_COOKIE,
  isUserAdmin,
  resolveEffectivePaymentMode,
  setSystemPaymentMode,
} from '@/domains/payments/admin-payment-mode';

export interface AdminPaymentModeStatus {
  isAdmin: boolean;
  mode: PaymentGatewayMode;
}

/**
 * Reads the current payment mode and verifies if the caller has admin rights.
 * Safe to call from any client component.
 */
export async function getAdminPaymentModeAction(): Promise<AdminPaymentModeStatus> {
  const session = await safeAuth();
  const userId = session?.user?.id;
  const isAdmin = await isUserAdmin(userId);

  if (!isAdmin) {
    // Normal users always see the resolved mode without admin capability
    const mode = await resolveEffectivePaymentMode();
    return { isAdmin: false, mode };
  }

  const cookieStore = await cookies();
  const cookieOverride = cookieStore.get(ADMIN_PAYMENT_MODE_COOKIE)?.value;
  const mode = await resolveEffectivePaymentMode({ userId, cookieOverride });

  return { isAdmin: true, mode };
}

/**
 * Updates the payment mode. Strictly restricted to authenticated admins/ERP staff.
 */
export async function setAdminPaymentModeAction(
  mode: PaymentGatewayMode,
  options?: { systemWide?: boolean }
): Promise<{ success: boolean; mode?: PaymentGatewayMode; error?: string }> {
  const session = await safeAuth();
  const userId = session?.user?.id;
  const isAdmin = await isUserAdmin(userId);

  if (!session || !userId || !isAdmin) {
    return { success: false, error: 'Unauthorized: Only admin users can change payment mode' };
  }

  if (mode !== 'real' && mode !== 'demo') {
    return { success: false, error: 'Invalid payment mode' };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_PAYMENT_MODE_COOKIE, mode, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    if (options?.systemWide !== false) {
      await setSystemPaymentMode(mode, userId);
    }

    revalidatePath('/admin');
    return { success: true, mode };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update payment mode';
    return { success: false, error: message };
  }
}
