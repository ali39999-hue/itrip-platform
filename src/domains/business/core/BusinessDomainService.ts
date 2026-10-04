import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { assertTransition } from '../status-contracts';
import { computeQuote, isVoucherIssuable } from '../pricing';
import { createLogger } from '@/lib/observability/logger';
import { getFiruzoCoreClient } from './InProcessFiruzoCoreClient';
import { ensureCanonicalPackagesSeeded } from './canonical-packages';
import { ensureDatabaseSchemaHealed } from '@/lib/db-schema-guard';

const log = createLogger('BusinessDomainService');

export class BusinessDomainService {
  /**
   * Single write path for the request audit trail (T0213). Appends the
   * BusinessStatusEvent row and fans the transition out to the core Outbox
   * via the FiruzoCoreClient contract (NOTIFICATION_DISPATCH), so SMS/email
   * follow-up runs on the shared Notify infrastructure.
   *
   * Inside a transaction both rows commit atomically (transactional outbox).
   * Outside a transaction the outbox fan-out is best-effort: the audit row
   * is already durable and a queue failure must not fail the mutation
   * (roadmap §9 — non-critical dependency).
   */
  private static async recordStatusTransition(
    params: {
      requestId: string;
      fromStatus: string | null;
      toStatus: string;
      note?: string;
      /** Core User.id of the acting principal (T1013 audit attribution). */
      actorId?: string | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    const request = await client.businessRequest.findUnique({
      where: { id: params.requestId },
      select: { company: { select: { repPhone: true } } },
    });

    const event = await client.businessStatusEvent.create({
      data: {
        requestId: params.requestId,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        actorId: params.actorId || null,
        note: params.note,
      },
    });

    const emit = () =>
      getFiruzoCoreClient().emitDomainEvent(
        {
          eventType: 'NOTIFICATION_DISPATCH',
          aggregateType: 'BUSINESS_REQUEST',
          aggregateId: params.requestId,
          correlationId: event.id,
          payload: {
            phone: request?.company?.repPhone || undefined,
            title: 'به‌روزرسانی وضعیت درخواست فیروزو بیزنس',
            content: params.note || `وضعیت درخواست به «${params.toStatus}» تغییر کرد.`,
            requestId: params.requestId,
            fromStatus: params.fromStatus,
            toStatus: params.toStatus,
            actorId: params.actorId || undefined,
          },
        },
        tx
      );

    if (!tx) {
      try {
        await emit();
      } catch (err) {
        log.warn('Business status outbox fan-out failed (non-blocking)', {
          requestId: params.requestId,
          statusEventId: event.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      await emit();
    }

    return event;
  }

  /**
   * List available tour packages with optional vertical, destination or goal
   * filtering. Omitting `vertical` returns every published package across
   * verticals (§36 — the catalog is the multi-vertical surface).
   */
  static async listPackages(filters?: {
    goal?: string;
    destination?: string;
    vertical?: string;
  }) {
    await ensureCanonicalPackagesSeeded().catch(() => {});

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
    };

    if (filters?.destination) {
      where.destination = { contains: filters.destination, mode: 'insensitive' };
    }

    if (filters?.vertical) {
      where.vertical = filters.vertical;
    }

    const packages = await prisma.businessTourPackage.findMany({
      where,
      include: {
        departures: {
          where: { departDate: { gte: new Date() } },
          orderBy: { departDate: 'asc' },
        },
        addons: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return packages.map((pkg) => {
      const nearest = pkg.departures[0];
      return {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        titleEn: pkg.titleEn,
        destination: pkg.destination,
        durationDays: pkg.durationDays,
        basePriceRial: pkg.basePrice,
        vertical: pkg.vertical,
        nearestDepartureDate: nearest ? nearest.departDate.toISOString() : null,
        imageUrl: null,
      };
    });
  }

  /**
   * Get single tour package by slug
   */
  static async getPackageBySlug(slug: string) {
    await ensureCanonicalPackagesSeeded().catch(() => {});

    const pkg = await prisma.businessTourPackage.findUnique({
      where: { slug },
      include: {
        departures: {
          orderBy: { departDate: 'asc' },
        },
        addons: true,
      },
    });

    if (!pkg) return null;

    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      titleEn: pkg.titleEn,
      destination: pkg.destination,
      durationDays: pkg.durationDays,
      basePriceRial: pkg.basePrice,
      summary:
        'برنامه‌ای برای بازرگانان و فعالان: بازدید نمایشگاه، بازار تخصصی و جلسات B2B هماهنگ‌شده با مترجم گروهی.',
      itinerary: [
        'پرواز تهران، ترانسفر فرودگاهی و استقرار در هتل، جلسه توجیهی گروه.',
        'بازدید نمایشگاه با مترجم گروهی، ثبت لیست تامین‌کنندگان هدف.',
        'ادامه نمایشگاه و جلسات B2B از پیش هماهنگ‌شده در غرفه‌ها.',
        'بازار تخصصی و بررسی نمونه و قیمت‌گیری.',
        'بازدید کارخانه تولیدکننده منتخب و گفت‌وگو درباره تولید سفارشی.',
        'نهایی‌سازی مذاکرات با حضور مترجم و مشاور حقوقی، هماهنگی بازرسی کالا.',
        'زمان آزاد، ترانسفر به فرودگاه و پرواز بازگشت.',
      ],
      includes: pkg.includes,
      requiredDocs: pkg.requiredDocs,
      departures: pkg.departures.map((d) => ({
        id: d.id,
        departDate: d.departDate.toISOString(),
        returnDate: d.returnDate.toISOString(),
        capacity: d.capacity,
        bookedCount: d.bookedCount,
      })),
      addons: pkg.addons.map((a) => ({
        id: a.id,
        code: a.code,
        title: a.title,
        priceRial: a.price,
        unit: a.unit as 'per_person' | 'per_group',
      })),
    };
  }

  /**
   * Create a new draft request
   */
  static async createDraftRequest(params: {
    packageId: string;
    departureId: string;
    paxCount: number;
    addonIds?: string[];
    companyName?: string;
    nationalId?: string;
    repName?: string;
    repPhone?: string;
    field?: string;
    /** Core User.id of the authenticated creator; null for guest requests. */
    createdById?: string | null;
  }) {
    await ensureDatabaseSchemaHealed().catch(() => {});

    const departure = await prisma.businessDeparture.findUnique({
      where: { id: params.departureId },
      include: { package: true },
    });

    if (!departure) {
      throw new Error('DEPARTURE_NOT_FOUND');
    }

    if (departure.capacity - departure.bookedCount < params.paxCount) {
      const err = new Error('Capacity full for chosen departure');
      (err as unknown as { code: string }).code = 'capacity_full';
      throw err;
    }

    // Upsert company or create placeholder
    const nationalId = params.nationalId || `temp_${Date.now()}`;
    const company = await prisma.businessCompany.upsert({
      where: { nationalId },
      update: {
        name: params.companyName || 'شرکت در انتظار ثبت',
        repName: params.repName || 'نماینده شرکت',
        repPhone: params.repPhone || '09000000000',
        field: params.field || 'Technology',
      },
      create: {
        name: params.companyName || 'شرکت در انتظار ثبت',
        nationalId,
        repName: params.repName || 'نماینده شرکت',
        repPhone: params.repPhone || '09000000000',
        field: params.field || 'Technology',
      },
    });

    // Generate unique code FZB-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await prisma.businessRequest.count();
    const seq = String(count + 1).padStart(4, '0');
    const code = `FZB-${year}-${seq}`;

    // Calculate initial quote
    const addons = params.addonIds?.length
      ? await prisma.businessAddon.findMany({ where: { id: { in: params.addonIds } } })
      : [];

    const quote = computeQuote({
      basePrice: departure.package.basePrice,
      paxCount: params.paxCount,
      addons: addons.map((a) => ({ price: a.price, quantity: 1, unit: a.unit as 'per_person' | 'per_group' })),
    });

    const request = await prisma.businessRequest.create({
      data: {
        code,
        companyId: company.id,
        departureId: departure.id,
        paxCount: params.paxCount,
        status: 'draft',
        totalAmount: quote.totalAmount,
        depositAmount: quote.depositAmount,
        createdById: params.createdById || null,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48h hold
        addons: {
          create: addons.map((a) => ({
            addonId: a.id,
            price: a.price,
            quantity: 1,
          })),
        },
      },
    });

    await this.recordStatusTransition({
      requestId: request.id,
      fromStatus: null,
      toStatus: 'draft',
      note: 'درخواست ایجاد شد (پیش‌نویس)',
    });

    return request;
  }

  /**
   * Update draft request details (autosave)
   */
  static async updateDraftRequest(
    id: string,
    data: {
      company?: {
        name?: string;
        nationalId?: string;
        economicCode?: string;
        field?: string;
        repName?: string;
        repPhone?: string;
      };
      travelers?: Array<{
        fullNameLatin: string;
        passportNo: string;
        passportExpiry: string;
        birthDate?: string;
      }>;
      note?: string;
    }
  ) {
    const request = await prisma.businessRequest.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!request) throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'draft') {
      const err = new Error('Only draft requests can be edited');
      (err as unknown as { code: string }).code = 'invalid_transition';
      throw err;
    }

    if (data.company) {
      const targetNationalId = data.company.nationalId;
      if (targetNationalId) {
        const existingCompany = await prisma.businessCompany.findUnique({
          where: { nationalId: targetNationalId },
        });

        if (existingCompany && existingCompany.id !== request.companyId) {
          // Link request to existing company and update it
          await prisma.businessRequest.update({
            where: { id },
            data: { companyId: existingCompany.id },
          });
          await prisma.businessCompany.update({
            where: { id: existingCompany.id },
            data: {
              ...(data.company.name ? { name: data.company.name } : {}),
              ...(data.company.economicCode !== undefined ? { economicCode: data.company.economicCode } : {}),
              ...(data.company.field ? { field: data.company.field } : {}),
              ...(data.company.repName ? { repName: data.company.repName } : {}),
              ...(data.company.repPhone ? { repPhone: data.company.repPhone } : {}),
            },
          });
          // Clean up temp company if this request was its only user
          if (request.company.nationalId.startsWith('temp_')) {
            await prisma.businessCompany.delete({ where: { id: request.companyId } }).catch(() => {});
          }
        } else {
          await prisma.businessCompany.update({
            where: { id: request.companyId },
            data: {
              ...(data.company.name ? { name: data.company.name } : {}),
              ...(data.company.nationalId ? { nationalId: data.company.nationalId } : {}),
              ...(data.company.economicCode !== undefined ? { economicCode: data.company.economicCode } : {}),
              ...(data.company.field ? { field: data.company.field } : {}),
              ...(data.company.repName ? { repName: data.company.repName } : {}),
              ...(data.company.repPhone ? { repPhone: data.company.repPhone } : {}),
            },
          });
        }
      } else {
        await prisma.businessCompany.update({
          where: { id: request.companyId },
          data: {
            ...(data.company.name ? { name: data.company.name } : {}),
            ...(data.company.economicCode !== undefined ? { economicCode: data.company.economicCode } : {}),
            ...(data.company.field ? { field: data.company.field } : {}),
            ...(data.company.repName ? { repName: data.company.repName } : {}),
            ...(data.company.repPhone ? { repPhone: data.company.repPhone } : {}),
          },
        });
      }
    }

    if (data.travelers && data.travelers.length > 0) {
      await prisma.businessTraveler.deleteMany({ where: { requestId: id } });
      await prisma.businessTraveler.createMany({
        data: data.travelers.map((t) => ({
          requestId: id,
          fullNameLatin: t.fullNameLatin,
          passportNo: t.passportNo,
          passportExpiry: new Date(t.passportExpiry),
          birthDate: t.birthDate ? new Date(t.birthDate) : null,
        })),
      });
    }

    if (data.note !== undefined) {
      await prisma.businessRequest.update({
        where: { id },
        data: { note: data.note },
      });
    }

    return this.getRequestDetail(id);
  }

  /**
   * Submit request: locks quote, moves draft -> submitted
   */
  static async submitRequest(id: string, options?: { termsAccepted?: boolean; idempotencyKey?: string }) {
    const request = await prisma.businessRequest.findUnique({
      where: { id },
      include: {
        departure: { include: { package: true } },
        addons: { include: { addon: true } },
        travelers: true,
      },
    });

    if (!request) throw new Error('REQUEST_NOT_FOUND');

    if (request.status === 'submitted') {
      return this.getRequestDetail(id); // Idempotent repeat
    }

    assertTransition(request.status, 'submitted');

    // Recalculate & lock quote
    const quote = computeQuote({
      basePrice: request.departure.package.basePrice,
      paxCount: request.paxCount,
      addons: request.addons.map((a) => ({
        price: a.price,
        quantity: a.quantity,
        unit: a.addon.unit as 'per_person' | 'per_group',
      })),
    });

    await prisma.businessRequest.update({
      where: { id },
      data: {
        status: 'submitted',
        totalAmount: quote.totalAmount,
        depositAmount: quote.depositAmount,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48h hold
      },
    });

    await this.recordStatusTransition({
      requestId: id,
      fromStatus: request.status,
      toStatus: 'submitted',
      note: 'درخواست رسماً ارسال شد و مبالغ قفل گردید',
    });

    log.info('Business request submitted and locked', {
      requestId: id,
      code: request.code,
      idempotencyKey: options?.idempotencyKey,
      termsAccepted: options?.termsAccepted,
    });
    return this.getRequestDetail(id);
  }

  /**
   * Process payment (deposit or settlement)
   */
  static async processPayment(params: {
    requestId: string;
    kind: 'deposit' | 'settlement';
    method: string;
    idempotencyKey?: string;
  }) {
    const request = await prisma.businessRequest.findUnique({
      where: { id: params.requestId },
      include: { departure: true },
    });

    if (!request) throw new Error('REQUEST_NOT_FOUND');

    if (params.kind === 'deposit') {
      if (request.status !== 'submitted') {
        const err = new Error('Deposit is only allowed in submitted status');
        (err as unknown as { code: string }).code = 'invalid_transition';
        throw err;
      }
    } else {
      if (request.status !== 'approved') {
        const err = new Error('Settlement is only allowed in approved status');
        (err as unknown as { code: string }).code = 'invalid_transition';
        throw err;
      }
    }

    const amount =
      params.kind === 'deposit'
        ? request.depositAmount
        : request.totalAmount - request.depositAmount - request.grantAmount;

    // Create payment record
    await prisma.businessPayment.create({
      data: {
        requestId: params.requestId,
        kind: params.kind,
        method: params.method,
        amount,
        status: 'paid', // Demo/Instant settlement
        idempotencyKey: params.idempotencyKey || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        paidAt: new Date(),
        gatewayRef: `GW-${Date.now()}`,
      },
    });

    // Handle state transitions
    if (params.kind === 'deposit') {
      // Transition: submitted -> deposit_paid -> under_review
      assertTransition('submitted', 'deposit_paid');
      assertTransition('deposit_paid', 'under_review');

      await prisma.$transaction(async (tx) => {
        await tx.businessRequest.update({
          where: { id: params.requestId },
          data: {
            status: 'under_review',
            paidAmount: request.paidAmount + amount,
          },
        });
        await tx.businessDeparture.update({
          where: { id: request.departureId },
          data: { bookedCount: { increment: request.paxCount } },
        });
        await this.recordStatusTransition(
          {
            requestId: params.requestId,
            fromStatus: 'submitted',
            toStatus: 'deposit_paid',
            note: 'پیش‌پرداخت دریافت شد',
          },
          tx
        );
        await this.recordStatusTransition(
          {
            requestId: params.requestId,
            fromStatus: 'deposit_paid',
            toStatus: 'under_review',
            note: 'پرونده وارد مرحله بررسی کارشناس شد',
          },
          tx
        );
      });
    } else {
      // Settlement paid -> check if voucher issuable -> transition to issued
      const newPaid = request.paidAmount + amount;
      const canIssue = isVoucherIssuable({
        totalAmount: request.totalAmount,
        grantAmount: request.grantAmount,
        paidAmount: newPaid,
      });

      if (canIssue) {
        assertTransition('approved', 'issued');

        const voucherCode = `VCH-${request.code}-${Date.now().toString(36).toUpperCase()}`;
        const qrPayload = JSON.stringify({
          code: voucherCode,
          request: request.code,
          pax: request.paxCount,
          verified: true,
        });

        await prisma.$transaction(async (tx) => {
          await tx.businessRequest.update({
            where: { id: params.requestId },
            data: {
              status: 'issued',
              paidAmount: newPaid,
            },
          });
          await tx.businessVoucher.create({
            data: {
              requestId: params.requestId,
              code: voucherCode,
              qrPayload,
            },
          });
          await this.recordStatusTransition(
            {
              requestId: params.requestId,
              fromStatus: 'approved',
              toStatus: 'issued',
              note: 'تسویه نهایی انجام شد و ووچر صادر گردید',
            },
            tx
          );
        });
      }
    }

    return this.getRequestDetail(params.requestId);
  }

  /**
   * Re-submit after changes_requested (user re-uploaded rejected documents)
   */
  static async resubmitAfterChanges(requestId: string, note?: string) {
    const request = await prisma.businessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('REQUEST_NOT_FOUND');

    assertTransition(request.status, 'under_review');

    await prisma.businessRequest.update({
      where: { id: requestId },
      data: { status: 'under_review' },
    });

    await this.recordStatusTransition({
      requestId,
      fromStatus: request.status,
      toStatus: 'under_review',
      note: note || 'مدارک اصلاح‌شده بارگذاری و جهت بررسی مجدد ارسال گردید',
    });

    return this.getRequestDetail(requestId);
  }

  /**
   * Agent review decision
   */
  static async reviewRequest(params: {
    requestId: string;
    decision: 'approve' | 'request_changes';
    docResults?: Array<{ id: string; state: 'approved' | 'rejected'; reason?: string }>;
    note?: string;
    /** Core User.id of the reviewing agent (T1013 audit attribution). */
    actorId?: string | null;
  }) {
    const request = await prisma.businessRequest.findUnique({
      where: { id: params.requestId },
      include: { documents: true },
    });

    if (!request) throw new Error('REQUEST_NOT_FOUND');

    const nextStatus = params.decision === 'approve' ? 'approved' : 'changes_requested';
    assertTransition(request.status, nextStatus);

    if (params.docResults && params.docResults.length > 0) {
      for (const doc of params.docResults) {
        await prisma.businessDocument.update({
          where: { id: doc.id },
          data: {
            state: doc.state,
            rejectReason: doc.reason || null,
            reviewedAt: new Date(),
          },
        });
      }
    }

    await prisma.businessRequest.update({
      where: { id: params.requestId },
      data: { status: nextStatus },
    });

    await this.recordStatusTransition({
      requestId: params.requestId,
      fromStatus: request.status,
      toStatus: nextStatus,
      note: params.note || (nextStatus === 'approved' ? 'تایید مدارک توسط کارشناس' : 'درخواست اصلاح مدارک'),
      actorId: params.actorId,
    });

    return this.getRequestDetail(params.requestId);
  }

  /**
   * Set government grant amount
   */
  static async applyGrant(
    requestId: string,
    grantAmountRial: number,
    actorId?: string | null
  ) {
    const request = await prisma.businessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('REQUEST_NOT_FOUND');

    await prisma.businessRequest.update({
      where: { id: requestId },
      data: { grantAmount: grantAmountRial },
    });

    await this.recordStatusTransition({
      requestId,
      fromStatus: request.status,
      toStatus: request.status,
      note: `کمک‌هزینه دولتی به مبلغ ${grantAmountRial} ریال اعمال شد`,
      actorId,
    });

    return this.getRequestDetail(requestId);
  }

  /**
   * Minimal ownership projection for object-level route guards (T0804).
   */
  static async getRequestOwnership(
    id: string
  ): Promise<{ createdById: string | null } | null> {
    await ensureDatabaseSchemaHealed().catch(() => {});
    return prisma.businessRequest.findUnique({
      where: { id },
      select: { createdById: true },
    });
  }

  /**
   * Fetch full request details
   */
  static async getRequestDetail(id: string) {
    await ensureDatabaseSchemaHealed().catch(() => {});
    const req = await prisma.businessRequest.findUnique({
      where: { id },
      include: {
        company: true,
        departure: { include: { package: true } },
        travelers: true,
        documents: true,
        payments: true,
        vouchers: true,
        statusEvents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!req) return null;

    // Timeline synthesis
    const timeline = [
      {
        title: 'ثبت اطلاعات و ارسال',
        state: req.status !== 'draft' ? ('done' as const) : ('doing' as const),
      },
      {
        title: 'پرداخت پیش‌پرداخت',
        state:
          ['deposit_paid', 'under_review', 'changes_requested', 'approved', 'issued'].includes(req.status)
            ? ('done' as const)
            : req.status === 'submitted'
            ? ('doing' as const)
            : ('waiting' as const),
      },
      {
        title: 'بررسی مدارک و مصاحبه',
        state: ['approved', 'issued'].includes(req.status)
          ? ('done' as const)
          : ['under_review', 'changes_requested'].includes(req.status)
          ? ('doing' as const)
          : ('waiting' as const),
      },
      {
        title: 'تسویه حساب نهایی',
        state: req.status === 'issued' ? ('done' as const) : req.status === 'approved' ? ('doing' as const) : ('waiting' as const),
      },
      {
        title: 'صدور ووچر',
        state: req.status === 'issued' ? ('done' as const) : ('waiting' as const),
      },
    ];

    return {
      id: req.id,
      code: req.code,
      status: req.status,
      packageTitle: req.departure.package.title,
      departureDate: req.departure.departDate.toISOString(),
      returnDate: req.departure.returnDate.toISOString(),
      paxCount: req.paxCount,
      travelers: req.travelers.map((t) => ({
        id: t.id,
        fullNameLatin: t.fullNameLatin,
        passportNo: t.passportNo,
        passportExpiry: t.passportExpiry.toISOString(),
        birthDate: t.birthDate?.toISOString(),
      })),
      documents: req.documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.originalName || d.type,
        state: d.state,
        rejectReason: d.rejectReason,
      })),
      totalAmountRial: req.totalAmount,
      depositAmountRial: req.depositAmount,
      grantAmountRial: req.grantAmount,
      grantPending: req.grantAmount === 0,
      paidAmountRial: req.paidAmount,
      expiresAt: req.expiresAt?.toISOString() || null,
      vouchers: req.vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        qrPayload: v.qrPayload,
      })),
      timeline,
    };
  }
}
