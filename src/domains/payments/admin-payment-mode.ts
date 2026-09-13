import { prisma } from '@/lib/prisma';
import { hasErpRole } from '@/domains/identity/permission-service';

export type PaymentGatewayMode = 'real' | 'demo';

export const ADMIN_PAYMENT_MODE_KEY = 'admin:payment_gateway_mode';
export const ADMIN_PAYMENT_MODE_COOKIE = 'firuzo_admin_payment_mode';

export interface PaymentModeRecord {
  mode: PaymentGatewayMode;
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Returns whether a user id represents an authenticated admin or ERP staff member.
 */
export async function isUserAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  return hasErpRole(userId);
}

/**
 * Fetches the global system payment mode from the database.
 * Falls back to environment variable configuration if not explicitly set.
 */
export async function getSystemPaymentMode(): Promise<PaymentGatewayMode> {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: ADMIN_PAYMENT_MODE_KEY },
      select: { payload: true },
    });
    if (row?.payload) {
      const parsed = JSON.parse(row.payload) as Partial<PaymentModeRecord>;
      if (parsed.mode === 'real' || parsed.mode === 'demo') {
        return parsed.mode;
      }
    }
  } catch (err) {
    console.warn('[admin-payment-mode] Failed to read system payment mode from DB:', err);
  }

  // Environment override if explicitly set
  if (process.env.ECARDO_DEMO_GATEWAY === 'true' || process.env.DEMO_MODE === 'true') {
    return 'demo';
  }
  // The real eCardo gateway path is live and verified — demo is opt-in only
  // (via ECARDO_DEMO_GATEWAY / DEMO_MODE / the admin toggle), never a silent default.
  return 'real';
}

/**
 * Resolves the effective payment mode for the current request.
 * - If caller is an admin and has an active cookie override ('real' or 'demo'), that override is used.
 * - Otherwise, the global system payment mode is used.
 */
export async function resolveEffectivePaymentMode(opts?: {
  userId?: string;
  cookieOverride?: string | null;
}): Promise<PaymentGatewayMode> {
  const { userId, cookieOverride } = opts || {};

  if (userId) {
    const isAdmin = await isUserAdmin(userId);
    if (isAdmin && (cookieOverride === 'real' || cookieOverride === 'demo')) {
      return cookieOverride;
    }
  }

  return getSystemPaymentMode();
}

/**
 * Sets the global system payment mode in SiteContent (Admin only).
 */
export async function setSystemPaymentMode(
  mode: PaymentGatewayMode,
  updatedBy?: string
): Promise<PaymentModeRecord> {
  const record: PaymentModeRecord = {
    mode,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await prisma.siteContent.upsert({
    where: { key: ADMIN_PAYMENT_MODE_KEY },
    update: {
      payload: JSON.stringify(record),
      updatedBy,
    },
    create: {
      key: ADMIN_PAYMENT_MODE_KEY,
      payload: JSON.stringify(record),
      updatedBy,
    },
  });

  return record;
}
