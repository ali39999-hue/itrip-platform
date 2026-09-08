'use server';

import { prisma, getTenantScopedPrisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requirePermission, getTenantAuthContext, assertTenantAccess } from '@/domains/identity/permission-service';
import { TenantRepository } from '@/domains/identity/TenantRepository';
import { ReconciliationService, ReconciliationReport } from '@/domains/ledger/ReconciliationService';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { SettlementDomainService } from '@/domains/finance/SettlementDomainService';
import { businessMetrics } from '@/lib/observability/business-metrics';
import { TravelFileService } from '@/domains/erp/TravelFileService';
import { ExceptionCenterService } from '@/domains/erp/ExceptionCenterService';

export async function runLedgerReconciliation(): Promise<ReconciliationReport> {
  await requirePermission(['finance:reports:view', 'finance:settlement:match']);
  return ReconciliationService.reconcileLedger();
}

export async function getAdminFinanceStats() {
  try {
    await requirePermission('finance:reports:view');

    // Customer wallet balances per currency — computed in SQL, not in JS memory.
    const userAccounts = await prisma.account.findMany({
      where: { ownerType: 'USER' },
      select: { id: true, currency: true },
    });

    const balances: Record<string, number> = { IRR: 0, USDT: 0, AED: 0 };
    if (userAccounts.length > 0) {
      const sums = await prisma.ledgerEntry.groupBy({
        by: ['accountId', 'direction'],
        where: { accountId: { in: userAccounts.map((a) => a.id) } },
        _sum: { amount: true },
      });
      const accountCurrency = new Map(userAccounts.map((a) => [a.id, a.currency]));
      for (const row of sums) {
        const currency = accountCurrency.get(row.accountId);
        if (!currency) continue;
        const delta = Number(row._sum.amount || 0) * (row.direction === 'CREDIT' ? 1 : -1);
        balances[currency] = (balances[currency] ?? 0) + delta;
      }
    }

    // Platform funds: inflow = money collected into escrow,
    // outflow = refunds paid out of escrow. Per currency in SQL.
    const escrowAccounts = await prisma.account.findMany({
      where: { ownerType: 'PLATFORM_ESCROW' },
      select: { id: true, currency: true },
    });
    const inflowByCurrency: Record<string, number> = {};
    const outflowByCurrency: Record<string, number> = {};
    if (escrowAccounts.length > 0) {
      const escrowEntries = await prisma.ledgerEntry.groupBy({
        by: ['accountId', 'direction', 'referenceType'],
        where: { accountId: { in: escrowAccounts.map((a) => a.id) } },
        _sum: { amount: true },
      });
      const escrowCurrency = new Map(escrowAccounts.map((a) => [a.id, a.currency]));
      for (const row of escrowEntries) {
        const currency = escrowCurrency.get(row.accountId);
        if (!currency) continue;
        const amount = Number(row._sum.amount || 0);
        if (row.direction === 'CREDIT') {
          inflowByCurrency[currency] = (inflowByCurrency[currency] ?? 0) + amount;
        } else if (row.referenceType === 'REFUND') {
          outflowByCurrency[currency] = (outflowByCurrency[currency] ?? 0) + amount;
        }
      }
    }

    // Headline figures in IRR (the platform's base currency).
    const totalInflow = inflowByCurrency['IRR'] ?? 0;
    const totalOutflow = outflowByCurrency['IRR'] ?? 0;

    const recentTransactions = await prisma.ledgerEntry.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { account: true },
    });

    // Serialize to plain objects: Prisma Decimal instances cannot cross the
    // server->client component boundary.
    const recentPlain = recentTransactions.map((t) => ({
      id: t.id,
      groupId: t.groupId,
      direction: t.direction,
      amount: Number(t.amount),
      currency: t.currency,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdAt: t.createdAt.toISOString(),
      account: {
        ownerType: t.account.ownerType,
        ownerId: t.account.ownerId,
        currency: t.account.currency,
      },
    }));

    return {
      success: true,
      balances,
      inflow: totalInflow,
      outflow: totalOutflow,
      inflowByCurrency,
      outflowByCurrency,
      recentTransactions: recentPlain,
    };
  } catch (err: unknown) {
    console.error('getAdminFinanceStats server error:', err);
    return { success: false, error: 'Failed to fetch financial stats' };
  }
}

