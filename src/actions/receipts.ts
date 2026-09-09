'use server';

import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { InvoiceDomainService } from '@/domains/finance/InvoiceDomainService';

export interface DestinationBankCardDto {
  id: string;
  bankName: string;
  accountHolder: string;
  cardNumber: string;
  iban: string | null;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
}

export interface SubmitReceiptInput {
  bookingId: string;
  bankCardId: string;
  trackingCode: string;
  paymentDate?: string;
  customerNote?: string;
  receiptImages: string[];
  nationalIdImage?: string;
}

/**
 * Get all active destination bank cards for customer presentation
 */
export async function getDestinationBankCards(): Promise<{ success: boolean; cards: DestinationBankCardDto[] }> {
  try {
    const cards = await prisma.destinationBankCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      success: true,
      cards: cards.map((c) => ({
        id: c.id,
        bankName: c.bankName,
        accountHolder: c.accountHolder,
        cardNumber: c.cardNumber,
        iban: c.iban,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        note: c.note,
      })),
    };
  } catch (error) {
    console.error('Error fetching bank cards:', error);
    return { success: false, cards: [] };
  }
}

/**
 * Get booking details and any existing receipt submission
 */
export async function getBookingReceiptContext(bookingId: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        cardReceipts: {
          include: { bankCard: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'سفارش یافت نشد' };
    }

    const isCustomer = booking.customerId === session.user.id;
    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (!isCustomer && !isStaff) {
      return { success: false, error: 'عدم دسترسی به این سفارش' };
    }

    const cards = await prisma.destinationBankCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const latestReceipt = booking.cardReceipts[0] || null;

    return {
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: Number(booking.totalAmount),
        currency: booking.currency,
        createdAt: booking.createdAt.toISOString(),
        expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
        items: booking.items.map((it) => {
          let title = 'خدمات مسافرتی فیروزو';
          try {
            const d = JSON.parse(it.details || '{}');
            if (d.title) title = d.title;
          } catch {}
          return {
            id: it.id,
            title,
            type: it.type,
            sellPrice: Number(it.sellPrice),
          };
        }),
        customer: booking.customer,
      },
      cards,
      latestReceipt: latestReceipt
        ? {
            id: latestReceipt.id,
            bankCardId: latestReceipt.bankCardId,
            bankCard: latestReceipt.bankCard,
            amount: Number(latestReceipt.amount),
            trackingCode: latestReceipt.trackingCode,
            paymentDate: latestReceipt.paymentDate ? latestReceipt.paymentDate.toISOString() : null,
            customerNote: latestReceipt.customerNote,
            receiptImages: JSON.parse(latestReceipt.receiptImages || '[]') as string[],
            nationalIdImage: latestReceipt.nationalIdImage,
            status: latestReceipt.status,
            adminNote: latestReceipt.adminNote,
            createdAt: latestReceipt.createdAt.toISOString(),
          }
        : null,
    };
  } catch (error) {
    console.error('Error fetching booking receipt context:', error);
    return { success: false, error: 'خطا در بارگذاری اطلاعات' };
  }
}

/**
 * Customer submits card-to-card transfer receipt
 */
export async function submitCardTransferReceipt(input: SubmitReceiptInput) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    if (!input.bookingId || !input.bankCardId) {
      return { success: false, error: 'اطلاعات سفارش یا کارت مقصد ناقص است' };
    }

    if (!input.receiptImages || input.receiptImages.length === 0) {
      return { success: false, error: 'ارسال حداقل یک تصویر رسید الزامی است' };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
    });

    if (!booking) {
      return { success: false, error: 'سفارش مورد نظر یافت نشد' };
    }

    if (booking.customerId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'عدم دسترسی به این سفارش' };
    }

    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'CAPTURED') {
      return { success: false, error: 'این سفارش قبلاً پرداخت و تایید شده است' };
    }

    const paymentDateObj = input.paymentDate ? new Date(input.paymentDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Create or find PaymentIntent
      const intentKey = `card_${booking.id}_${Date.now()}`;
      const paymentIntent = await tx.paymentIntent.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          currency: booking.currency,
          status: 'INITIATED',
          idempotencyKey: intentKey,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Create Receipt Record
      const receipt = await tx.cardTransferReceipt.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: paymentIntent.id,
          bankCardId: input.bankCardId,
          amount: booking.totalAmount,
          currency: booking.currency,
          trackingCode: input.trackingCode || null,
          paymentDate: paymentDateObj,
          customerNote: input.customerNote || null,
          receiptImages: JSON.stringify(input.receiptImages),
          nationalIdImage: input.nationalIdImage || null,
          status: 'PENDING_REVIEW',
        },
      });

      // Update Booking state to PENDING_PAYMENT / PENDING_CUSTOMER
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING_CUSTOMER',
        },
      });

      // Record Audit History
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'PENDING_PAYMENT',
          actor: session.user.id || 'CUSTOMER',
          reason: `رسید کارت به کارت ثبت شد (کد پیگیری: ${input.trackingCode || 'ثبت نشده'}) و در صف بررسی مالی قرار گرفت.`,
        },
      });

      return receipt;
    });

    revalidatePath(`/checkout`);
    revalidatePath(`/admin/finance/receipts`);
    revalidatePath(`/admin/bookings`);

    return {
      success: true,
      receiptId: result.id,
      message: 'رسید پرداخت شما با موفقیت ثبت شد و در انتظار بررسی کارشناس مالی است.',
    };
  } catch (error) {
    console.error('Error submitting receipt:', error);
    return { success: false, error: 'خطا در ثبت رسید پرداخت' };
  }
}

