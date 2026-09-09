'use server';

import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { InvoiceDomainService } from '@/domains/finance/InvoiceDomainService';
import { verifyTronTransactionOnChain, DEFAULT_USDT_TO_IRR_RATE } from '@/lib/crypto/tron-verifier';

export interface CryptoWalletDto {
  id: string;
  network: string;
  currency: string;
  walletAddress: string;
  networkLabel: string;
  memoOrTag: string | null;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
}

export interface SubmitCryptoPaymentInput {
  bookingId: string;
  cryptoWalletId: string;
  txHash: string;
  senderAddress?: string;
  receiptImage?: string;
}

/**
 * Get active destination crypto wallets
 */
export async function getDestinationCryptoWallets(): Promise<{ success: boolean; wallets: CryptoWalletDto[] }> {
  try {
    const wallets = await prisma.destinationCryptoWallet.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      success: true,
      wallets: wallets.map((w) => ({
        id: w.id,
        network: w.network,
        currency: w.currency,
        walletAddress: w.walletAddress,
        networkLabel: w.networkLabel,
        memoOrTag: w.memoOrTag,
        isActive: w.isActive,
        sortOrder: w.sortOrder,
        note: w.note,
      })),
    };
  } catch (error) {
    console.error('Error fetching crypto wallets:', error);
    return { success: false, wallets: [] };
  }
}

/**
 * Update a destination wallet address (for admin or user configuration)
 */
export async function updateCryptoWalletAddress(walletId: string, newAddress: string) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (!isStaff) {
      return { success: false, error: 'تنها مدیران مجاز به تغییر آدرس ولت هستند' };
    }

    const updated = await prisma.destinationCryptoWallet.update({
      where: { id: walletId },
      data: { walletAddress: newAddress.trim() },
    });

    revalidatePath('/checkout');
    revalidatePath('/admin/finance/receipts');

    return { success: true, message: 'آدرس ولت با موفقیت به‌روزرسانی شد', wallet: updated };
  } catch (error) {
    console.error('Error updating wallet address:', error);
    return { success: false, error: 'خطا در ویرایش آدرس ولت' };
  }
}

/**
 * Get current USDT to IRR exchange rate
 */
export async function getLiveUsdtRate(): Promise<{ rateIrr: number; rateToman: number }> {
  // In production this can fetch from an official Iranian exchange feed (e.g. Nobitex/SANA/Tetherland)
  const rateIrr = DEFAULT_USDT_TO_IRR_RATE;
  return {
    rateIrr,
    rateToman: Math.floor(rateIrr / 10),
  };
}

/**
 * Get context for checkout crypto payment (booking, conversion to USDT, wallets, timer)
 */
export async function getBookingCryptoContext(bookingId: string) {
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
        cryptoReceipts: {
          include: { cryptoWallet: true },
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

    const wallets = await prisma.destinationCryptoWallet.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const { rateIrr, rateToman } = await getLiveUsdtRate();
    const totalIrr = Number(booking.totalAmount);
    // Exact USDT amount rounded to 2 decimal places (e.g. 15,000,000 / 900,000 = 16.67 USDT)
    const amountUsdt = Math.round((totalIrr / rateIrr) * 100) / 100;

    const latestReceipt = booking.cryptoReceipts[0] || null;

    return {
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmountIrr: totalIrr,
        amountUsdt,
        rateIrr,
        rateToman,
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
      wallets: wallets.map((w) => ({
        id: w.id,
        network: w.network,
        currency: w.currency,
        walletAddress: w.walletAddress,
        networkLabel: w.networkLabel,
        memoOrTag: w.memoOrTag,
        isActive: w.isActive,
        sortOrder: w.sortOrder,
        note: w.note,
      })),
      latestReceipt: latestReceipt
        ? {
            id: latestReceipt.id,
            network: latestReceipt.network,
            currency: latestReceipt.currency,
            amountUsdt: Number(latestReceipt.amountUsdt),
            amountIrr: Number(latestReceipt.amountIrr),
            txHash: latestReceipt.txHash,
            senderAddress: latestReceipt.senderAddress,
            receiptImage: latestReceipt.receiptImage,
            onChainVerified: latestReceipt.onChainVerified,
            status: latestReceipt.status,
            adminNote: latestReceipt.adminNote,
            createdAt: latestReceipt.createdAt.toISOString(),
          }
        : null,
    };
  } catch (error) {
    console.error('Error fetching booking crypto context:', error);
    return { success: false, error: 'خطا در دریافت اطلاعات پرداخت رمز ارز' };
  }
}

/**
 * Customer submits transaction hash (TxID) after transferring USDT
 */