export async function getAdminBookings() {
  try {
    const user = await requirePermission('booking:view:all');
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);

    const bookings = await db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
    });
    return { success: true, bookings };
  } catch (err: unknown) {
    console.error('getAdminBookings server error:', err);
    return { success: false, error: 'Failed to fetch admin bookings' };
  }
}

import { RefundDomainService } from '@/domains/refund/RefundDomainService';

/**
 * Admin full-refund command (REF-001..REF-008).
 * All refund semantics — idempotency, immutable policy snapshot, approval trail,
 * attempt record, ledger reversal, inventory hold release, outbox notification —
 * live in RefundDomainService. The action authenticates, gates eligibility, and
 * writes the sensitive-action audit record (IAM-011).
 */
export async function refundBookingAdmin(bookingId: string) {
  try {
    const user = await requirePermission('booking:refund:approve');
    const tenantCtx = await getTenantAuthContext(user.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, organizationId: true, branchId: true, customerId: true },
    });
    if (!booking) return { success: false, error: 'Booking not found' };
    assertTenantAccess(tenantCtx, {
      organizationId: booking.organizationId,
      branchId: booking.branchId,
      customerId: booking.customerId,
    });
    if (booking.status !== 'CONFIRMED') return { success: false, error: 'Only confirmed bookings can be refunded' };

    // Deterministic per-booking key: a second full refund of the same booking —
    // even a concurrent one — collapses onto the first refund (REF-005).
    const result = await RefundDomainService.processRefund({
      bookingId,
      idempotencyKey: `admin_full_refund_${bookingId}`,
      reason: 'Admin initiated full refund',
      approvedBy: user.id,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Refund processing failed' };
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BOOKING_REFUNDED',
        resource: 'Booking',
        resourceId: bookingId,
        newData: JSON.stringify({
          refundId: result.refundId,
          refundNumber: result.refundNumber,
          netRefundAmount: result.netRefundAmount,
          currency: result.currency,
        }),
      },
    });

    revalidatePath('/admin/bookings');
    return {
      success: true,
      refundId: result.refundId,
      refundNumber: result.refundNumber,
      netRefundAmount: result.netRefundAmount,
      currency: result.currency,
    };
  } catch (err: unknown) {
    console.error('refundBookingAdmin server error:', err);
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('Unauthorized') || message.startsWith('Forbidden')) {
      return { success: false, error: message };
    }
    if (message.startsWith('Invalid state transition')) {
      return { success: false, error: message };
    }
    return { success: false, error: 'Refund processing failed' };
  }
}

export async function getAdminSuppliers() {
  await requirePermission('inventory:manage');
  const suppliers = await prisma.supplier.findMany({
    include: {
      contracts: true,
      _count: { select: { inventoryItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    mode: s.mode,
    contact: s.contact,
    isActive: s.isActive,
    itemsCount: s._count.inventoryItems,
    contracts: s.contracts.map((c) => ({
      id: c.id,
      pricingType: c.pricingType,
      commission: Number(c.commission),
      creditLimit: Number(c.creditLimit),
      currency: c.currency,
    })),
  }));
}

export async function createAdminSupplier(data: {
  name: string;
  type: string;
  mode?: string;
  contact?: string;
  commission?: number;
}) {
  await requirePermission('inventory:manage');
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      type: data.type,
      mode: data.mode || 'ALLOTMENT',
      contact: data.contact,
      contracts: {
        create: {
          pricingType: 'NET_RATE',
          commission: data.commission ?? 0,
          currency: 'IRR',
        },
      },
    },
  });
  revalidatePath('/admin/suppliers');
  revalidatePath('/admin/inventory');
  return { success: true, supplierId: supplier.id };
}