/**
 * Admin action to review and approve/reject a receipt
 */
export async function reviewCardTransferReceipt(
  receiptId: string,
  decision: 'APPROVE' | 'REJECT',
  adminNote?: string
) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (!isStaff) {
      return { success: false, error: 'تنها مدیران سیستم مجاز به بررسی و تایید فیش هستند' };
    }

    const receipt = await prisma.cardTransferReceipt.findUnique({
      where: { id: receiptId },
      include: {
        booking: {
          include: { items: true },
        },
      },
    });

    if (!receipt || !receipt.booking) {
      return { success: false, error: 'فیش مورد نظر یا سفارش مربوطه یافت نشد' };
    }

    if (receipt.status !== 'PENDING_REVIEW') {
      return { success: false, error: `این فیش قبلاً تعیین وضعیت شده است (${receipt.status})` };
    }

    const booking = receipt.booking;
    const now = new Date();

    if (decision === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        // 1. Update Receipt to APPROVED
        await tx.cardTransferReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'APPROVED',
            reviewerId: session.user.id,
            reviewedAt: now,
            adminNote: adminNote || 'تأیید شد',
          },
        });

        // 2. Record Payment row with idempotency
        const paymentIdempotency = `pay_card_${receipt.id}`;
        await tx.payment.upsert({
          where: { idempotencyKey: paymentIdempotency },
          update: {
            status: 'SUCCESS',
            gatewayRef: receipt.trackingCode || `MANUAL-${receipt.id.substring(0, 8)}`,
          },
          create: {
            bookingId: booking.id,
            paymentIntentId: receipt.paymentIntentId,
            idempotencyKey: paymentIdempotency,
            method: 'card_transfer',
            gatewayRef: receipt.trackingCode || `MANUAL-${receipt.id.substring(0, 8)}`,
            amount: receipt.amount,
            currency: receipt.currency,
            status: 'SUCCESS',
            rawPayload: JSON.stringify({
              receiptId: receipt.id,
              bankCardId: receipt.bankCardId,
              trackingCode: receipt.trackingCode,
              approvedBy: session.user.id,
            }),
          },
        });

        // 3. Update PaymentIntent if present
        if (receipt.paymentIntentId) {
          await tx.paymentIntent.update({
            where: { id: receipt.paymentIntentId },
            data: { status: 'CAPTURED' },
          });
        }

        // 4. Update Booking to CONFIRMED
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'CAPTURED',
            fulfillmentStatus: 'CONFIRMED',
            ticketStatus: 'ISSUING',
          },
        });

        // 5. Post to General Ledger
        const bookingMoney = new Money(booking.totalAmount, booking.currency);
        await GeneralLedgerService.postGatewayPayment(
          {
            groupId: `card_pay_${booking.id}`,
            amount: bookingMoney,
            currency: booking.currency,
            referenceId: booking.id,
          },
          tx
        );

        // 6. Calculate Net Cost, Tax, Fee for Revenue Realization
        let netCost = new Prisma.Decimal(0);
        let taxAmount = new Prisma.Decimal(0);
        let feeAmount = new Prisma.Decimal(0);
        for (const item of booking.items) {
          netCost = netCost.add(item.netCost ?? 0);
          taxAmount = taxAmount.add(item.taxAmount ?? 0);
          feeAmount = feeAmount.add(item.feeAmount ?? 0);
        }

        const primaryItem = booking.items[0];
        let supplierId = 'sup_default_firuzo';
        if (primaryItem?.inventoryItemId) {
          const inv = await tx.inventoryItem.findUnique({
            where: { id: primaryItem.inventoryItemId },
            select: { supplierId: true },
          });
          if (inv?.supplierId) supplierId = inv.supplierId;
        }

        await GeneralLedgerService.postRevenueRealization(
          {
            groupId: `card_rev_${booking.id}`,
            amount: bookingMoney,
            netCost: new Money(netCost, booking.currency),
            taxAmount: new Money(taxAmount, booking.currency),
            feeAmount: new Money(feeAmount, booking.currency),
            supplierId,
            currency: booking.currency,
            referenceId: booking.id,
          },
          tx
        );

        // 7. Issue official invoice
        await InvoiceDomainService.createInvoice(
          {
            bookingId: booking.id,
            customerId: booking.customerId,
            organizationId: booking.organizationId || undefined,
            currency: booking.currency,
            lines: [
              {
                description: `تسویه سفارش مسافرتی ${booking.reference} از طریق کارت به کارت`,
                quantity: 1,
                unitPrice: bookingMoney,
              },
            ],
          },
          tx
        );

        // 8. Log Audit History
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: 'CONFIRMED',
            actor: session.user.id || 'ADMIN',
            reason: `رسید کارت به کارت توسط مدیر مالی (${session.user.name || session.user.id}) تأیید شد. ${adminNote ? 'یادداشت: ' + adminNote : ''}`,
          },
        });
      });

      revalidatePath(`/admin/finance/receipts`);
      revalidatePath(`/admin/bookings`);
      revalidatePath(`/checkout`);

      return { success: true, message: 'رسید با موفقیت تأیید شد و سفارش قطعی گردید.' };
    } else {
      // REJECT
      await prisma.$transaction(async (tx) => {
        await tx.cardTransferReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'REJECTED',
            reviewerId: session.user.id,
            reviewedAt: now,
            adminNote: adminNote || 'رسید معتبر نیست',
          },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: booking.status,
            actor: session.user.id || 'ADMIN',
            reason: `رسید کارت به کارت توسط مدیر مالی رد شد: ${adminNote || 'رسید نامعتبر'}`,
          },
        });
      });

      revalidatePath(`/admin/finance/receipts`);
      revalidatePath(`/admin/bookings`);
      revalidatePath(`/checkout`);

      return { success: true, message: 'رسید پرداخت رد شد.' };
    }
  } catch (error) {
    console.error('Error reviewing receipt:', error);
    return { success: false, error: 'خطا در اعمال تصمیم بر روی رسید' };
  }
}

