'use server';

import { requirePermission } from '@/domains/identity/permission-service';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';
import { prisma } from '@/lib/prisma';

/**
 * ERP operator actions for the Firuzo Business (specialist Child) vertical.
 * T1001/T1003 — every action is permission-guarded server-side and stamps the
 * acting principal as actorId on the status audit trail (T1013).
 */

export async function getBusinessRequests() {
  try {
    await requirePermission('business:request:review');
    const requests = await prisma.businessRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        company: { select: { name: true, repName: true, nationalId: true } },
        departure: {
          include: { package: { select: { title: true, destination: true } } },
        },
      },
    });
    return { success: true, requests };
  } catch (err: unknown) {
    console.error('getBusinessRequests server error:', err);
    return { success: false, error: 'Failed to fetch business requests' };
  }
}

export async function getBusinessRequestDetail(requestId: string) {
  try {
    await requirePermission('business:request:review');
    const detail = await BusinessDomainService.getRequestDetail(requestId);
    return { success: true, detail };
  } catch (err: unknown) {
    console.error('getBusinessRequestDetail server error:', err);
    return { success: false, error: 'Failed to fetch request detail' };
  }
}

export async function reviewBusinessRequest(params: {
  requestId: string;
  decision: 'approve' | 'request_changes';
  note?: string;
}) {
  try {
    const user = await requirePermission('business:request:review');
    const detail = await BusinessDomainService.reviewRequest({
      requestId: params.requestId,
      decision: params.decision,
      note: params.note,
      actorId: user.id,
    });
    return { success: true, detail };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Review failed';
    console.error('reviewBusinessRequest server error:', err);
    return { success: false, error: message };
  }
}

export async function grantBusinessRequest(params: { requestId: string; grantAmountRial: number }) {
  try {
    const user = await requirePermission('business:request:grant');
    const detail = await BusinessDomainService.applyGrant(
      params.requestId,
      params.grantAmountRial,
      user.id
    );
    return { success: true, detail };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Grant failed';
    console.error('grantBusinessRequest server error:', err);
    return { success: false, error: message };
  }
}
