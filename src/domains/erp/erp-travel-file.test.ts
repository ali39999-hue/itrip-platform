import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { TravelFileService } from './TravelFileService';
import { ExceptionCenterService } from './ExceptionCenterService';
import { DocumentManagementService } from './DocumentManagementService';
import { maskTravelerData } from '@/lib/security/pii-masking';

describe('Wave 12: ERP Travel File & Operations Workspace (ERP-101 to ERP-109)', () => {
  const suffix = `erp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId: string;
  let testTripId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `travel_erp_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'رضا کمالی',
        nationalId: '0012345678',
        passportNo: 'A12345678',
      },
    });
    testUserId = user.id;

    const trip = await prisma.trip.create({
      data: {
        reference: `TRP-${suffix.toUpperCase()}`,
        userId: testUserId,
        title: 'سفر تفریحی استانبول تابستان',
        status: 'BOOKED',
        startDate: '2026-09-15',
        endDate: '2026-09-22',
      },
    });
    testTripId = trip.id;

    const booking = await prisma.booking.create({
      data: {
        reference: `BKG-${suffix.toUpperCase()}`,
        tripId: testTripId,
        customerId: testUserId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        ticketStatus: 'ISSUED',
        totalAmount: 125000000,
        currency: 'IRR',
        travelDate: '2026-09-15',
      },
    });
    testBookingId = booking.id;

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: testBookingId,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'CONFIRMED',
        actor: 'PAYMENT_GATEWAY',
        reason: 'Payment verified successfully via Shetab',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: testBookingId,
        idempotencyKey: `pay_${suffix}`,
        method: 'SHETAB_SAMAN',
        gatewayRef: `REF-${suffix}`,
        amount: 125000000,
        currency: 'IRR',
        status: 'SUCCESS',
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${suffix.toUpperCase()}`,
        bookingId: testBookingId,
        customerId: testUserId,
        totalAmount: 125000000,
        netAmount: 114678899,
        taxAmount: 10321101,
        currency: 'IRR',
        status: 'PAID',
      },
    });

    await prisma.operationalException.create({
      data: {
        type: 'TICKET_NOT_ISSUED',
        severity: 'HIGH',
        entityType: 'BOOKING',
        entityId: testBookingId,
        title: 'تاخیر در صدور بلیت از ایرلاین ماهان',
        status: 'OPEN',
        slaDueAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins remaining
      },
    });
  });

  afterAll(async () => {
    await prisma.operationalException.deleteMany({ where: { entityId: testBookingId } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { bookingId: testBookingId } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { bookingId: testBookingId } }).catch(() => {});
    await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBookingId } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { id: testBookingId } }).catch(() => {});
    await prisma.trip.deleteMany({ where: { id: testTripId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
  });

  it('ERP-101 & ERP-103: getTravelFile returns consolidated workspace with customer, bookings, payments, and SLA status', async () => {
    const travelFile = await TravelFileService.getTravelFile(testTripId, {
      userId: testUserId,
      permissions: ['booking:view:all'],
    });

    expect(travelFile.trip.id).toBe(testTripId);
    expect(travelFile.bookings.length).toBe(1);
    expect(travelFile.bookings[0].id).toBe(testBookingId);
    expect(travelFile.payments.length).toBe(1);
    expect(travelFile.invoices.length).toBe(1);
    expect(travelFile.exceptions.length).toBe(1);
    expect(travelFile.exceptions[0].type).toBe('TICKET_NOT_ISSUED');
    expect(travelFile.exceptions[0].slaStatus).toBe('APPROACHING_BREACH');
    expect(travelFile.summary.totalPaidAmount).toBe(125000000);
    expect(travelFile.summary.balanceDue).toBe(0);
  });

  it('ERP-102: addNote, assignOperator, and updateStatus record auditable actions', async () => {
    const noteRes = await TravelFileService.addNote(testTripId, testUserId, 'تماس با مسافر برقرار شد؛ تایید تاریخ دریافت گردید.');
    expect(noteRes.success).toBe(true);

    const assignRes = await TravelFileService.assignOperator(testTripId, testUserId, testUserId, 'محول به کارشناس');
    expect(assignRes.success).toBe(true);

    const statusRes = await TravelFileService.updateStatus(testTripId, testUserId, 'IN_PROGRESS');
    expect(statusRes.success).toBe(true);
    expect(statusRes.status).toBe('IN_PROGRESS');

    const updated = await prisma.trip.findUnique({ where: { id: testTripId } });
    expect(updated?.status).toBe('IN_PROGRESS');
  });

  it('ERP-104: ExceptionCenterService groups queues and enables operator triage', async () => {
    const exceptions = await ExceptionCenterService.getExceptions({ status: 'OPEN' });
    expect(Array.isArray(exceptions)).toBe(true);

    const found = exceptions.find((e) => e.entityId === testBookingId);
    expect(found).toBeDefined();

    const stats = await ExceptionCenterService.getExceptionStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);

    const resolved = await ExceptionCenterService.resolveException(
      found!.id,
      testUserId,
      'Resolved via direct airline re-issue'
    );
    expect(resolved.status).toBe('RESOLVED');
  });

  it('ERP-108: DocumentManagementService generates encrypted tokens and authorized signed retrieval URLs', async () => {
    const profile = await prisma.travelerProfile.create({
      data: {
        userId: testUserId,
        firstName: 'رضا',
        lastName: 'کمالی',
      },
    });

    const storeRes = await DocumentManagementService.storeDocument({
      travelerProfileId: profile.id,
      type: 'PASSPORT',
      documentNumber: 'A12345678',
      holderName: 'Reza Kamali',
      operatorId: testUserId,
      fileContent: Buffer.from('RAW_PASSPORT_IMAGE_BYTES_PAYLOAD'),
      contentType: 'image/jpeg',
    });

    expect(storeRes.documentId).toBeDefined();

    const signedUrlRes = DocumentManagementService.generateSignedRetrievalUrl({
      documentId: storeRes.documentId,
      userId: testUserId,
      ttlSeconds: 15 * 60,
    });

    expect(signedUrlRes.signedUrl).toContain('/api/admin/documents/');
    expect(signedUrlRes.signedUrl).toContain('token=');

    const verified = DocumentManagementService.verifySignedRetrievalToken(signedUrlRes.token);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.documentId).toBe(storeRes.documentId);
  });

  it('ERP-109: Sensitive traveler data is masked unless caller has traveler:pii:view permission', () => {
    const rawUser = {
      id: 'usr_1',
      name: 'سارا احمدی',
      phone: '+989123456789',
      nationalId: '0012345678',
      passportNo: 'A12345678',
      role: 'CUSTOMER',
    };

    // Unprivileged caller
    const masked = maskTravelerData(rawUser, false);
    expect(masked.nationalId).toBe('001****678');
    expect(masked.passportNo).toBe('A12****78');
    expect(masked.phone).toBe('+9891****789');

    // Privileged caller (holds traveler:pii:view)
    const unmasked = maskTravelerData(rawUser, true);
    expect(unmasked.nationalId).toBe('0012345678');
    expect(unmasked.passportNo).toBe('A12345678');
    expect(unmasked.phone).toBe('+989123456789');
  });
});