/**
 * Get count of pending receipts for the Admin Header Badge
 */
export async function getPendingReceiptsCount(): Promise<number> {
  try {
    const count = await prisma.cardTransferReceipt.count({
      where: { status: 'PENDING_REVIEW' },
    });
    return count;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
}

/**
 * List card transfer receipts for the Admin Workspace
 */
export async function listCardTransferReceipts(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است', data: [], total: 0 };
    }

    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (!isStaff) {
      return { success: false, error: 'دسترسی غیرمجاز', data: [], total: 0 };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.CardTransferReceiptWhereInput = {};

    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    if (filters?.search) {
      whereClause.OR = [
        { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        { booking: { reference: { contains: filters.search, mode: 'insensitive' } } },
        { booking: { customer: { name: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { customer: { phone: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const total = await prisma.cardTransferReceipt.count({ where: whereClause });
    const receipts = await prisma.cardTransferReceipt.findMany({
      where: whereClause,
      include: {
        bankCard: true,
        booking: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      success: true,
      total,
      data: receipts.map((r) => {
        const primaryItem = r.booking.items[0];
        let itemTitle = 'سفارش مسافرتی فیروزو';
        if (primaryItem) {
          try {
            const d = JSON.parse(primaryItem.details || '{}');
            if (d.title) itemTitle = d.title;
          } catch {}
        }

        return {
          id: r.id,
          bookingId: r.bookingId,
          bookingRef: r.booking.reference,
          customerName: r.booking.customer.name || 'کاربر مهمان',
          customerPhone: r.booking.customer.phone || '-',
          itemTitle,
          bankCardName: r.bankCard ? `${r.bankCard.bankName} (${r.bankCard.accountHolder})` : 'نامشخص',
          cardNumber: r.bankCard?.cardNumber || '',
          amount: Number(r.amount),
          currency: r.currency,
          trackingCode: r.trackingCode || '-',
          paymentDate: r.paymentDate ? r.paymentDate.toISOString() : null,
          customerNote: r.customerNote,
          receiptImages: JSON.parse(r.receiptImages || '[]') as string[],
          nationalIdImage: r.nationalIdImage,
          status: r.status,
          adminNote: r.adminNote,
          reviewerId: r.reviewerId,
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch (error) {
    console.error('Error listing receipts:', error);
    return { success: false, error: 'خطا در دریافت لیست فیش‌ها', data: [], total: 0 };
  }
}
