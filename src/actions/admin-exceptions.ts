'use server';

import { requirePermission } from '@/domains/identity/permission-service';
import {
  ExceptionRemediationService,
  RemediationResult,
} from '@/domains/erp/ExceptionRemediationService';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function retryTicketingRemediationAction(
  exceptionId: string
): Promise<RemediationResult> {
  try {
    const operator = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const res = await ExceptionRemediationService.retryTicketing(exceptionId, operator.id);
    revalidatePath('/admin/exceptions');
    revalidatePath('/admin/travel-files');
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در صدور مجدد بلیت';
    return { success: false, message: msg, exceptionStatus: 'OPEN' };
  }
}

export async function immediateRefundRemediationAction(
  exceptionId: string,
  reason?: string
): Promise<RemediationResult> {
  try {
    // Money-moving remediation requires the dedicated refund-approval
    // permission (same taxonomy as refundBookingAdmin), not generic ops access.
    const operator = await requirePermission(['booking:refund:approve']);
    const res = await ExceptionRemediationService.immediateWalletRefund(
      exceptionId,
      operator.id,
      reason
    );
    revalidatePath('/admin/exceptions');
    revalidatePath('/admin/travel-files');
    revalidatePath('/admin/finance');
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در استرداد آنی وجه';
    return { success: false, message: msg, exceptionStatus: 'OPEN' };
  }
}

export async function syncPaymentStatusRemediationAction(
  exceptionId: string
): Promise<RemediationResult> {
  try {
    const operator = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const res = await ExceptionRemediationService.syncPaymentStatus(exceptionId, operator.id);
    revalidatePath('/admin/exceptions');
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در تطبیق پرداخت';
    return { success: false, message: msg, exceptionStatus: 'OPEN' };
  }
}

export async function pollSupplierPnrRemediationAction(
  exceptionId: string
): Promise<RemediationResult> {
  try {
    const operator = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const res = await ExceptionRemediationService.pollSupplierPnr(exceptionId, operator.id);
    revalidatePath('/admin/exceptions');
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در استعلام PNR از تامین‌کننده';
    return { success: false, message: msg, exceptionStatus: 'OPEN' };
  }
}

export async function getStaffOperatorsAction(): Promise<{
  success: boolean;
  operators: Array<{ id: string; name: string | null; role: string }>;
  error?: string;
}> {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['OPS', 'FINANCE', 'SUPER_ADMIN'] } },
          {
            userRoles: {
              some: {
                role: {
                  name: { in: ['OPS', 'FINANCE', 'SUPER_ADMIN'] },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        firstNameFa: true,
        lastNameFa: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      operators: users.map((u) => ({
        id: u.id,
        name:
          u.name ||
          (u.firstNameFa ? `${u.firstNameFa} ${u.lastNameFa || ''}`.trim() : null) ||
          u.id.slice(0, 8),
        role: u.role,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در دریافت لیست اپراتورها';
    return { success: false, operators: [], error: msg };
  }
}