export async function getAdminInventory() {
  await requirePermission('inventory:manage');
  const items = await prisma.inventoryItem.findMany({
    include: {
      supplier: { select: { id: true, name: true, type: true } },
      allotments: {
        orderBy: { date: 'asc' },
        take: 30,
      },
      _count: { select: { holds: true } },
    },
    orderBy: { id: 'desc' },
  });

  return items.map((item) => ({
    id: item.id,
    supplierId: item.supplierId,
    supplierName: item.supplier.name,
    type: item.type,
    code: item.code,
    name: item.name,
    basePrice: Number(item.basePrice),
    currency: item.currency,
    activeHoldsCount: item._count.holds,
    allotments: item.allotments.map((a) => ({
      id: a.id,
      date: a.date,
      total: a.total,
      booked: a.booked,
      available: Math.max(0, a.total - a.booked),
      stopSell: a.stopSell,
    })),
  }));
}

export async function createAdminInventoryItem(data: {
  supplierId: string;
  type: string;
  name: string;
  code?: string;
  basePrice: number;
  currency?: string;
  initialAllotmentDays?: number;
  dailyCapacity?: number;
}) {
  await requirePermission('inventory:manage');
  const currency = data.currency || 'IRR';
  const initialDays = data.initialAllotmentDays || 7;
  const capacity = data.dailyCapacity || 10;

  const item = await prisma.inventoryItem.create({
    data: {
      supplierId: data.supplierId,
      type: data.type,
      name: data.name,
      code: data.code,
      basePrice: data.basePrice,
      currency,
    },
  });

  // Automatically create allotments for the next N days
  const allotmentsData = [];
  const today = new Date();
  for (let i = 0; i < initialDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    allotmentsData.push({
      inventoryItemId: item.id,
      date: dateStr,
      total: capacity,
      booked: 0,
      stopSell: false,
    });
  }

  if (allotmentsData.length > 0) {
    await InventoryEngine.createAllotments(allotmentsData);
  }

  revalidatePath('/admin/inventory');
  return { success: true, itemId: item.id };
}

export async function updateAllotment(id: string, data: { total?: number; stopSell?: boolean }) {
  await requirePermission('inventory:manage');
  // Capacity mutations go through the engine (INV-004/005): row-locked and
  // guarded so `total` can never drop below already-booked capacity.
  const result = await InventoryEngine.setAllotmentPolicy(id, data);
  if (!result.success) {
    return { success: false, error: result.error || 'Allotment update rejected by inventory engine' };
  }
  revalidatePath('/admin/inventory');
  return { success: true };
}

// ==================== Supplier Settlement Commands (SET-001..SET-004) ====================

export async function createAdminSettlementBatch(params: {
  supplierId: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
}) {
  try {
    await requirePermission('finance:post');
    const res = await SettlementDomainService.createSettlementBatch({
      supplierId: params.supplierId,
      periodStart: new Date(params.periodStart),
      periodEnd: new Date(params.periodEnd),
      currency: params.currency,
    });
    revalidatePath('/admin/finance');
    return {
      success: true,
      batch: {
        id: res.id,
        batchNumber: res.batchNumber,
        totalPayable: res.totalPayable.toNumber(),
        netSettlement: res.netSettlement.toNumber(),
        currency: res.totalPayable.currency,
        status: res.status,
      },
    };
  } catch (err: unknown) {
    console.error('createAdminSettlementBatch error:', err);
    return { success: false, error: 'Failed to create settlement batch' };
  }
}

export async function getAdminSettlementBatches(supplierId?: string) {
  try {
    const user = await requirePermission('finance:reports:view');
    const tenantCtx = await getTenantAuthContext(user.id);
    const repo = TenantRepository.forContext(tenantCtx);
    const batches = await repo.findSettlementBatches({
      where: supplierId ? { supplierId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      batches: batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        supplierId: b.supplierId,
        totalPayable: Number(b.totalPayable),
        netSettlement: Number(b.netSettlement),
        currency: b.currency,
        status: b.status,
        periodStart: b.periodStart.toISOString(),
        periodEnd: b.periodEnd.toISOString(),
        createdAt: b.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    console.error('getAdminSettlementBatches error:', err);
    return { success: false, error: 'Failed to fetch settlement batches', batches: [] };
  }
}

export async function executeAdminSettlementPayment(batchId: string) {
  try {
    const user = await requirePermission('finance:post');
    const res = await SettlementDomainService.executeSettlementPayment(batchId);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SETTLEMENT_PAID',
        resource: 'SettlementBatch',
        resourceId: batchId,
        newData: JSON.stringify({ settledAt: res.settledAt }),
      },
    });

    revalidatePath('/admin/finance');
    return { success: true, settledAt: res.settledAt.toISOString() };
  } catch (err: unknown) {
    console.error('executeAdminSettlementPayment error:', err);
    return { success: false, error: 'Failed to execute settlement payment' };
  }
}

