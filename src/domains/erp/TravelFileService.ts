import { prisma } from '@/lib/prisma';
import { maskTravelerData, hasPiiViewPermission } from '@/lib/security/pii-masking';
import crypto from 'crypto';

export type TimelineDomain = 'LIFECYCLE' | 'PAYMENT' | 'REFUND' | 'INVENTORY' | 'AUDIT' | 'SUPPLIER';
export type TimelineSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface TimelineEvent {
  id: string;
  domain: TimelineDomain;
  severity: TimelineSeverity;
  title: string;
  description?: string;
  timestamp: Date;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface TravelFileExceptionView {
  id: string;
  type: string;
  severity: string;
  title: string;
  description?: string | null;
  status: string;
  ownerId?: string | null;
  slaDueAt?: Date | null;
  detectedAt: Date;
  slaRemainingMinutes: number | null;
  slaStatus: 'ON_TRACK' | 'APPROACHING_BREACH' | 'BREACHED' | 'NO_SLA';
}

export interface TravelFileDetailView {
  trip: {
    id: string;
    reference: string;
    title: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    organizationId?: string | null;
    branchId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  customer: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role: string;
    nationalId?: string | null;
    passportNo?: string | null;
    travelerProfiles: Array<{
      id: string;
      firstName: string;
      lastName: string;
      nationalId?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      nationality: string;
      documents: Array<{
        id: string;
        type: string;
        documentNumber: string;
        issuingCountry: string;
        expiresAt?: string | null;
        holderName?: string | null;
      }>;
    }>;
  };
  bookings: Array<{
    id: string;
    reference: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    ticketStatus: string;
    totalAmount: number;
    currency: string;
    travelDate?: string | null;
    supplierId?: string | null;
    externalPnr?: string | null;
    items: Array<{
      id: string;
      type: string;
      netCost: number;
      sellPrice: number;
      markup: number;
      taxAmount: number;
      supplierName?: string;
      details: string;
    }>;
    refunds: Array<{
      id: string;
      refundNumber: string;
      amount: number;
      netRefundAmount: number;
      penaltyAmount: number;
      status: string;
      reason?: string | null;
      createdAt: Date;
    }>;
  }>;
  payments: Array<{
    id: string;
    bookingId?: string | null;
    amount: number;
    currency: string;
    method: string;
    status: string;
    gatewayRef?: string | null;
    createdAt: Date;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    bookingId: string;
    totalAmount: number;
    netAmount: number;
    taxAmount: number;
    currency: string;
    status: string;
    issuedAt: Date;
  }>;
  exceptions: TravelFileExceptionView[];
  timeline: TimelineEvent[];
  summary: {
    totalGrossAmount: number;
    totalPaidAmount: number;
    totalRefundedAmount: number;
    balanceDue: number;
    currency: string;
    bookingCount: number;
    activeExceptionsCount: number;
    hasBreachedSla: boolean;
  };
}

export class TravelFileService {
  /**
   * Loads the consolidated Travel File workspace data (ERP-101)
   */
  static async getTravelFile(
    tripId: string,
    callerCtx?: {
      userId?: string;
      permissions?: string[] | Set<string>;
      isSuperAdmin?: boolean;
    }
  ): Promise<TravelFileDetailView> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          include: {
            travelerProfiles: {
              include: { documents: true },
            },
          },
        },
        bookings: {
          include: {
            items: {
              include: {
                inventoryItem: {
                  include: { supplier: true },
                },
              },
            },
            refunds: true,
            statusHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!trip) {
      throw new Error(`Travel file (Trip) with ID ${tripId} not found`);
    }

    const bookingIds = trip.bookings.map((b) => b.id);

    // Fetch payments associated with the bookings
    const payments = bookingIds.length > 0
      ? await prisma.payment.findMany({
          where: { bookingId: { in: bookingIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Fetch invoices associated with the bookings
    const invoices = bookingIds.length > 0
      ? await prisma.invoice.findMany({
          where: { bookingId: { in: bookingIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Fetch operational exceptions for trip or its bookings (ERP-103)
    const rawExceptions = await prisma.operationalException.findMany({
      where: {
        OR: [
          { entityType: 'TRIP', entityId: trip.id },
          ...(bookingIds.length > 0
            ? [{ entityType: 'BOOKING', entityId: { in: bookingIds } }]
            : []),
        ],
      },
      orderBy: { detectedAt: 'desc' },
    });

    // Compute SLA countdowns
    const now = Date.now();
    const exceptions: TravelFileExceptionView[] = rawExceptions.map((exc) => {
      let slaRemainingMinutes: number | null = null;
      let slaStatus: TravelFileExceptionView['slaStatus'] = 'NO_SLA';

      if (exc.slaDueAt) {
        const diffMs = exc.slaDueAt.getTime() - now;
        slaRemainingMinutes = Math.round(diffMs / (60 * 1000));
        if (exc.status === 'RESOLVED' || exc.status === 'CLOSED') {
          slaStatus = 'ON_TRACK';
        } else if (slaRemainingMinutes <= 0) {
          slaStatus = 'BREACHED';
        } else if (slaRemainingMinutes <= 60) {
          slaStatus = 'APPROACHING_BREACH';
        } else {
          slaStatus = 'ON_TRACK';
        }
      }

      return {
        id: exc.id,
        type: exc.type,
        severity: exc.severity,
        title: exc.title,
        description: exc.description,
        status: exc.status,
        ownerId: exc.ownerId,
        slaDueAt: exc.slaDueAt,
        detectedAt: exc.detectedAt,
        slaRemainingMinutes,
        slaStatus,
      };
    });

    // Fetch audit logs for the trip or bookings (ERP-107)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resource: 'Trip', resourceId: trip.id },
          ...(bookingIds.length > 0
            ? [{ resource: 'Booking', resourceId: { in: bookingIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Compile comprehensive consolidated timeline events (ERP-101, ERP-107)
    const timeline: TimelineEvent[] = [];

    // 1. Trip creation event
    timeline.push({
      id: `tl-trip-created-${trip.id}`,
      domain: 'LIFECYCLE',
      severity: 'INFO',
      title: 'Travel File Dossier Created',
      description: `Travel file ${trip.reference} initialized for customer ${trip.user.name || trip.user.email || trip.user.id}`,
      timestamp: trip.createdAt,
      actor: 'SYSTEM',
      metadata: { tripId: trip.id, status: trip.status },
    });

    // 2. Bookings events
    trip.bookings.forEach((b) => {
      timeline.push({
        id: `tl-bkg-created-${b.id}`,
        domain: 'LIFECYCLE',
        severity: 'INFO',
        title: `Booking ${b.reference} Added`,
        description: `Booking with status ${b.status} (${Number(b.totalAmount).toLocaleString()} ${b.currency})`,
        timestamp: b.createdAt,
        actor: 'CUSTOMER',
        metadata: { bookingId: b.id, reference: b.reference, status: b.status },
      });

      b.statusHistory.forEach((sh) => {
        timeline.push({
          id: `tl-bkg-hist-${sh.id}`,
          domain: 'LIFECYCLE',
          severity: sh.toStatus.includes('FAILED') || sh.toStatus.includes('CANCEL') ? 'WARNING' : 'INFO',
          title: `Booking Transition: ${sh.fromStatus} → ${sh.toStatus}`,
          description: sh.reason || undefined,
          timestamp: sh.createdAt,
          actor: sh.actor,
          metadata: { bookingId: b.id, correlationId: sh.correlationId },
        });
      });

      b.refunds.forEach((ref) => {
        timeline.push({
          id: `tl-ref-${ref.id}`,
          domain: 'REFUND',
          severity: ref.status === 'REJECTED' ? 'WARNING' : 'INFO',
          title: `Refund ${ref.refundNumber} (${ref.status})`,
          description: `Amount: ${Number(ref.netRefundAmount).toLocaleString()} ${ref.currency} - ${ref.reason || 'No reason'}`,
          timestamp: ref.createdAt,
          actor: ref.approvedBy || 'SYSTEM',
          metadata: { refundId: ref.id, status: ref.status },
        });
      });
    });

    // 3. Payment events
    payments.forEach((p) => {
      const isFailed = p.status === 'FAILED';
      timeline.push({
        id: `tl-pay-${p.id}`,
        domain: 'PAYMENT',
        severity: isFailed ? 'CRITICAL' : 'INFO',
        title: `Payment via ${p.method} - ${p.status}`,
        description: `Amount: ${Number(p.amount).toLocaleString()} ${p.currency}${p.gatewayRef ? ` (Ref: ${p.gatewayRef})` : ''}`,
        timestamp: p.createdAt,
        actor: 'GATEWAY',
        metadata: { paymentId: p.id, method: p.method, status: p.status },
      });
    });

    // 4. Invoices
    invoices.forEach((inv) => {
      timeline.push({
        id: `tl-inv-${inv.id}`,
        domain: 'PAYMENT',
        severity: 'INFO',
        title: `Invoice Issued: ${inv.invoiceNumber}`,
        description: `Total: ${Number(inv.totalAmount).toLocaleString()} ${inv.currency} (${inv.status})`,
        timestamp: inv.issuedAt,
        actor: 'FINANCE',
        metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
      });
    });

    // 5. Exceptions
    rawExceptions.forEach((exc) => {
      timeline.push({
        id: `tl-exc-${exc.id}`,
        domain: exc.type.includes('PAYMENT') ? 'PAYMENT' : exc.type.includes('SUPPLIER') ? 'SUPPLIER' : 'AUDIT',
        severity: exc.severity === 'CRITICAL' ? 'CRITICAL' : exc.severity === 'HIGH' ? 'WARNING' : 'INFO',
        title: `Operational Exception: ${exc.type}`,
        description: `${exc.title}${exc.description ? ` - ${exc.description}` : ''} [${exc.status}]`,
        timestamp: exc.detectedAt,
        actor: exc.ownerId || 'EXCEPTION_MONITOR',
        metadata: { exceptionId: exc.id, status: exc.status, severity: exc.severity },
      });
    });

    // 6. Audit logs
    auditLogs.forEach((log) => {
      timeline.push({
        id: `tl-audit-${log.id}`,
        domain: 'AUDIT',
        severity: 'INFO',
        title: log.action.replace(/_/g, ' '),
        description: log.reason || undefined,
        timestamp: log.createdAt,
        actor: log.userId || 'SYSTEM',
        metadata: { resource: log.resource, resourceId: log.resourceId },
      });
    });

    // Sort timeline chronologically (latest first)
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Financial summaries
    const totalGrossAmount = trip.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalPaidAmount = payments
      .filter((p) => p.status === 'SUCCESS' || p.status === 'CAPTURED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefundedAmount = trip.bookings
      .flatMap((b) => b.refunds)
      .filter((r) => r.status === 'COMPLETED' || r.status === 'SETTLED')
      .reduce((sum, r) => sum + Number(r.netRefundAmount), 0);
    const balanceDue = Math.max(0, totalGrossAmount - totalPaidAmount + totalRefundedAmount);
    const baseCurrency = trip.bookings[0]?.currency || 'IRR';

    // Apply PII masking unless caller holds 'traveler:pii:view' (ERP-109)
    const canViewPii = hasPiiViewPermission(
      callerCtx?.isSuperAdmin ? true : callerCtx?.permissions
    );
    const maskedCustomer = maskTravelerData(trip.user, canViewPii);

    const mappedBookings = trip.bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      paymentStatus: b.paymentStatus,
      fulfillmentStatus: b.fulfillmentStatus,
      ticketStatus: b.ticketStatus,
      totalAmount: Number(b.totalAmount),
      currency: b.currency,
      travelDate: b.travelDate,
      supplierId: b.supplierId,
      externalPnr: b.externalPnr,
      items: b.items.map((i) => ({
        id: i.id,
        type: i.type,
        netCost: Number(i.netCost),
        sellPrice: Number(i.sellPrice),
        markup: Number(i.markup),
        taxAmount: Number(i.taxAmount),
        supplierName: i.inventoryItem?.supplier?.name,
        details: i.details,
      })),
      refunds: b.refunds.map((r) => ({
        id: r.id,
        refundNumber: r.refundNumber,
        amount: Number(r.amount),
        netRefundAmount: Number(r.netRefundAmount),
        penaltyAmount: Number(r.penaltyAmount),
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    }));

    return {
      trip: {
        id: trip.id,
        reference: trip.reference,
        title: trip.title,
        status: trip.status,
        startDate: trip.startDate,
        endDate: trip.endDate,
        organizationId: trip.organizationId,
        branchId: trip.branchId,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
      },
      customer: maskedCustomer,
      bookings: mappedBookings,
      payments: payments.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        amount: Number(p.amount),
        currency: p.currency,
        method: p.method,
        status: p.status,
        gatewayRef: p.gatewayRef,
        createdAt: p.createdAt,
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        bookingId: inv.bookingId,
        totalAmount: Number(inv.totalAmount),
        netAmount: Number(inv.netAmount),
        taxAmount: Number(inv.taxAmount),
        currency: inv.currency,
        status: inv.status,
        issuedAt: inv.issuedAt,
      })),
      exceptions,
      timeline,
      summary: {
        totalGrossAmount,
        totalPaidAmount,
        totalRefundedAmount,
        balanceDue,
        currency: baseCurrency,
        bookingCount: trip.bookings.length,
        activeExceptionsCount: exceptions.filter((e) => e.status !== 'RESOLVED' && e.status !== 'CLOSED').length,
        hasBreachedSla: exceptions.some((e) => e.slaStatus === 'BREACHED'),
      },
    };
  }

  /**
   * ERP-102 Action: Add an operational note to the travel file
   */
  static async addNote(tripId: string, operatorId: string, note: string): Promise<{ success: boolean; logId: string }> {
    if (!note || !note.trim()) {
      throw new Error('Note content cannot be empty');
    }

    const userExists = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { id: true } }) : null;
    const log = await prisma.auditLog.create({
      data: {
        userId: userExists ? operatorId : undefined,
        action: 'TRAVEL_FILE_NOTE_ADDED',
        resource: 'Trip',
        resourceId: tripId,
        reason: note.trim(),
      },
    });

    return { success: true, logId: log.id };
  }

  /**
   * ERP-102 Action: Assign an operator/owner to the travel file
   */
  static async assignOperator(
    tripId: string,
    operatorId: string,
    assignedToId: string,
    note?: string
  ): Promise<{ success: boolean; logId: string }> {
    const userExists = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { id: true } }) : null;
    const log = await prisma.auditLog.create({
      data: {
        userId: userExists ? operatorId : undefined,
        action: 'TRAVEL_FILE_OPERATOR_ASSIGNED',
        resource: 'Trip',
        resourceId: tripId,
        newData: JSON.stringify({ assignedToId }),
        reason: note || `Assigned to operator ${assignedToId}`,
      },
    });

    return { success: true, logId: log.id };
  }

  /**
   * ERP-102 Action: Update travel file lifecycle status
   */
  static async updateStatus(
    tripId: string,
    operatorId: string,
    status: 'PLANNING' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    reason?: string
  ): Promise<{ success: boolean; status: string }> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const prevStatus = trip.status;
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { status },
    });

    const userExists = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { id: true } }) : null;
    await prisma.auditLog.create({
      data: {
        userId: userExists ? operatorId : undefined,
        action: 'TRAVEL_FILE_STATUS_UPDATED',
        resource: 'Trip',
        resourceId: tripId,
        oldData: JSON.stringify({ status: prevStatus }),
        newData: JSON.stringify({ status }),
        reason: reason || `Status changed from ${prevStatus} to ${status}`,
      },
    });

    return { success: true, status: updated.status };
  }

  /**
   * ERP-102 Action: Issue commercial invoice for a booking within the travel file
   */
  static async issueInvoice(
    tripId: string,
    bookingId: string,
    operatorId: string
  ): Promise<{ success: boolean; invoiceId: string; invoiceNumber: string }> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tripId },
      include: { items: true },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found in travel file ${tripId}`);
    }

    // Check if invoice already issued
    const existingInvoice = await prisma.invoice.findFirst({
      where: { bookingId: booking.id, status: 'ISSUED' },
    });
    if (existingInvoice) {
      return { success: true, invoiceId: existingInvoice.id, invoiceNumber: existingInvoice.invoiceNumber };
    }

    const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const totalAmount = Number(booking.totalAmount);
    const taxAmount = booking.items.reduce((s, item) => s + Number(item.taxAmount), 0);
    const netAmount = totalAmount - taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId: booking.id,
        customerId: booking.customerId,
        organizationId: booking.organizationId,
        branchId: booking.branchId,
        totalAmount,
        netAmount,
        taxAmount,
        currency: booking.currency,
        status: 'ISSUED',
        lines: {
          create: booking.items.map((item) => ({
            description: `${item.type} Service Line`,
            unitPrice: Number(item.sellPrice),
            totalPrice: Number(item.sellPrice),
            taxAmount: Number(item.taxAmount),
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: operatorId,
        action: 'TRAVEL_FILE_INVOICE_ISSUED',
        resource: 'Invoice',
        resourceId: invoice.id,
        reason: `Issued invoice ${invoiceNumber} for booking ${booking.reference}`,
      },
    });

    return { success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }

  /**
   * ERP-102 Action: Trigger authorized refund request for a booking
   */
  static async triggerRefund(
    tripId: string,
    bookingId: string,
    operatorId: string,
    params: {
      amount?: number;
      penalty?: number;
      reason: string;
    }
  ): Promise<{ success: boolean; refundId: string; refundNumber: string }> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tripId },
      include: { items: true },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found in travel file ${tripId}`);
    }

    const refundAmount = params.amount ?? Number(booking.totalAmount);
    const penalty = params.penalty ?? 0;
    const netAmount = Math.max(0, refundAmount - penalty);
    const refundNumber = `RFD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const idempotencyKey = `refund_${crypto.randomUUID()}`;

    const refund = await prisma.refund.create({
      data: {
        refundNumber,
        bookingId: booking.id,
        amount: refundAmount,
        penaltyAmount: penalty,
        netRefundAmount: netAmount,
        currency: booking.currency,
        status: 'REQUESTED',
        reason: params.reason,
        idempotencyKey,
        approvals: {
          create: {
            approverId: operatorId,
            decision: 'APPROVED',
            note: params.reason,
          },
        },
        policySnapshot: {
          create: {
            bookingId: booking.id,
            bookingStatusAtRequest: booking.status,
            penaltyPercentage: refundAmount > 0 ? (penalty / refundAmount) * 100 : 0,
            policyVersion: 'v1',
            rulesJson: JSON.stringify({ operatorTriggered: true, operatorId }),
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: operatorId,
        action: 'TRAVEL_FILE_REFUND_TRIGGERED',
        resource: 'Refund',
        resourceId: refund.id,
        reason: `Triggered refund ${refundNumber}: ${params.reason}`,
      },
    });

    return { success: true, refundId: refund.id, refundNumber: refund.refundNumber };
  }

  /**
   * ERP-107: Filter operational timeline events by domain and severity
   */
  static filterTimeline(
    timeline: TimelineEvent[],
    filters: {
      domains?: TimelineDomain[];
      severity?: TimelineSeverity[];
    }
  ): TimelineEvent[] {
    return timeline.filter((event) => {
      if (filters.domains && filters.domains.length > 0) {
        if (!filters.domains.includes(event.domain)) {
          return false;
        }
      }
      if (filters.severity && filters.severity.length > 0) {
        if (!filters.severity.includes(event.severity)) {
          return false;
        }
      }
      return true;
    });
  }
}
