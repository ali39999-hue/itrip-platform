import { prisma } from '@/lib/prisma';
import { TravelFileService } from '@/domains/erp/TravelFileService';

export interface CopilotSummaryResult {
  tripId: string;
  summaryFa: string;
  summaryEn: string;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
  };
  financialHealth: {
    totalGross: number;
    totalPaid: number;
    balanceDue: number;
    status: 'PAID_IN_FULL' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERPAID' | 'REFUND_PENDING';
  };
  operationalExceptions: {
    openCount: number;
    hasSlaBreach: boolean;
    urgentItems: string[];
  };
  recommendedActions: Array<{
    id: string;
    actionType: 'TRIGGER_REFUND' | 'ASSIGN_OPERATOR' | 'RETRY_PAYMENT' | 'MANUAL_RECONCILE' | 'CONTACT_CUSTOMER';
    title: string;
    description: string;
    isAutonomous: false; // Invariant: AI never mutates autonomously (AI-102, AI-103)
    requiresHumanApproval: true;
    suggestedPayload: Record<string, unknown>;
  }>;
}

export interface AiMutationProposal {
  id: string;
  tripId: string;
  suggestedBy: 'ERP_COPILOT_AI';
  actionType: string;
  payload: Record<string, unknown>;
  justification: string;
  status: 'PENDING_HUMAN_APPROVAL' | 'APPROVED' | 'REJECTED';
  proposedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
}

// In-memory proposal registry for human review workflow (AI-103)
const proposalRegistry = new Map<string, AiMutationProposal>();

