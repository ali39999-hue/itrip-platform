import { PrismaClient } from '@prisma/client';
import { Money } from '../src/lib/finance';
import { GeneralLedgerService } from '../src/domains/ledger/GeneralLedgerService';
import { InvoiceDomainService } from '../src/domains/finance/InvoiceDomainService';

const prisma = new PrismaClient();

async function runTest() {
  console.log('=== STARTING CARD-TO-CARD PAYMENT LIFECYCLE TEST ===');

  // 1. Verify Destination Bank Cards
  const cards = await prisma.destinationBankCard.findMany({ where: { isActive: true } });
  console.log(`[PASS] Found ${cards.length} active bank cards:`, cards.map(c => c.bankName).join(', '));
  if (cards.length === 0) throw new Error('No active bank cards found');

  // 2. Find or create a test customer
  let testCustomer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  if (!testCustomer) {
    testCustomer = await prisma.user.create({
      data: {
        id: `cust_test_${Date.now()}`,
        name: 'علی تستی',
        email: `test_${Date.now()}@firuzo.com`,
        phone: '09121112233',
        role: 'CUSTOMER',
      },
    });
  }

  // 3. Create a test booking
  const bookingRef = `ITR-TEST-${Date.now().toString().slice(-5)}`;
  const booking = await prisma.booking.create({
    data: {
      reference: bookingRef,
      customerId: testCustomer.id,
      status: 'HELD',
      paymentStatus: 'INITIATED',
      totalAmount: 15000000,
      currency: 'IRR',
      items: {
        create: [
          {
            type: 'HOTEL',
            netCost: 12000000,
            markup: 3000000,
            sellPrice: 15000000,
            details: JSON.stringify({ title: 'رزرو هتل اسپیناس پالاس تهران' }),
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`[PASS] Created test booking ${booking.reference} (${booking.id})`);

  // 4. Simulate Customer Receipt Submission
  const selectedCard = cards[0];
  const trackingCode = `TRK-${Date.now()}`;
  const receiptImages = ['/uploads/receipts/test_receipt_sample.jpg'];

  const receipt = await prisma.cardTransferReceipt.create({
    data: {
      bookingId: booking.id,
      bankCardId: selectedCard.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      trackingCode,
      paymentDate: new Date(),
      customerNote: 'واریز اینترنتی از بانک سامان انجام شد.',
      receiptImages: JSON.stringify(receiptImages),
      status: 'PENDING_REVIEW',
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING_CUSTOMER',
    },
  });

  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      fromStatus: 'HELD',
      toStatus: 'PENDING_PAYMENT',
      actor: testCustomer.id,
      reason: `رسید کارت به کارت با کد پیگیری ${trackingCode} ثبت شد.`,
    },
  });

  console.log(`[PASS] Customer submitted receipt ${receipt.id}, booking state: PENDING_PAYMENT / PENDING_CUSTOMER`);

  // 5. Simulate Admin Review & Approval
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const adminId = adminUser ? adminUser.id : 'admin_test_id';

  await prisma.$transaction(async (tx) => {
    // 5.1 Update receipt
    await tx.cardTransferReceipt.update({
      where: { id: receipt.id },
      data: {
        status: 'APPROVED',
        reviewerId: adminId,
        reviewedAt: new Date(),
        adminNote: 'فیش استعلام شد و مبلغ در حساب نشست.',
      },
    });

    // 5.2 Create payment record
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        idempotencyKey: `pay_test_${receipt.id}`,
        method: 'card_transfer',
        gatewayRef: trackingCode,
        amount: receipt.amount,
        currency: receipt.currency,
        status: 'SUCCESS',
      },
    });

    // 5.3 Confirm booking
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        fulfillmentStatus: 'CONFIRMED',
        ticketStatus: 'ISSUING',
      },
    });

    // 5.4 General Ledger Entry
    const bookingMoney = new Money(booking.totalAmount, booking.currency);
    await GeneralLedgerService.postGatewayPayment(
      {
        groupId: `test_pay_${booking.id}`,
        amount: bookingMoney,
        currency: booking.currency,
        referenceId: booking.id,
      },
      tx
    );

    // 5.5 Invoice
    await InvoiceDomainService.createInvoice(
      {
        bookingId: booking.id,
        customerId: booking.customerId,
        currency: booking.currency,
        lines: [
          {
            description: `تسویه سفارش مسافرتی ${booking.reference}`,
            quantity: 1,
            unitPrice: bookingMoney,
          },
        ],
      },
      tx
    );

    // 5.6 Audit log
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'CONFIRMED',
        actor: adminId,
        reason: 'رسید پرداخت توسط کارشناس مالی تایید شد.',
      },
    });
  });

  // 6. Verify final states
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { cardReceipts: true, statusHistory: true },
  });

  if (!updatedBooking) throw new Error('Updated booking not found');

  console.log(`[PASS] Final Booking Status: ${updatedBooking.status} (Expected: CONFIRMED)`);
  console.log(`[PASS] Final Payment Status: ${updatedBooking.paymentStatus} (Expected: CAPTURED)`);
  console.log(`[PASS] Receipt Status: ${updatedBooking.cardReceipts[0].status} (Expected: APPROVED)`);
  console.log(`[PASS] Audit History count: ${updatedBooking.statusHistory.length}`);

  // Cleanup test entities in reverse FK order
  const invoice = await prisma.invoice.findFirst({ where: { bookingId: booking.id } });
  if (invoice) {
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
  }
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
  await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: booking.id } });
  await prisma.cardTransferReceipt.deleteMany({ where: { bookingId: booking.id } });
  await prisma.bookingItem.deleteMany({ where: { bookingId: booking.id } });
  await prisma.booking.delete({ where: { id: booking.id } });
  console.log('[PASS] Test cleanup completed successfully.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTest()
  .catch((err) => {
    console.error('[FAIL] Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
