import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';

export interface WalletCaptureParams {
  bookingId: string;
  userId: string;
  expectedTotal: Money;
  idempotencyKey: string;
  allowPartial?: boolean;
}

export interface WalletCaptureResult {
  success: boolean;
  orderStatus: 'BOOKED' | 'CONFIRMED' | 'PAID_PENDING_ADMIN_APPROVAL' | 'FAILED' | 'INSUFFICIENT_FUNDS';
  paymentId?: string;
  shortfall?: {
    currentBalance: Money;
    requiredAmount: Money;
    shortfallAmount: Money;
    nextAction: {
      type: 'wallet_top_up';
      screen: 'wallet_add_money';
      suggestedAmount: string;
      currency: string;
    };
  };
  error?: string;
}

export class TravelWalletCaptureService {
  /**
   * Captures booking amount from user's matching-currency wallet.
   * Strictly enforces:
   * 1. Idempotency replay check.
   * 2. Authoritative Price Slippage Guard (Zero-divergence Money check).
   * 3. Row-level pessimistic locking (WAL-001).
   * 4. Double-entry general ledger posting (FIN-001).
   */
  public static async captureWalletPayment(params: WalletCaptureParams): Promise<WalletCaptureResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      const existingPayment = await tx.payment.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });

      if (existingPayment) {
        if (existingPayment.bookingId && existingPayment.bookingId !== params.bookingId) {
          throw new Error('Security Violation: Idempotency key bound to another booking');
        }
        if (existingPayment.status === 'SUCCESS') {
          return {
            success: true,
            orderStatus: 'CONFIRMED',
            paymentId: existingPayment.id,
          };
        }
      }

      // 2. Fetch Authoritative Booking Details
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: params.bookingId },
      });

      const authoritativeAmount = new Money(booking.totalAmount.toString(), booking.currency);

      // 3. Price Slippage Guard (zero divergence check)
      if (!authoritativeAmount.equals(params.expectedTotal)) {
        throw new Error(
          `PRICE_SLIPPAGE_DETECTED: Authoritative booking total (${authoritativeAmount.toString()}) ` +
          `diverged from expected user total (${params.expectedTotal.toString()})`
        );
      }

      // 4. Resolve Customer Account & Acquire Pessimistic Row Lock (WAL-001)
      const customerAcc = await tx.account.upsert({
        where: {
          ownerType_ownerId_currency: {
            ownerType: 'USER',
            ownerId: params.userId,
            currency: authoritativeAmount.currency,
          },
        },
        update: {},
        create: {
          ownerType: 'USER',
          ownerId: params.userId,
          currency: authoritativeAmount.currency,
        },
      });

      await tx.$queryRaw`
        SELECT id FROM "Account"
        WHERE id = ${customerAcc.id}
        FOR UPDATE
      `;

      // 5. Evaluate Balance Under Lock
      const currentBalance = await GeneralLedgerService.getAccountBalance(
        customerAcc.id,
        authoritativeAmount.currency,
        tx
      );

      if (currentBalance.amount.lessThan(authoritativeAmount.toDecimal())) {
        const shortfall = authoritativeAmount.sub(currentBalance);
        return {
          success: false,
          orderStatus: 'INSUFFICIENT_FUNDS',
          shortfall: {
            currentBalance,
            requiredAmount: authoritativeAmount,
            shortfallAmount: shortfall,
            nextAction: {
              type: 'wallet_top_up',
              screen: 'wallet_add_money',
              suggestedAmount: shortfall.amount.toString(),
              currency: authoritativeAmount.currency,
            },
          },
          error: 'Insufficient wallet balance for travel capture',
        };
      }

      // 6. Post Double-Entry Ledger Movement (DEBIT 1020 User -> CREDIT 2010 Escrow)
      const postingGroupId = `wcap_${params.idempotencyKey}`;
      await GeneralLedgerService.postWalletPayment(
        {
          groupId: postingGroupId,
          userId: params.userId,
          amount: authoritativeAmount,
          currency: authoritativeAmount.currency,
          referenceId: booking.id,
          memo: `Wallet capture for booking ${booking.reference}`,
        },
        tx
      );

      // 7. Record Payment & Transition Booking
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          idempotencyKey: params.idempotencyKey,
          method: `wallet_${authoritativeAmount.currency.toLowerCase()}`,
          amount: authoritativeAmount.toDecimal(),
          currency: authoritativeAmount.currency,
          status: 'SUCCESS',
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'CAPTURED',
          ticketStatus: 'ISSUED',
        },
      });

      return {
        success: true,
        orderStatus: 'CONFIRMED',
        paymentId: payment.id,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }
}