export async function submitCryptoPayment(input: SubmitCryptoPaymentInput) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    const cleanTxHash = input.txHash.trim();
    if (!cleanTxHash || cleanTxHash.length < 16) {
      return { success: false, error: 'کد هش تراکنش (TxID) وارد شده نامعتبر است' };
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
      return { success: false, error: 'این سفارش قبلاً پرداخت و تأیید شده است' };
    }

    // Check for replay of txHash across other bookings
    const duplicate = await prisma.cryptoPaymentReceipt.findFirst({
      where: {
        txHash: cleanTxHash,
        bookingId: { not: booking.id },
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
      },
    });

    if (duplicate) {
      return { success: false, error: 'این کد هش تراکنش قبلاً برای سفارش دیگری ثبت شده است' };
    }

    const wallet = await prisma.destinationCryptoWallet.findUnique({
      where: { id: input.cryptoWalletId },
    });

    if (!wallet) {
      return { success: false, error: 'کیف پول مقصد انتخاب‌شده نامعتبر است' };
    }

    const { rateIrr } = await getLiveUsdtRate();
    const totalIrr = Number(booking.totalAmount);
    const amountUsdt = Math.round((totalIrr / rateIrr) * 100) / 100;

    // Optional on-chain verification for TRC20
    let onChainVerified = false;
    let onChainData: string | null = null;
    let verificationNote = '';

    if (wallet.network === 'TRC20') {
      try {
        const onChainRes = await verifyTronTransactionOnChain(cleanTxHash, wallet.walletAddress, amountUsdt);
        if (onChainRes.verified) {
          onChainVerified = true;
          onChainData = JSON.stringify(onChainRes.raw || {});
          verificationNote = ' [استعلام آن‌چین ترون‌اسکن: تأیید شد]';
        }
      } catch (err) {
        console.warn('On-chain verification soft-skipped:', err);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create PaymentIntent
      const intentKey = `crypto_${booking.id}_${Date.now()}`;
      const paymentIntent = await tx.paymentIntent.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          currency: 'USDT',
          status: 'INITIATED',
          idempotencyKey: intentKey,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 2. Create CryptoPaymentReceipt
      const receipt = await tx.cryptoPaymentReceipt.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: paymentIntent.id,
          cryptoWalletId: wallet.id,
          network: wallet.network,
          currency: wallet.currency,
          amountUsdt: new Prisma.Decimal(amountUsdt),
          amountIrr: booking.totalAmount,
          fxRate: new Prisma.Decimal(rateIrr),
          txHash: cleanTxHash,
          senderAddress: input.senderAddress?.trim() || null,
          receiptImage: input.receiptImage || null,
          onChainVerified,
          onChainData,
          status: 'PENDING_REVIEW',
        },
      });

      // 3. Update Booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING_CUSTOMER',
        },
      });

      // 4. Audit History
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'PENDING_PAYMENT',
          actor: session.user.id || 'CUSTOMER',
          reason: `تراکنش تتر (${amountUsdt} USDT / شبکه ${wallet.network}) با هش ${cleanTxHash} ثبت شد.${verificationNote}`,
        },
      });

      return receipt;
    });

    revalidatePath('/checkout');
    revalidatePath('/admin/finance/receipts');
    revalidatePath('/admin/bookings');

    return {
      success: true,
      receiptId: result.id,
      onChainVerified,
      message: onChainVerified
        ? 'تراکنش شما در شبکه بلاکچین استعلام و تأیید گردید و در حال نهایی‌سازی است.'
        : 'اطلاعات تراکنش شما با موفقیت ثبت شد و در صف بررسی کارشناس مالی قرار گرفت.',
    };
  } catch (error) {
    console.error('Error submitting crypto payment:', error);
    return { success: false, error: 'خطا در ثبت تراکنش رمز ارز' };
  }
}

/**
 * Admin action to approve or reject a crypto payment
 */
