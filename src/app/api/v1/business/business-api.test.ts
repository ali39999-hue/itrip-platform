import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

describe('Business API & Journey Integration Suite', () => {
  const suffix = `api_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let testPackageId: string;
  let testDepartureId: string;
  let testRequestId: string;

  beforeAll(async () => {
    // Ensure test package and departure exist in the test database
    // Base price set to 500,000,000 Rial (50M Toman) so 2 pax total is 1B Rial (fits int4)
    const pkg = await prisma.businessTourPackage.upsert({
      where: { slug: `canton-fair-${suffix}` },
      update: {},
      create: {
        slug: `canton-fair-${suffix}`,
        title: 'نمایشگاه کانتون فر + بازار موبایل گوانگژو',
        titleEn: 'Canton Fair & Guangzhou Electronics Market',
        destination: 'گوانگژو، چین',
        durationDays: 7,
        basePrice: 500_000_000,
        includes: ['هتل', 'پرواز'],
        requiredDocs: ['پاسپورت'],
        status: 'PUBLISHED',
        departures: {
          create: [
            {
              departDate: new Date('2026-10-20T00:00:00Z'),
              returnDate: new Date('2026-10-27T00:00:00Z'),
              capacity: 30,
              bookedCount: 0,
            },
          ],
        },
        addons: {
          create: [
            {
              code: `add_${suffix}`,
              title: 'مترجم اختصاصی',
              price: 120_000_000,
              unit: 'per_group',
            },
          ],
        },
      },
      include: { departures: true },
    });

    testPackageId = pkg.id;
    testDepartureId = pkg.departures[0].id;
  });

  afterAll(async () => {
    // Outbox fan-out rows produced by recordStatusTransition must be cleaned so
    // parallel suites (outbox consumer tests) are not starved by our events.
    await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'BUSINESS_REQUEST' } });
    if (testRequestId) {
      await prisma.businessVoucher.deleteMany({ where: { requestId: testRequestId } });
      await prisma.businessPayment.deleteMany({ where: { requestId: testRequestId } });
      await prisma.businessStatusEvent.deleteMany({ where: { requestId: testRequestId } });
      await prisma.businessTraveler.deleteMany({ where: { requestId: testRequestId } });
      await prisma.businessRequestAddon.deleteMany({ where: { requestId: testRequestId } });
      await prisma.businessRequest.deleteMany({ where: { id: testRequestId } });
    }
    if (testPackageId) {
      await prisma.businessAddon.deleteMany({ where: { packageId: testPackageId } });
      await prisma.businessDeparture.deleteMany({ where: { packageId: testPackageId } });
      await prisma.businessTourPackage.deleteMany({ where: { id: testPackageId } });
    }
    await prisma.businessCompany.deleteMany({ where: { name: `شرکت آزمایشی ${suffix}` } });
  });

  it('1. packages catalog returns tour packages', async () => {
    const packages = await BusinessDomainService.listPackages();
    expect(packages.length).toBeGreaterThanOrEqual(1);

    const pkg = await BusinessDomainService.getPackageBySlug(`canton-fair-${suffix}`);
    expect(pkg).not.toBeNull();
    expect(pkg!.title).toContain('کانتون');
    expect(pkg!.departures.length).toBe(1);
    expect(pkg!.addons.length).toBe(1);
  });

  it('2. creates draft request with initial quote and 48h expiry hold', async () => {
    const draft = await BusinessDomainService.createDraftRequest({
      packageId: testPackageId,
      departureId: testDepartureId,
      paxCount: 2,
      companyName: `شرکت آزمایشی ${suffix}`,
      nationalId: `10100${suffix}`.slice(0, 11),
      repName: 'مدیر عامل',
      repPhone: '09121111111',
      field: 'الکترونیک',
    });

    expect(draft.status).toBe('draft');
    expect(draft.code).toMatch(/^FZB-\d{4}-\d{4}$/);
    expect(draft.paxCount).toBe(2);
    expect(draft.totalAmount).toBeGreaterThan(0);
    expect(draft.depositAmount).toBe(Math.trunc((draft.totalAmount * 30) / 100));
    expect(draft.expiresAt).not.toBeNull();

    testRequestId = draft.id;
  });

  it('3. autosaves draft with travelers and company updates', async () => {
    const updated = await BusinessDomainService.updateDraftRequest(testRequestId, {
      company: {
        economicCode: '4111222333',
      },
      travelers: [
        {
          fullNameLatin: 'Ali Rezaei',
          passportNo: 'A12345678',
          passportExpiry: '2028-05-15',
        },
        {
          fullNameLatin: 'Sara Tehrani',
          passportNo: 'A87654321',
          passportExpiry: '2028-08-20',
        },
      ],
      note: 'نیاز به هتل نزدیک مترو',
    });

    expect(updated).not.toBeNull();
    expect(updated!.travelers.length).toBe(2);
    expect(updated!.travelers[0].fullNameLatin).toBe('Ali Rezaei');
  });

  it('4. submits request, locks amounts and transitions to submitted', async () => {
    const submitted = await BusinessDomainService.submitRequest(testRequestId, {
      termsAccepted: true,
      idempotencyKey: `sub_${suffix}`,
    });

    expect(submitted!.status).toBe('submitted');
    expect(submitted!.timeline[0].state).toBe('done');
    expect(submitted!.timeline[1].state).toBe('doing');
  });

  it('5. prevents double-submission or invalid transition jump', async () => {
    // Idempotent repeat returns submitted state
    const repeat = await BusinessDomainService.submitRequest(testRequestId);
    expect(repeat!.status).toBe('submitted');

    // Attempting direct settlement before approved throws 409 invalid_transition
    await expect(
      BusinessDomainService.processPayment({
        requestId: testRequestId,
        kind: 'settlement',
        method: 'online',
      })
    ).rejects.toThrow();
  });

  it('6. processes deposit payment, increments booked count and transitions to under_review', async () => {
    const depBefore = await prisma.businessDeparture.findUnique({
      where: { id: testDepartureId },
    });
    const initialBooked = depBefore!.bookedCount;

    const afterDeposit = await BusinessDomainService.processPayment({
      requestId: testRequestId,
      kind: 'deposit',
      method: 'ecardo',
      idempotencyKey: `dep_pay_${suffix}`,
    });

    expect(afterDeposit!.status).toBe('under_review');
    expect(afterDeposit!.paidAmountRial).toBe(afterDeposit!.depositAmountRial);

    const depAfter = await prisma.businessDeparture.findUnique({
      where: { id: testDepartureId },
    });
    expect(depAfter!.bookedCount).toBe(initialBooked + 2);
  });

  it('7. allows agent to request document changes and then approve after resubmission', async () => {
    // 1. Agent requests changes: under_review -> changes_requested
    const changesReq = await BusinessDomainService.reviewRequest({
      requestId: testRequestId,
      decision: 'request_changes',
      note: 'تصویر کارت بازرگانی ناخوانا است',
    });
    expect(changesReq!.status).toBe('changes_requested');

    // 2. User re-submits corrected documents: changes_requested -> under_review
    const resubmitted = await BusinessDomainService.resubmitAfterChanges(
      testRequestId,
      'بارگذاری مجدد کارت بازرگانی با کیفیت بالا'
    );
    expect(resubmitted!.status).toBe('under_review');

    // 3. Agent reviews again and approves: under_review -> approved
    const approved = await BusinessDomainService.reviewRequest({
      requestId: testRequestId,
      decision: 'approve',
      note: 'مدارک تکمیلی تایید شد',
    });
    expect(approved!.status).toBe('approved');
  });

  it('8. applies government grant deduction', async () => {
    const withGrant = await BusinessDomainService.applyGrant(testRequestId, 50_000_000);
    expect(withGrant!.grantAmountRial).toBe(50_000_000);
    expect(withGrant!.grantPending).toBe(false);
  });

  it('9. processes final settlement and issues vouchers with QR payload', async () => {
    const finalReq = await BusinessDomainService.processPayment({
      requestId: testRequestId,
      kind: 'settlement',
      method: 'online',
      idempotencyKey: `settle_pay_${suffix}`,
    });

    expect(finalReq!.status).toBe('issued');
    expect(finalReq!.vouchers.length).toBeGreaterThan(0);
    expect(finalReq!.vouchers[0].qrPayload).toContain('VCH-');

    // Public verification endpoint
    const voucher = await prisma.businessVoucher.findUnique({
      where: { code: finalReq!.vouchers[0].code },
    });
    expect(voucher).not.toBeNull();
    expect(voucher!.code).toBe(finalReq!.vouchers[0].code);
  });
});