/**
 * Authoritative Business Telemetry Metrics (OBS-005).
 * Aggregates funnel conversion rates, payment success rates, and volume metrics.
 */
export async function getAdminBusinessMetrics() {
  try {
    await requirePermission('finance:reports:view');
    return { success: true, metrics: businessMetrics.getSnapshot() };
  } catch (err: unknown) {
    console.error('getAdminBusinessMetrics error:', err);
    return { success: false, error: 'Failed to fetch business metrics' };
  }
}

// ==================== Admin Dashboard & Queue Queries (BASE-006) ====================

export async function getAdminDashboardData() {
  const user = await requirePermission('booking:view:all');
  const tenantCtx = await getTenantAuthContext(user.id);
  const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);

  try {
    const [
      confirmedBookingsCount,
      allBookings,
      ledgerEntries,
      pendingOutboxCount,
      openExceptionsCount,
      pendingRefundsCount,
      paymentExceptionsCount,
      supplierExceptionsCount,
      pendingExceptions,
      recentHistory,
      recentAudit,
    ] = await Promise.all([
      db.booking.count({ where: { status: 'CONFIRMED' } }),
      db.booking.findMany({ select: { totalAmount: true, status: true } }),
      prisma.ledgerEntry.findMany({ select: { direction: true, amount: true, referenceType: true, currency: true } }),
      prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      prisma.operationalException.count({ where: { status: 'OPEN' } }),
      prisma.refund.count({ where: { status: 'REQUESTED' } }),
      prisma.operationalException.count({ where: { type: 'PAYMENT_MISMATCH', status: 'OPEN' } }),
      prisma.operationalException.count({ where: { type: 'SUPPLIER_TIMEOUT', status: 'OPEN' } }),
      prisma.operationalException.findMany({
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
        orderBy: [
          { severity: 'desc' },
          { detectedAt: 'desc' },
        ],
        take: 8,
      }),
      prisma.bookingStatusHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { booking: { select: { reference: true } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      confirmedBookingsCount,
      allBookings,
      ledgerEntries,
      pendingOutboxCount,
      openExceptionsCount,
      pendingRefundsCount,
      paymentExceptionsCount,
      supplierExceptionsCount,
      pendingExceptions,
      recentHistory,
      recentAudit,
    };
  } catch (err) {
    console.warn('[getAdminDashboardData] Database query fallback:', err);
    return {
      confirmedBookingsCount: 0,
      allBookings: [],
      ledgerEntries: [],
      pendingOutboxCount: 0,
      openExceptionsCount: 0,
      pendingRefundsCount: 0,
      paymentExceptionsCount: 0,
      supplierExceptionsCount: 0,
      pendingExceptions: [],
      recentHistory: [],
      recentAudit: [],
    };
  }
}

export async function getAdminExceptionsData() {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const exceptions = await prisma.operationalException.findMany({
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
      take: 50,
    });
    return { exceptions };
  } catch (err) {
    console.warn('[getAdminExceptionsData] Database query fallback:', err);
    return { exceptions: [] };
  }
}

export async function getAdminOpsData() {
  try {
    const user = await requirePermission('ops:override:cancel');
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);
    const cutoffTime = new Date(Date.now() - 1000 * 60 * 15);
    const [pendingEvents, stuckBookings] = await Promise.all([
      prisma.outboxEvent.findMany({
        where: { status: { in: ['PENDING', 'FAILED'] } },
        orderBy: { createdAt: 'asc' },
      }),
      db.booking.findMany({
        where: { 
          status: 'DRAFT',
          createdAt: { lt: cutoffTime },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { pendingEvents, stuckBookings };
  } catch (err) {
    console.warn('[getAdminOpsData] Database query fallback:', err);
    return { pendingEvents: [], stuckBookings: [] };
  }
}

export async function getAdminTravelFiles() {
  try {
    const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);
    const trips = await db.trip.findMany({
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
        bookings: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { trips };
  } catch (err) {
    console.warn('[getAdminTravelFiles] Database query fallback:', err);
    return { trips: [] };
  }
}

export async function getAdminTravelFileById(id: string) {
  const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const tenantCtx = await getTenantAuthContext(user.id);
  const trip = await prisma.trip.findUnique({
    where: { id },
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
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (trip) {
    assertTenantAccess(tenantCtx, {
      organizationId: trip.organizationId,
      branchId: trip.branchId,
      customerId: trip.userId,
    });
  }
  return { trip };
}

// ==================== Referral / Group Leader Admin Actions ====================

import { ReferralDomainService, LeaderDashboardRow } from '@/domains/referral/ReferralDomainService';
import { referralCodeSchema } from '@/lib/validations';

export async function getAdminReferrals(): Promise<{ success: boolean; data?: LeaderDashboardRow[]; error?: string }> {
  try {
    await requirePermission(['booking:view:all', 'finance:reports:view']);
    const data = await ReferralDomainService.getAllLeaderStats();
    return { success: true, data };
  } catch (err: unknown) {
    console.error('getAdminReferrals error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch referral dashboard' };
  }
}

export async function createReferralCodeAction(data: { code: string; leaderId: string; customTierConfig?: string }) {
  try {
    const admin = await requirePermission('ops:override:cancel');
    const parsed = referralCodeSchema.parse(data);
    const normalized = ReferralDomainService.normalizeCode(parsed.code);

    const existing = await prisma.referralCode.findUnique({
      where: { code: normalized },
    });
    if (existing) {
      return { success: false, error: 'این کد معرف قبلاً ثبت شده است' };
    }

    const created = await prisma.referralCode.create({
      data: {
        code: normalized,
        leaderId: parsed.leaderId,
        customTierConfig: data.customTierConfig || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'REFERRAL_CODE_CREATED',
        resource: 'ReferralCode',
        resourceId: created.id,
        newData: JSON.stringify(created),
        reason: 'Group leader referral code created by admin',
      },
    });

    revalidatePath('/admin/referrals');
    return { success: true, referralCode: created };
  } catch (err: unknown) {
    console.error('createReferralCodeAction error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create referral code' };
  }
}

export async function updateBookingReferralAction(bookingId: string, newCode: string, reason: string) {
  try {
    const admin = await requirePermission('ops:override:cancel');
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'ذکر دلیل تغییر کد معرف (حداقل ۵ حرف) الزامی است' };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { referral: true },
    });
    if (!booking) return { success: false, error: 'رزرو یافت نشد' };

    const validation = await ReferralDomainService.validateCode(newCode, booking.customerId);
    const oldReferralData = booking.referral ? JSON.stringify(booking.referral) : null;

    let updatedReferral;
    if (booking.referral) {
      updatedReferral = await prisma.bookingReferral.update({
        where: { bookingId },
        data: {
          referralCodeId: validation.referralCodeId || null,
          rawCode: validation.rawCode || newCode,
          status: validation.status,
          applied: validation.valid,
        },
      });
    } else {
      updatedReferral = await prisma.bookingReferral.create({
        data: {
          bookingId,
          referralCodeId: validation.referralCodeId || null,
          rawCode: validation.rawCode || newCode,
          status: validation.status,
          applied: validation.valid,
          source: 'ADMIN',
          registeredByUserId: admin.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'REFERRAL_CODE_CHANGED',
        resource: 'BookingReferral',
        resourceId: updatedReferral.id,
        oldData: oldReferralData,
        newData: JSON.stringify(updatedReferral),
        reason,
      },
    });

    revalidatePath('/admin/referrals');
    revalidatePath('/admin/bookings');
    return { success: true, updatedReferral };
  } catch (err: unknown) {
    console.error('updateBookingReferralAction error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update booking referral' };
  }
}

export async function settleLeaderRewardAction(referralCodeId: string, notes?: string) {
  try {
    const admin = await requirePermission('finance:settlement:match');
    const stats = await ReferralDomainService.calculateLeaderStats(referralCodeId);
    if (!stats) return { success: false, error: 'کد معرف یافت نشد' };

    if (stats.rewardPercent <= 0 || stats.estimatedRewardAmount <= 0) {
      return { success: false, error: 'این سرگروه هنوز به حد نصاب پاداش نرسیده است' };
    }

    const settlement = await prisma.leaderSettlement.create({
      data: {
        referralCodeId,
        qualifiedPax: stats.confirmedPax,
        rewardPercent: new Prisma.Decimal(stats.rewardPercent.toString()),
        rewardAmount: new Prisma.Decimal(stats.estimatedRewardAmount.toString()),
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: admin.id,
        notes: notes || 'تسویه پاداش سرگروه طبق نصاب مسافران تأییدشده',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'LEADER_REWARD_SETTLED',
        resource: 'LeaderSettlement',
        resourceId: settlement.id,
        newData: JSON.stringify(settlement),
        reason: `Leader reward settled for ${stats.code}: ${stats.estimatedRewardAmount.toLocaleString()} IRR`,
      },
    });

    revalidatePath('/admin/referrals');
    return { success: true, settlement };
  } catch (err: unknown) {
    console.error('settleLeaderRewardAction error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to settle leader reward' };
  }
}

export async function addTravelFileNote(tripId: string, note: string) {
  const user = await requirePermission(['booking:modify', 'ops:override:cancel']);
  const result = await TravelFileService.addNote(tripId, user.id, note);
  revalidatePath(`/admin/travel-files/${tripId}`);
  return result;
}

export async function assignTravelFileOperator(tripId: string, assignedToId: string, note?: string) {
  const user = await requirePermission(['user:manage', 'ops:override:cancel']);
  const result = await TravelFileService.assignOperator(tripId, user.id, assignedToId, note);
  revalidatePath(`/admin/travel-files/${tripId}`);
  return result;
}

export async function updateTravelFileStatus(
  tripId: string,
  status: 'PLANNING' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  reason?: string
) {
  const user = await requirePermission(['booking:modify', 'ops:override:cancel']);
  const result = await TravelFileService.updateStatus(tripId, user.id, status, reason);
  revalidatePath(`/admin/travel-files/${tripId}`);
  revalidatePath('/admin/travel-files');
  return result;
}

export async function issueTravelFileInvoice(tripId: string, bookingId: string) {
  const user = await requirePermission(['finance:post', 'ops:override:cancel']);
  const result = await TravelFileService.issueInvoice(tripId, bookingId, user.id);
  revalidatePath(`/admin/travel-files/${tripId}`);
  return result;
}

export async function triggerTravelFileRefund(
  tripId: string,
  bookingId: string,
  params: { amount?: number; penalty?: number; reason: string }
) {
  const user = await requirePermission(['booking:refund:approve', 'ops:override:cancel']);
  const result = await TravelFileService.triggerRefund(tripId, bookingId, user.id, params);
  revalidatePath(`/admin/travel-files/${tripId}`);
  return result;
}

export async function assignException(exceptionId: string, ownerId: string) {
  const user = await requirePermission(['ops:override:cancel', 'user:manage']);
  const result = await ExceptionCenterService.assignException(exceptionId, ownerId, user.id);
  revalidatePath('/admin/exceptions');
  return result;
}

export async function resolveException(exceptionId: string, resolution: string) {
  const user = await requirePermission(['ops:override:cancel', 'booking:modify']);
  const result = await ExceptionCenterService.resolveException(exceptionId, resolution, user.id);
  revalidatePath('/admin/exceptions');
  return result;
}



