import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { TenantAuthContext, assertTenantAccess } from './permission-service';

export class TenantAccessViolationError extends Error {
  constructor(message: string = 'Forbidden: Cross-tenant data access blocked (Tenant Isolation)') {
    super(message);
    this.name = 'TenantAccessViolationError';
  }
}

export class TenantWriteViolationError extends Error {
  constructor(message: string = 'Forbidden: Cross-tenant write operation blocked (Tenant Isolation)') {
    super(message);
    this.name = 'TenantWriteViolationError';
  }
}

/**
 * Centralized Tenant-Scoped Repository (IAM-102)
 * Guarantees that all protected B2B queries and mutations pass through
 * a secure tenant boundary with automatic org and branch scoping.
 */
export class TenantRepository {
  private readonly client: Prisma.TransactionClient;

  constructor(
    public readonly ctx: TenantAuthContext,
    client?: Prisma.TransactionClient
  ) {
    this.client = client || (prisma as unknown as Prisma.TransactionClient);
  }

  static forContext(ctx: TenantAuthContext, tx?: Prisma.TransactionClient): TenantRepository {
    return new TenantRepository(ctx, tx);
  }

  get organizationId(): string | undefined {
    return this.ctx.organizationId;
  }

  get branchId(): string | undefined {
    return this.ctx.branchId;
  }

  get isSuperAdmin(): boolean {
    return this.ctx.isSuperAdmin;
  }

  /**
   * Enforces that writes target the caller's organization and branch (IAM-104, IAM-110)
   */
  assertWriteAccess(targetOrgId?: string | null, targetBranchId?: string | null): void {
    if (this.ctx.isSuperAdmin) {
      return;
    }

    if (!this.ctx.organizationId) {
      throw new TenantWriteViolationError('Forbidden: Missing tenant organization context for mutation');
    }

    if (targetOrgId && targetOrgId !== this.ctx.organizationId) {
      throw new TenantWriteViolationError(
        `Forbidden: Cross-organization write blocked. Tenant ${this.ctx.organizationId} cannot write to ${targetOrgId}`
      );
    }

    if (targetBranchId && this.ctx.branchId && targetBranchId !== this.ctx.branchId) {
      throw new TenantWriteViolationError(
        `Forbidden: Cross-branch write blocked. Branch ${this.ctx.branchId} cannot write to ${targetBranchId}`
      );
    }
  }

  // ==================== 1. Booking Repository Methods ====================

  async findBookingById(id: string) {
    const booking = await this.client.booking.findUnique({
      where: { id },
      include: {
        items: true,
        trip: true,
        refunds: true,
        statusHistory: true,
      },
    });

    if (!booking) return null;
    assertTenantAccess(this.ctx, {
      organizationId: booking.organizationId,
      branchId: booking.branchId,
      customerId: booking.customerId,
    });
    return booking;
  }

  async findBookings(args: Prisma.BookingFindManyArgs = {}) {
    const where = { ...(args.where || {}) };
    if (!this.ctx.isSuperAdmin) {
      if (!this.ctx.organizationId) {
        where.customerId = this.ctx.userId;
      } else {
        where.organizationId = this.ctx.organizationId;
        if (this.ctx.branchId) {
          where.branchId = this.ctx.branchId;
        }
      }
    }
    return this.client.booking.findMany({ ...args, where });
  }

  async createBooking(data: Prisma.BookingUncheckedCreateInput) {
    this.assertWriteAccess(data.organizationId, data.branchId);
    const resolvedData: Prisma.BookingUncheckedCreateInput = {
      ...data,
      organizationId: this.ctx.isSuperAdmin ? (data.organizationId ?? this.ctx.organizationId ?? null) : (this.ctx.organizationId ?? null),
      branchId: this.ctx.isSuperAdmin ? (data.branchId ?? this.ctx.branchId ?? null) : (this.ctx.branchId ?? null),
    };
    return this.client.booking.create({ data: resolvedData });
  }

  // ==================== 2. Trip (Travel File) Repository Methods ====================

  async findTripById(id: string) {
    const trip = await this.client.trip.findUnique({
      where: { id },
      include: {
        bookings: { include: { items: { include: { inventoryItem: { include: { supplier: true } } } } } },
        user: { select: { id: true, name: true, email: true, phone: true, travelerProfiles: { include: { documents: true } } } },
      },
    });

    if (!trip) return null;
    assertTenantAccess(this.ctx, {
      organizationId: trip.organizationId,
      branchId: trip.branchId,
      customerId: trip.userId,
    });
    return trip;
  }

  async findTrips(args: Prisma.TripFindManyArgs = {}) {
    const where = { ...(args.where || {}) };
    if (!this.ctx.isSuperAdmin) {
      if (!this.ctx.organizationId) {
        where.userId = this.ctx.userId;
      } else {
        where.organizationId = this.ctx.organizationId;
        if (this.ctx.branchId) {
          where.branchId = this.ctx.branchId;
        }
      }
    }
    return this.client.trip.findMany({ ...args, where });
  }

  async createTrip(data: Prisma.TripUncheckedCreateInput) {
    this.assertWriteAccess(data.organizationId, data.branchId);
    const resolvedData: Prisma.TripUncheckedCreateInput = {
      ...data,
      organizationId: this.ctx.isSuperAdmin ? (data.organizationId ?? this.ctx.organizationId ?? null) : (this.ctx.organizationId ?? null),
      branchId: this.ctx.isSuperAdmin ? (data.branchId ?? this.ctx.branchId ?? null) : (this.ctx.branchId ?? null),
    };
    return this.client.trip.create({ data: resolvedData });
  }

