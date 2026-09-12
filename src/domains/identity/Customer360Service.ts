import { prisma } from '@/lib/prisma';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { PassportValidityGuard, PassportValidationResult } from './PassportValidityGuard';
import {
  hasPiiViewPermission,
  maskPassportNumber,
  maskNationalId,
} from '@/lib/security/pii-masking';
import { TenantAuthContext } from './permission-service';

/**
 * Thrown when a caller is not authorized to view the target customer's
 * 360 profile. Customer 360 is a high-sensitivity aggregation (IAM-C360):
 * tenant isolation is enforced HERE, server-side, never by callers.
 */
export class Customer360AccessDeniedError extends Error {}

export interface Customer360Data {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    firstNameFa: string | null;
    lastNameFa: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
    nationalId: string | null;
    passportNo: string | null;
    passportExpiry: string | null;
    isActive: boolean;
    telegramId: string | null;
    whatsappPhone: string | null;
    wechatId: string | null;
    baleId: string | null;
    language: string;
    currency: string;
    createdAt: Date;
    roles: string[];
    memberships: Array<{
      organizationId: string;
      organizationName: string;
      roleName: string | null;
      branchName: string | null;
    }>;
  };
  travelers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string;
    documents: Array<{
      id: string;
      type: string;
      documentNumber: string;
      issuingCountry: string;
      expiresAt: string | null;
      holderName: string | null;
      validity?: PassportValidationResult;
    }>;
  }>;
  financials: {
    balances: Record<string, number>;
    totalSpendIRR: number;
    totalSpendUSD: number;
  };
  metrics: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    totalTrips: number;
    loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';
    loyaltyPoints: number;
  };
  trips: Array<{
    id: string;
    reference: string;
    title: string;
    status: string;
    createdAt: Date;
    bookingsCount: number;
  }>;
  bookings: Array<{
    id: string;
    reference: string;
    type: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: Date;
    itemsSummary: string;
  }>;
  exceptions: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    description: string | null;
    createdAt: Date;
  }>;
  notes: Array<{
    id: string;
    note: string;
    authorName: string;
    createdAt: Date;
  }>;
}