export async function reviewCryptoPayment(
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
      return { success: false, error: 'تنها مدیران سیستم مجاز به بررسی و تایید هستند' };
    }

    const receipt = await prisma.cryptoPaymentReceipt.findUnique({
      where: { id: receiptId },
      include: {
        booking: {
          include: { items: true },
        },
        cryptoWallet: true,
      },
    });

    if (!receipt || !receipt.booking) {
      return { success: false, error: 'رسید رمزارز یا سفارش مربوطه یافت نشد' };
    }

    if (receipt.status !== 'PENDING_REVIEW') {
      return { success: false, error: `این تراکنش قبلاً تعیین وضعیت شده است (${receipt.status})` };
    }

    const booking = receipt.booking;
    const now = new Date();

    if (decision === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        // 1. Update receipt
        await tx.cryptoPaymentReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'APPROVED',
            reviewerId: session.user.id,
            reviewedAt: now,
            adminNote: adminNote || 'تأیید شد',
          },
        });

        // 2. Create Payment row
        const paymentIdempotency = `pay_crypto_${receipt.id}`;
        await tx.payment.upsert({
          where: { idempotencyKey: paymentIdempotency },
          update: {
            status: 'SUCCESS',
            gatewayRef: receipt.txHash,
          },
          create: {
            bookingId: booking.id,
            paymentIntentId: receipt.paymentIntentId,
            idempotencyKey: paymentIdempotency,
            method: 'crypto_usdt',
            gatewayRef: receipt.txHash,
            amount: receipt.amountIrr,
            currency: 'IRR',
            status: 'SUCCESS',
            rawPayload: JSON.stringify({
              receiptId: receipt.id,
              network: receipt.network,
              amountUsdt: Number(receipt.amountUsdt),
              txHash: receipt.txHash,
              approvedBy: session.user.id,
            }),
          },
        });

        // 3. Update PaymentIntent
        if (receipt.paymentIntentId) {
          await tx.paymentIntent.update({
            where: { id: receipt.paymentIntentId },
            data: { status: 'CAPTURED' },
          });
        }

        // 4. Update Booking
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
            groupId: `crypto_pay_${booking.id}`,
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
            groupId: `crypto_rev_${booking.id}`,
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
                description: `تسویه سفارش مسافرتی ${booking.reference} با تتر (${receipt.amountUsdt} USDT / شبکه ${receipt.network})`,
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
            reason: `پرداخت تتر (${receipt.amountUsdt} USDT / هش: ${receipt.txHash}) توسط کارشناس مالی تأیید و سفارش قطعی شد. ${adminNote ? 'یادداشت: ' + adminNote : ''}`,
          },
        });
      });

      revalidatePath('/admin/finance/receipts');
      revalidatePath('/admin/bookings');
      revalidatePath('/checkout');

      return { success: true, message: 'تراکنش تتر با موفقیت تأیید شد و واچر صادر گردید.' };
    } else {
      // REJECT
      await prisma.$transaction(async (tx) => {
        await tx.cryptoPaymentReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'REJECTED',
            reviewerId: session.user.id,
            reviewedAt: now,
            adminNote: adminNote || 'تراکنش رمزارز رد شد',
          },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: booking.status,
            actor: session.user.id || 'ADMIN',
            reason: `تراکنش تتر توسط مدیر مالی رد شد: ${adminNote || 'تراکنش نامعتبر'}`,
          },
        });
      });

      revalidatePath('/admin/finance/receipts');
      revalidatePath('/admin/bookings');
      revalidatePath('/checkout');

      return { success: true, message: 'تراکنش رمزارز رد شد.' };
    }
  } catch (error) {
    console.error('Error reviewing crypto payment:', error);
    return { success: false, error: 'خطا در اعمال تصمیم بر روی تراکنش' };
  }
}

/**
 * List crypto payment receipts for Admin Workspace
 */
export async function listCryptoPayments(filters?: {
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

    const whereClause: Prisma.CryptoPaymentReceiptWhereInput = {};

    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    if (filters?.search) {
      whereClause.OR = [
        { txHash: { contains: filters.search, mode: 'insensitive' } },
        { senderAddress: { contains: filters.search, mode: 'insensitive' } },
        { booking: { reference: { contains: filters.search, mode: 'insensitive' } } },
        { booking: { customer: { name: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { customer: { phone: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const total = await prisma.cryptoPaymentReceipt.count({ where: whereClause });
    const receipts = await prisma.cryptoPaymentReceipt.findMany({
      where: whereClause,
      include: {
        cryptoWallet: true,
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
          network: r.network,
          networkLabel: r.cryptoWallet?.networkLabel || r.network,
          walletAddress: r.cryptoWallet?.walletAddress || '',
          amountUsdt: Number(r.amountUsdt),
          amountIrr: Number(r.amountIrr),
          fxRate: Number(r.fxRate),
          txHash: r.txHash,
          senderAddress: r.senderAddress,
          receiptImage: r.receiptImage,
          onChainVerified: r.onChainVerified,
          status: r.status,
          adminNote: r.adminNote,
          reviewerId: r.reviewerId,
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch (error) {
    console.error('Error listing crypto payments:', error);
    return { success: false, error: 'خطا در دریافت لیست تراکنش‌های رمزارز', data: [], total: 0 };
  }
}
