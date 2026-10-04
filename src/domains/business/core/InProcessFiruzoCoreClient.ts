import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { BookingStateMachine } from '@/domains/booking/state-machine';
import { assertBookingStatus } from '@/domains/booking/status-contracts';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import type { RevenueRealizationParams } from '@/domains/ledger/GeneralLedgerService';
import { OperationalExceptionService, ExceptionSeverity } from '@/domains/finance/three-way-reconciliation';
import { getTenantAuthContext } from '@/domains/identity/permission-service';
import { wrapOutboxPayload } from '@/domains/events/OutboxConsumer';
import type {
  CoreCompensateResult,
  CoreCreateBookingParams,
  CoreCreateBookingResult,
  CoreEmitEventParams,
  CoreHoldParams,
  CoreHoldResult,
  CoreReleaseResult,
  CoreRevenueRealizationParams,
  CoreTenantContext,
  CoreTransitionParams,
  CoreTransitionResult,
  CoreTx,
  CoreUserView,
  FiruzoCoreClient,
} from './FiruzoCoreClient';

/**
 * In-process adapter: today the child and the core share one Postgres schema,
 * so every interface method delegates directly to the verified core services.
 * When the "Specialized DB" split happens (5.txt §25), swap this factory for an
 * HTTP implementation — the interface stays identical, domain code untouched.
 */
export class InProcessFiruzoCoreClient implements FiruzoCoreClient {
  async getUser(userId: string): Promise<CoreUserView | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isActive: true, currency: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name ?? undefined,
      isActive: user.isActive,
      currency: user.currency,
    };
  }

  async getTenantContext(userId: string): Promise<CoreTenantContext> {
    // Reuse the canonical relational IAM chain (IAM-001) instead of guessing
    // at User columns — organizationId lives on ACTIVE OrganizationMembership.
    const ctx = await getTenantAuthContext(userId);
    return { organizationId: ctx.organizationId ?? null, isSuperAdmin: ctx.isSuperAdmin };
  }

  createHold(params: CoreHoldParams): Promise<CoreHoldResult> {
    return InventoryEngine.createHold(params);
  }

  captureHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<CoreReleaseResult> {
    return InventoryEngine.captureHold(token, tx);
  }

  releaseHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<CoreReleaseResult> {
    return InventoryEngine.releaseHold(token, tx);
  }

  compensateCapturedHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<CoreCompensateResult> {
    return InventoryEngine.compensateCapturedHold(token, tx);
  }

  sweepExpiredHolds(): Promise<number> {
    return InventoryEngine.sweepExpiredHolds();
  }

  assertBookingTransition(current: string, next: string): void {
    BookingStateMachine.assertTransition(assertBookingStatus(current), assertBookingStatus(next));
  }

  async createCoreBooking(
    params: CoreCreateBookingParams
  ): Promise<CoreCreateBookingResult> {
    if (params.type !== 'EXPERIENCE') {
      throw new Error('FiruzoCoreClient.createCoreBooking only supports type=EXPERIENCE');
    }
    // One atomic unit: hold capture → core booking row. Ledger realization is
    // posted separately at confirmation via postRevenueRealization (AGENTS.md §2).
    const created = await prisma.$transaction(async (tx) => {
      if (params.holdToken) {
        const captured = await InventoryEngine.captureHold(params.holdToken, tx);
        if (!captured.success) {
          throw new Error(captured.error ?? 'HOLD_CAPTURE_FAILED');
        }
      }
      return tx.booking.create({
        data: {
          reference: params.idempotencyKey,
          customerId: params.userId,
          organizationId: params.organizationId,
          totalAmount: new Prisma.Decimal(params.totalAmount),
          currency: params.currency,
          travelDate: params.travelDate,
          status: 'DRAFT',
          policySnapshot: JSON.stringify(params.details),
        },
        select: { id: true, reference: true },
      });
    });
    return { id: created.id, reference: created.reference };
  }

  transitionCoreBooking(params: CoreTransitionParams): Promise<CoreTransitionResult> {
    return BookingDomainService.transitionStatus({
      bookingId: params.bookingId,
      nextStatus: assertBookingStatus(params.next),
      actor: params.actor,
      reason: params.reason,
      correlationId: params.correlationId,
    });
  }

  async postRevenueRealization(
    params: CoreRevenueRealizationParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    // GeneralLedgerService posts one balanced entry group per item — aggregate
    // across ALL items (AGENTS.md §2), one Decimal conversion at the boundary.
    for (const [index, item] of params.items.entries()) {
      const realization: RevenueRealizationParams = {
        groupId: `BIZ-REV-${params.bookingId}-${index}`,
        amount: new Prisma.Decimal(item.sellPrice),
        netCost: new Prisma.Decimal(item.netCost),
        taxAmount: new Prisma.Decimal(item.taxAmount),
        feeAmount: new Prisma.Decimal(item.feeAmount),
        supplierId: 'PLATFORM',
        referenceId: params.bookingId,
      };
      await GeneralLedgerService.postRevenueRealization(realization, tx);
    }
  }

  raiseException(params: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    entityType: string;
    entityId: string;
    title?: string;
    organizationId?: string;
    description: string;
    slaMinutes?: number;
  }): Promise<string> {
    return OperationalExceptionService.raiseException({
      ...params,
      severity: ExceptionSeverity[params.severity],
    });
  }

  async emitDomainEvent(
    params: CoreEmitEventParams,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const client = tx ?? prisma;
    const event = await client.outboxEvent.create({
      data: {
        eventType: params.eventType,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        correlationId: params.correlationId,
        causationId: params.causationId,
        // ASYNC-105 versioned wrapper so core consumers can evolve safely.
        payload: wrapOutboxPayload(params.payload),
      },
    });
    return { id: event.id };
  }

  async runInTransaction<T>(fn: (tx: CoreTx) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (client) => {
      const coreTx: CoreTx = {
        captureHold: (token) => InventoryEngine.captureHold(token, client),
        releaseHold: (token) => InventoryEngine.releaseHold(token, client),
        compensateCapturedHold: (token) =>
          InventoryEngine.compensateCapturedHold(token, client),
        transitionCoreBooking: (params) =>
          BookingDomainService.transitionStatus({
            bookingId: params.bookingId,
            nextStatus: assertBookingStatus(params.next),
            actor: params.actor,
            reason: params.reason,
            tx: client,
          }),
        postRevenueRealization: async (params) => {
          for (const [index, item] of params.items.entries()) {
            const realization: RevenueRealizationParams = {
              groupId: `BIZ-REV-${params.bookingId}-${index}`,
              amount: new Prisma.Decimal(item.sellPrice),
              netCost: new Prisma.Decimal(item.netCost),
              taxAmount: new Prisma.Decimal(item.taxAmount),
              feeAmount: new Prisma.Decimal(item.feeAmount),
              supplierId: 'PLATFORM',
              referenceId: params.bookingId,
            };
            await GeneralLedgerService.postRevenueRealization(realization, client);
          }
        },
      };
      return fn(coreTx);
    });
  }
}

let instance: FiruzoCoreClient | undefined;

/**
 * Composition root. Env-gated so the HTTP adapter can slot in later without
 * touching any domain code (e.g. FIRUZO_CORE_URL=... → HttpFiruzoCoreClient).
 */
export function getFiruzoCoreClient(): FiruzoCoreClient {
  if (!instance) {
    instance = new InProcessFiruzoCoreClient();
  }
  return instance;
}