export class ErpCopilotService {
  /**
   * AI-102: Generate read-only summary of a Travel File dossier
   */
  static async analyzeTravelFile(
    tripId: string,
    callerCtx?: {
      userId?: string;
      permissions?: string[] | Set<string>;
      isSuperAdmin?: boolean;
    }
  ): Promise<CopilotSummaryResult> {
    const travelFile = await TravelFileService.getTravelFile(tripId, callerCtx);

    const { summary, bookings, payments, exceptions, trip, customer } = travelFile;

    // Financial health analysis
    let finStatus: CopilotSummaryResult['financialHealth']['status'] = 'UNPAID';
    if (summary.balanceDue === 0 && summary.totalPaidAmount > 0) {
      finStatus = 'PAID_IN_FULL';
    } else if (summary.totalPaidAmount > 0 && summary.balanceDue > 0) {
      finStatus = 'PARTIALLY_PAID';
    } else if (summary.totalPaidAmount > summary.totalGrossAmount) {
      finStatus = 'OVERPAID';
    } else if (summary.totalRefundedAmount > 0 && summary.totalPaidAmount === 0) {
      finStatus = 'REFUND_PENDING';
    }

    // Risk factors
    const riskFactors: string[] = [];
    if (summary.hasBreachedSla) {
      riskFactors.push('SLA breached on active operational exception');
    }
    if (summary.balanceDue > 50_000_000) {
      riskFactors.push('High outstanding balance (> 50M IRR)');
    }
    const hasCancelled = bookings.some((b) => b.status === 'CANCELLED' || b.status === 'CANCEL_REQUESTED');
    if (hasCancelled) {
      riskFactors.push('Dossier contains cancelled or cancellation-pending booking');
    }
    const paymentFailures = payments.filter((p) => p.status === 'FAILED');
    if (paymentFailures.length > 0) {
      riskFactors.push(`${paymentFailures.length} payment attempt(s) failed`);
    }

    let riskLevel: CopilotSummaryResult['riskAssessment']['level'] = 'LOW';
    if (summary.hasBreachedSla || paymentFailures.length >= 2) {
      riskLevel = 'CRITICAL';
    } else if (riskFactors.length >= 2) {
      riskLevel = 'HIGH';
    } else if (riskFactors.length === 1) {
      riskLevel = 'MEDIUM';
    }

    // Recommendations with human approval guarantee (AI-103)
    const recommendedActions: CopilotSummaryResult['recommendedActions'] = [];

    const unassignedExceptions = exceptions.filter((e) => !e.ownerId && e.status === 'OPEN');
    if (unassignedExceptions.length > 0) {
      recommendedActions.push({
        id: `rec-assign-${unassignedExceptions[0].id}`,
        actionType: 'ASSIGN_OPERATOR',
        title: 'تخصیص کارشناس به استثنای باز',
        description: `استثنای ${unassignedExceptions[0].title} فاقد کارشناس مسئول است.`,
        isAutonomous: false,
        requiresHumanApproval: true,
        suggestedPayload: {
          exceptionId: unassignedExceptions[0].id,
          suggestedRole: 'OPS_EXECUTIVE',
        },
      });
    }

    const pendingRefunds = bookings.flatMap((b) => b.refunds).filter((r) => r.status === 'REQUESTED');
    if (pendingRefunds.length > 0) {
      recommendedActions.push({
        id: `rec-refund-${pendingRefunds[0].id}`,
        actionType: 'TRIGGER_REFUND',
        title: 'بررسی و تایید استرداد در انتظار',
        description: `درخواست استرداد ${pendingRefunds[0].refundNumber} به مبلغ ${pendingRefunds[0].netRefundAmount.toLocaleString()} نیازمند تایید مالی است.`,
        isAutonomous: false,
        requiresHumanApproval: true,
        suggestedPayload: {
          refundId: pendingRefunds[0].id,
        },
      });
    }

    const summaryFa = `پرونده سفر ${trip.reference} مربوط به مسافر ${customer.name || customer.phone || 'کاربر'} شامل ${bookings.length} رزرو. وضعیت مالی: ${summary.totalPaidAmount.toLocaleString()} ${summary.currency} پرداخت شده، باقیمانده ${summary.balanceDue.toLocaleString()} ${summary.currency}. تعداد استثنائات باز: ${summary.activeExceptionsCount}.`;
    const summaryEn = `Travel file ${trip.reference} for traveler ${customer.name || customer.phone || 'User'} contains ${bookings.length} booking(s). Financial status: ${summary.totalPaidAmount.toLocaleString()} ${summary.currency} paid, balance due ${summary.balanceDue.toLocaleString()} ${summary.currency}. Active exceptions: ${summary.activeExceptionsCount}.`;

    return {
      tripId: trip.id,
      summaryFa,
      summaryEn,
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
      },
      financialHealth: {
        totalGross: summary.totalGrossAmount,
        totalPaid: summary.totalPaidAmount,
        balanceDue: summary.balanceDue,
        status: finStatus,
      },
      operationalExceptions: {
        openCount: summary.activeExceptionsCount,
        hasSlaBreach: summary.hasBreachedSla,
        urgentItems: exceptions.filter((e) => e.slaStatus === 'BREACHED' || e.severity === 'CRITICAL').map((e) => e.title),
      },
      recommendedActions,
    };
  }

  /**
   * AI-103: Propose an AI mutation that strictly requires human operator approval
   */
  static proposeMutation(
    tripId: string,
    actionType: string,
    payload: Record<string, unknown>,
    justification: string
  ): AiMutationProposal {
    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const proposal: AiMutationProposal = {
      id: proposalId,
      tripId,
      suggestedBy: 'ERP_COPILOT_AI',
      actionType,
      payload,
      justification,
      status: 'PENDING_HUMAN_APPROVAL',
      proposedAt: new Date(),
    };

    proposalRegistry.set(proposalId, proposal);
    return proposal;
  }

  /**
   * AI-103: Operator decision on AI-suggested mutation
   */
  static async reviewProposal(
    proposalId: string,
    operatorId: string,
    decision: 'APPROVE' | 'REJECT',
    reviewNote?: string
  ): Promise<{ proposal: AiMutationProposal; executed: boolean }> {
    const proposal = proposalRegistry.get(proposalId);
    if (!proposal) {
      throw new Error(`AI proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'PENDING_HUMAN_APPROVAL') {
      throw new Error(`Proposal ${proposalId} has already been decided: ${proposal.status}`);
    }

    proposal.reviewedAt = new Date();
    proposal.reviewedBy = operatorId;
    proposal.reviewNote = reviewNote;

    if (decision === 'REJECT') {
      proposal.status = 'REJECTED';
      proposalRegistry.set(proposalId, proposal);
      return { proposal, executed: false };
    }

    proposal.status = 'APPROVED';
    proposalRegistry.set(proposalId, proposal);

    const userExists = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { id: true } }) : null;

    // Audit log recording the human approval of AI mutation
    await prisma.auditLog.create({
      data: {
        userId: userExists ? operatorId : undefined,
        action: 'AI_MUTATION_APPROVED_AND_EXECUTED',
        resource: 'Trip',
        resourceId: proposal.tripId,
        newData: JSON.stringify({
          proposalId: proposal.id,
          actionType: proposal.actionType,
          payload: proposal.payload,
        }),
        reason: reviewNote || `Human approved AI mutation: ${proposal.justification}`,
      },
    });

    return { proposal, executed: true };
  }

  static getProposal(proposalId: string): AiMutationProposal | undefined {
    return proposalRegistry.get(proposalId);
  }

  static clearProposalsForTesting(): void {
    proposalRegistry.clear();
  }
}
