import { Prisma } from '@prisma/client';

export type ApprovalRequestType =
  | 'REFUND'
  | 'WALLET_ADJUSTMENT'
  | 'SUPPLIER_SETTLEMENT'
  | 'CREDIT_LIMIT_OVERRIDE'
  | 'PRICE_MANUAL_OVERRIDE';

export type ApprovalTierLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ApprovalChainStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Thresholds in Iranian Rials (IRR) for Maker-Checker approval tiers.
 * Adapted from aroux30/site approvals module.
 * - LOW: <= 50,000,000 IRR (~5 Million Tomans)
 * - MEDIUM: 50,000,001 - 200,000,000 IRR (~5 to 20 Million Tomans)
 * - HIGH: > 200,000,000 IRR (> 20 Million Tomans)
 */
export const APPROVAL_THRESHOLDS_IRR = {
  MEDIUM_TIER_MIN: 50_000_000,
  HIGH_TIER_MIN: 200_000_000,
};

export class MakerCheckerSelfApprovalError extends Error {
  constructor(message: string = 'سازنده درخواست (Maker) و تاییدکننده (Checker) نمی‌توانند یک کاربر باشند.') {
    super(message);
    this.name = 'MakerCheckerSelfApprovalError';
  }
}

export class InsufficientApprovalAuthorityError extends Error {
  constructor(message: string = 'نقش کاربری شما صلاحیت تایید این سطح از تراکنش مالی را ندارد.') {
    super(message);
    this.name = 'InsufficientApprovalAuthorityError';
  }
}

export interface ApprovalRequestItem {
  id: string;
  type: ApprovalRequestType;
  entityType: string;
  entityId: string;
  requesterUserId: string;
  amount: Prisma.Decimal | number | string;
  currency: string;
  tier: ApprovalTierLevel;
  status: ApprovalChainStatus;
  reason: string;
  details?: Record<string, unknown>;
  approvals: Array<{
    approverUserId: string;
    approverRole: string;
    action: 'APPROVE' | 'REJECT';
    notes?: string;
    decidedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class ApprovalChainDomainService {
  /**
   * Evaluates the required approval tier based on transaction amount.
   */
  static evaluateApprovalTier(
    amount: Prisma.Decimal | number | string,
    currency = 'IRR'
  ): { tier: ApprovalTierLevel; requiredRole: 'OPERATOR' | 'BRANCH_MANAGER' | 'FINANCIAL_DIRECTOR' } {
    let amountInIrr = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);

    // If currency is Toman or USD, convert conservatively
    if (currency.toUpperCase() === 'TOMAN' || currency.toUpperCase() === 'IRT') {
      amountInIrr *= 10;
    }

    if (amountInIrr > APPROVAL_THRESHOLDS_IRR.HIGH_TIER_MIN) {
      return { tier: 'HIGH', requiredRole: 'FINANCIAL_DIRECTOR' };
    }
    if (amountInIrr > APPROVAL_THRESHOLDS_IRR.MEDIUM_TIER_MIN) {
      return { tier: 'MEDIUM', requiredRole: 'BRANCH_MANAGER' };
    }
    return { tier: 'LOW', requiredRole: 'OPERATOR' };
  }

  /**
   * Enforces Separation of Duties (Maker-Checker invariant).
   * Throws MakerCheckerSelfApprovalError if requester attempts to self-approve.
   */
  static assertSeparationOfDuties(requesterUserId: string, approverUserId: string): void {
    if (!requesterUserId || !approverUserId) {
      throw new Error('شناسه کاربر درخواست‌دهنده و تاییدکننده الزامی است.');
    }
    if (requesterUserId === approverUserId) {
      throw new MakerCheckerSelfApprovalError();
    }
  }

  /**
   * Validates whether an approver has the authoritative role to approve the designated tier.
   */
  static validateApproverRole(
    tier: ApprovalTierLevel,
    approverRole: string
  ): boolean {
    const role = approverRole.toUpperCase();
    const isSuperAdmin = role.includes('SUPER_ADMIN') || role.includes('ADMIN');

    if (isSuperAdmin) return true;

    if (tier === 'HIGH') {
      return role.includes('FINANCE_DIRECTOR') || role.includes('CFO') || role.includes('HEAD_FINANCE');
    }
    if (tier === 'MEDIUM') {
      return (
        role.includes('BRANCH_MANAGER') ||
        role.includes('FINANCE_DIRECTOR') ||
        role.includes('CFO') ||
        role.includes('MANAGER') ||
        role.includes('SUPERVISOR')
      );
    }
    // LOW tier can be handled by any operations staff, supervisors, and managers
    return (
      role.includes('OPERATOR') ||
      role.includes('AGENT') ||
      role.includes('STAFF') ||
      role.includes('SUPERVISOR') ||
      role.includes('MANAGER') ||
      role.includes('FINANCE_DIRECTOR') ||
      role.includes('CFO')
    );
  }

  /**
   * Evaluates and processes an approval decision step.
   */
  static evaluateApprovalStep(params: {
    request: ApprovalRequestItem;
    approverUserId: string;
    approverRole: string;
    action: 'APPROVE' | 'REJECT';
    notes?: string;
  }): { nextStatus: ApprovalChainStatus; record: ApprovalRequestItem } {
    // 1. Enforce Separation of Duties
    this.assertSeparationOfDuties(params.request.requesterUserId, params.approverUserId);

    // 2. Validate role authority
    if (!this.validateApproverRole(params.request.tier, params.approverRole)) {
      throw new InsufficientApprovalAuthorityError();
    }

    // 3. Prevent duplicate votes by the same reviewer
    const alreadyVoted = params.request.approvals.some((a) => a.approverUserId === params.approverUserId);
    if (alreadyVoted) {
      throw new Error('این کاربر قبلاً در این پرونده نظر خود را ثبت کرده است.');
    }

    const decisionRecord = {
      approverUserId: params.approverUserId,
      approverRole: params.approverRole,
      action: params.action,
      notes: params.notes,
      decidedAt: new Date(),
    };

    const updatedApprovals = [...params.request.approvals, decisionRecord];

    // If rejected, the request immediately terminates as REJECTED
    if (params.action === 'REJECT') {
      return {
        nextStatus: 'REJECTED',
        record: {
          ...params.request,
          status: 'REJECTED',
          approvals: updatedApprovals,
          updatedAt: new Date(),
        },
      };
    }

    // Determine if further steps are needed based on tier
    // HIGH tier requires 2 distinct approvals (e.g. Branch Manager + Financial Director)
    let nextStatus: ApprovalChainStatus = 'APPROVED';
    if (params.request.tier === 'HIGH') {
      const approveCount = updatedApprovals.filter((a) => a.action === 'APPROVE').length;
      if (approveCount < 2) {
        nextStatus = 'IN_REVIEW';
      }
    }

    return {
      nextStatus,
      record: {
        ...params.request,
        status: nextStatus,
        approvals: updatedApprovals,
        updatedAt: new Date(),
      },
    };
  }
}