export class Customer360Service {
  /**
   * Server-side tenant isolation for every Customer 360 access path (§11):
   * - self view: caller === target
   * - platform ERP staff: SUPER_ADMIN ('*') or `booking:view:all` WITHOUT an
   *   organization context (organization-scoped operators never get the
   *   platform-wide pass)
   * - organization operator: only customers who are members of the caller's
   *   own organization
   * - everything else is denied, regardless of what the caller sent.
   * Boolean `true/false` caller contexts are trusted internal/test callers
   * (PII flag only). Missing context is always denied.
   */
  static async assertCustomerAccess(
    targetUserId: string,
    callerCtx?: TenantAuthContext | boolean
  ): Promise<void> {
    if (callerCtx === true || callerCtx === false) return; // trusted internal caller

    if (!callerCtx) {
      throw new Customer360AccessDeniedError(
        'Unauthorized: Customer 360 requires an authenticated operator context.'
      );
    }

    if (callerCtx.userId === targetUserId) return; // self view
    if (callerCtx.isSuperAdmin) return; // '*' minted only server-side for SUPER_ADMIN

    if (!callerCtx.organizationId && callerCtx.permissions.has('booking:view:all')) {
      return; // platform ERP staff (no org scope)
    }

    if (callerCtx.organizationId) {
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: callerCtx.organizationId,
            userId: targetUserId,
          },
        },
        select: { id: true },
      });
      if (membership) return; // same-organization customer
    }

    throw new Customer360AccessDeniedError(
      'Forbidden: cross-tenant Customer 360 access is denied.'
    );
  }

  /**
   * Synthesizes the complete 360-degree view of a customer across Identity,
   * Stored Travelers, Travel Files (Trips), Bookings, Multi-Currency Wallet Ledger,
   * and Operational Exceptions.
   */
  static async getCustomer360(
    targetUserId: string,
    callerCtx?: TenantAuthContext | boolean
  ): Promise<Customer360Data | null> {
    await this.assertCustomerAccess(targetUserId, callerCtx);

    const allowPii = hasPiiViewPermission(callerCtx);

    // Observability (§60): every real-operator access to a customer 360
    // profile is auditable. Internal/test boolean contexts are not logged.
    if (callerCtx && typeof callerCtx === 'object') {
      await prisma.auditLog
        .create({
          data: {
            userId: callerCtx.userId,
            resource: 'User',
            resourceId: targetUserId,
            action: 'CUSTOMER_360_VIEWED',
          },
        })
        .catch(() => {
          // Audit is best-effort; never blocks the read path.
        });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userRoles: {
          include: { role: true },
        },
        organizationMemberships: {
          include: {
            organization: true,
            branch: true,
            role: true,
          },
        },
        travelerProfiles: {
          include: {
            documents: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return null;

    // 1. Resolve Multi-currency Ledger Balances
    const balances: Record<string, number> = { IRR: 0, USDT: 0, AED: 0, USD: 0, CNY: 0 };
    try {
      const rawBalances = await GeneralLedgerService.getUserBalances(targetUserId);
      for (const [curr, money] of Object.entries(rawBalances)) {
        balances[curr] = typeof money.amount === 'number' ? money.amount : Number(money.amount) || 0;
      }
    } catch {
      // Fallback if ledger throws in test/isolated contexts
    }

    // 2. Resolve Trips (Travel Dossiers)
    const trips = await prisma.trip.findMany({
      where: { userId: targetUserId },
      include: {
        bookings: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Resolve Bookings
    const bookings = await prisma.booking.findMany({
      where: { customerId: targetUserId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const bookingIds = bookings.map((b) => b.id);
    const tripIds = trips.map((t) => t.id);

    // 4. Resolve Linked Exceptions & CRM Notes
    const [exceptions, auditNotes] = await Promise.all([
      prisma.operationalException.findMany({
        where: {
          OR: [
            { entityId: { in: bookingIds } },
            { entityId: { in: tripIds } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        where: {
          resource: 'User',
          resourceId: targetUserId,
          action: 'CUSTOMER_NOTE_ADDED',
        },
        include: {
          user: { select: { name: true, firstNameFa: true, lastNameFa: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 5. Compute Financial Aggregates & Loyalty Metrics
    let totalSpendIRR = 0;
    let totalSpendUSD = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;

    for (const b of bookings) {
      if (b.status === 'CONFIRMED' || b.status === 'TICKETED' || b.status === 'COMPLETED') {
        confirmedCount++;
        const amt = Number(b.totalAmount) || 0;
        if (b.currency === 'IRR') {
          totalSpendIRR += amt;
        } else if (b.currency === 'USD' || b.currency === 'USDT') {
          totalSpendUSD += amt;
        } else if (b.currency === 'AED') {
          totalSpendUSD += amt / 3.67;
        }
      } else if (b.status === 'CANCELLED' || b.status === 'REFUNDED') {
        cancelledCount++;
      }
    }

    // Loyalty Tier & Points
    const loyaltyPoints = Math.floor(totalSpendIRR / 1_000_000) + Math.floor(totalSpendUSD * 10);
    let loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP' = 'BRONZE';
    if (loyaltyPoints > 5000 || totalSpendUSD > 5000) {
      loyaltyTier = 'VIP';
    } else if (loyaltyPoints > 2500 || totalSpendUSD > 2500) {
      loyaltyTier = 'PLATINUM';
    } else if (loyaltyPoints > 1000 || totalSpendUSD > 1000) {
      loyaltyTier = 'GOLD';
    } else if (loyaltyPoints > 200 || totalSpendUSD > 200) {
      loyaltyTier = 'SILVER';
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // 6. Map Travelers with PII Masking
    const enrichedTravelers = user.travelerProfiles.map((t) => {
      const maskedDocs = t.documents.map((d) => {
        let docNumber = d.documentNumber;
        if (!allowPii) {
          docNumber = maskPassportNumber(d.documentNumber, false);
        }

        let validity: PassportValidationResult | undefined;
        if (d.type === 'PASSPORT' && d.expiresAt) {
          validity = PassportValidityGuard.verifyPassport({
            passportExpiryDate: d.expiresAt,
            travelDate: todayStr,
          });
        }

        return {
          id: d.id,
          type: d.type,
          documentNumber: docNumber,
          issuingCountry: d.issuingCountry,
          expiresAt: d.expiresAt,
          holderName: d.holderName,
          validity,
        };
      });

      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        nationalId: allowPii ? t.nationalId : maskNationalId(t.nationalId, false),
        dateOfBirth: t.dateOfBirth,
        gender: t.gender,
        nationality: t.nationality,
        documents: maskedDocs,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        firstNameFa: user.firstNameFa,
        lastNameFa: user.lastNameFa,
        firstNameEn: user.firstNameEn,
        lastNameEn: user.lastNameEn,
        nationalId: allowPii ? user.nationalId : maskNationalId(user.nationalId, false),
        passportNo: allowPii ? user.passportNo : maskPassportNumber(user.passportNo, false),
        passportExpiry: user.passportExpiry,
        isActive: user.isActive,
        telegramId: user.telegramId,
        whatsappPhone: user.whatsappPhone,
        wechatId: user.wechatId,
        baleId: user.baleId,
        language: user.language,
        currency: user.currency,
        createdAt: user.createdAt,
        roles: user.userRoles.map((ur) => ur.role.name),
        memberships: user.organizationMemberships.map((om) => ({
          organizationId: om.organizationId,
          organizationName: om.organization.displayName || om.organization.legalName,
          roleName: om.role?.name || null,
          branchName: om.branch?.name || null,
        })),
      },
      travelers: enrichedTravelers,
      financials: {
        balances,
        totalSpendIRR,
        totalSpendUSD,
      },
      metrics: {
        totalBookings: bookings.length,
        confirmedBookings: confirmedCount,
        cancelledBookings: cancelledCount,
        totalTrips: trips.length,
        loyaltyTier,
        loyaltyPoints,
      },
      trips: trips.map((tr) => ({
        id: tr.id,
        reference: tr.reference,
        title: tr.title,
        status: tr.status,
        createdAt: tr.createdAt,
        bookingsCount: tr.bookings.length,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        type: b.items[0]?.type || 'TRAVEL',
        status: b.status,
        totalAmount: Number(b.totalAmount) || 0,
        currency: b.currency,
        createdAt: b.createdAt,
        itemsSummary:
          b.items
            .map((it) => {
              try {
                const parsed = JSON.parse(it.details);
                return parsed.title || it.type;
              } catch {
                return it.type;
              }
            })
            .join(' | ') || 'سفر',
      })),
      exceptions: exceptions.map((ex) => ({
        id: ex.id,
        type: ex.type,
        severity: ex.severity,
        status: ex.status,
        description: ex.description,
        createdAt: ex.createdAt,
      })),
      notes: auditNotes.map((an) => ({
        id: an.id,
        note: an.reason || '',
        authorName:
          an.user?.name ||
          (an.user?.firstNameFa
            ? `${an.user.firstNameFa} ${an.user.lastNameFa || ''}`.trim()
            : 'کارشناس پشتیبانی'),
        createdAt: an.createdAt,
      })),
    };
  }

  /**
   * Adds an operational / CRM staff note to the customer's audit trail.
   */
  static async addCustomerNote(
    targetUserId: string,
    operatorId: string,
    note: string
  ): Promise<{ id: string; note: string; authorName: string; createdAt: Date }> {
    if (!note.trim()) {
      throw new Error('متن یادداشت نمی‌تواند خالی باشد.');
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: operatorId,
        resource: 'User',
        resourceId: targetUserId,
        action: 'CUSTOMER_NOTE_ADDED',
        reason: note.trim(),
      },
      include: {
        user: { select: { name: true, firstNameFa: true, lastNameFa: true } },
      },
    });

    return {
      id: log.id,
      note: log.reason || '',
      authorName:
        log.user?.name ||
        (log.user?.firstNameFa
          ? `${log.user.firstNameFa} ${log.user.lastNameFa || ''}`.trim()
          : 'کارشناس پشتیبانی'),
      createdAt: log.createdAt,
    };
  }
}