  // ==================== 3. Invoice Repository Methods ====================

  async findInvoiceById(id: string) {
    const invoice = await this.client.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!invoice) return null;
    assertTenantAccess(this.ctx, {
      organizationId: invoice.organizationId,
      branchId: invoice.branchId,
      customerId: invoice.customerId,
    });
    return invoice;
  }

  async findInvoices(args: Prisma.InvoiceFindManyArgs = {}) {
    const where = { ...(args.where || {}) };
    if (!this.ctx.isSuperAdmin) {
      if (!this.ctx.organizationId) {
        where.customerId = this.ctx.userId;
      } else {
        where.organizationId = this.ctx.organizationId;
        if (this.ctx.branchId) {
          where.branchId = this.ctx.branchId;
        }
      }
    }
    return this.client.invoice.findMany({ ...args, where });
  }

  async createInvoice(data: Prisma.InvoiceUncheckedCreateInput) {
    this.assertWriteAccess(data.organizationId, data.branchId);

    // Verify linked booking belongs to the same tenant (IAM-104)
    if (data.bookingId && !this.ctx.isSuperAdmin) {
      const bkg = await this.client.booking.findUnique({
        where: { id: data.bookingId },
        select: { organizationId: true },
      });
      if (bkg?.organizationId && bkg.organizationId !== this.ctx.organizationId) {
        throw new TenantWriteViolationError('Forbidden: Cannot create invoice for cross-organization booking');
      }
    }

    const resolvedData: Prisma.InvoiceUncheckedCreateInput = {
      ...data,
      organizationId: this.ctx.isSuperAdmin ? (data.organizationId ?? this.ctx.organizationId ?? null) : (this.ctx.organizationId ?? null),
      branchId: this.ctx.isSuperAdmin ? (data.branchId ?? this.ctx.branchId ?? null) : (this.ctx.branchId ?? null),
    };
    return this.client.invoice.create({ data: resolvedData });
  }

  // ==================== 4. SettlementBatch Repository Methods ====================

  async findSettlementBatchById(id: string) {
    const batch = await this.client.settlementBatch.findUnique({
      where: { id },
    });

    if (!batch) return null;
    assertTenantAccess(this.ctx, {
      organizationId: batch.organizationId,
      branchId: batch.branchId,
    });
    return batch;
  }

  async findSettlementBatches(args: Prisma.SettlementBatchFindManyArgs = {}) {
    const where = { ...(args.where || {}) };
    if (!this.ctx.isSuperAdmin) {
      if (this.ctx.organizationId) {
        where.organizationId = this.ctx.organizationId;
        if (this.ctx.branchId) {
          where.branchId = this.ctx.branchId;
        }
      }
    }
    return this.client.settlementBatch.findMany({ ...args, where });
  }

  async createSettlementBatch(data: Prisma.SettlementBatchUncheckedCreateInput) {
    this.assertWriteAccess(data.organizationId, data.branchId);
    const resolvedData: Prisma.SettlementBatchUncheckedCreateInput = {
      ...data,
      organizationId: this.ctx.isSuperAdmin ? (data.organizationId ?? this.ctx.organizationId ?? null) : (this.ctx.organizationId ?? null),
      branchId: this.ctx.isSuperAdmin ? (data.branchId ?? this.ctx.branchId ?? null) : (this.ctx.branchId ?? null),
    };
    return this.client.settlementBatch.create({ data: resolvedData });
  }

  // ==================== 5. TravelDocument Repository Methods ====================

  async findTravelDocumentById(id: string) {
    const doc = await this.client.travelDocument.findUnique({
      where: { id },
      include: {
        travelerProfile: { select: { userId: true } },
      },
    });

    if (!doc) return null;
    assertTenantAccess(this.ctx, {
      organizationId: doc.organizationId,
      branchId: doc.branchId,
      customerId: doc.travelerProfile?.userId,
    });
    return doc;
  }

  async findTravelDocuments(args: Prisma.TravelDocumentFindManyArgs = {}) {
    const where = { ...(args.where || {}) };
    if (!this.ctx.isSuperAdmin) {
      if (!this.ctx.organizationId) {
        where.travelerProfile = { userId: this.ctx.userId };
      } else {
        where.organizationId = this.ctx.organizationId;
        if (this.ctx.branchId) {
          where.branchId = this.ctx.branchId;
        }
      }
    }
    return this.client.travelDocument.findMany({ ...args, where });
  }

  async createTravelDocument(data: Prisma.TravelDocumentUncheckedCreateInput) {
    this.assertWriteAccess(data.organizationId, data.branchId);
    const resolvedData: Prisma.TravelDocumentUncheckedCreateInput = {
      ...data,
      organizationId: this.ctx.isSuperAdmin ? (data.organizationId ?? this.ctx.organizationId ?? null) : (this.ctx.organizationId ?? null),
      branchId: this.ctx.isSuperAdmin ? (data.branchId ?? this.ctx.branchId ?? null) : (this.ctx.branchId ?? null),
    };
    return this.client.travelDocument.create({ data: resolvedData });
  }
}
