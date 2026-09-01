'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { calculatePricing } from '@/lib/pricing/engine';
import { FLIGHTS, HOTELS, TOURS, TRANSFERS, VISA_SERVICES, ESIM_PACKAGES, INSURANCE_PLANS } from '@/lib/data';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const ESIM_PRICE_FALLBACK = 2800000;
const INSURANCE_PRICE_FALLBACK = 1900000;

function resolveServerBasePrice(type: string, itemId?: string): number {
  if (!itemId) {
    if (type === 'FLIGHT') return FLIGHTS[0]?.price ?? 28500000;
    if (type === 'HOTEL') return HOTELS[0]?.pricePerNight ?? 42000000;
    if (type === 'TOUR') return TOURS[0]?.price ?? 85000000;
    if (type === 'TRANSFER') return TRANSFERS[0]?.price ?? 3200000;
    if (type === 'VISA') return VISA_SERVICES[0]?.price ?? 48000000;
    if (type === 'ESIM') return ESIM_PACKAGES[0]?.price ?? 2800000;
    if (type === 'INSURANCE') return INSURANCE_PLANS[0]?.price ?? 350000;
    return 34500000;
  }

  const flight = FLIGHTS.find((f) => f.id === itemId);
  if (flight) return flight.price;

  const hotel = HOTELS.find((h) => h.id === itemId);
  if (hotel) return hotel.pricePerNight;

  const tour = TOURS.find((t) => t.id === itemId);
  if (tour) return tour.price;

  const transfer = TRANSFERS.find((tr) => tr.id === itemId);
  if (transfer) return transfer.price;

  const visa = VISA_SERVICES.find((v) => v.id === itemId);
  if (visa) return visa.price;

  const esim = ESIM_PACKAGES.find((e) => e.id === itemId);
  if (esim) return esim.price;

  const insurance = INSURANCE_PLANS.find((i) => i.id === itemId);
  if (insurance) return insurance.price;

  return 34500000;
}

export async function createBookingDraft(data: unknown) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userRole = session.user.role || 'CUSTOMER';

    // 1. Validate data structure purely based on IDs/quantities
    const parsed = bookingSchema.parse(data);

    // 2. Compute canonical price strictly on the server using pricing engine
    const baseUnitCost = resolveServerBasePrice(parsed.type, parsed.itemId);
    const quantity = parsed.count || 1;
    const nights = parsed.nights || 1;
    const totalBaseItemCost = parsed.type === 'HOTEL' ? baseUnitCost * nights * quantity : baseUnitCost * quantity;

    let totalAddonsCost = 0;
    if (parsed.addons?.esim || parsed.addonIds?.includes('esim')) {
      totalAddonsCost += ESIM_PRICE_FALLBACK;
    }
    if (parsed.addons?.insurance || parsed.addonIds?.includes('insurance')) {
      totalAddonsCost += INSURANCE_PRICE_FALLBACK;
    }

    const rawNetCost = totalBaseItemCost + totalAddonsCost;

    const pricing = calculatePricing({
      userRole,
      supplierId: 'sup_default_firuzo',
      productType: parsed.type,
      basePrice: rawNetCost,
      currency: 'IRR',
    });

    const finalTotalAmount = pricing.sellPrice;
    const currency = 'IRR';

    // 3. Ensure user exists in DB
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email || 'user@firuzo.com',
          name: session.user.name || 'Firuzo User',
          passwordHash: 'dummy',
        },
      });
    }

    // Generate unique reference (e.g. ITR-Timestamp)
    const reference = `ITR-${Date.now()}`;

    // 4. Create Booking in DRAFT state
    const booking = await prisma.booking.create({
      data: {
        reference,
        customerId: userId,
        status: 'DRAFT',
        totalAmount: finalTotalAmount,
        currency,
        items: {
          create: {
            type: parsed.type,
            netCost: pricing.netCost,
            markup: pricing.markupAmount + pricing.serviceFee,
            sellPrice: finalTotalAmount,
            details: JSON.stringify({
              ...parsed,
              pricingBreakdown: {
                netCost: pricing.netCost,
                markupAmount: pricing.markupAmount,
                serviceFee: pricing.serviceFee,
                sellPrice: pricing.sellPrice,
              },
            }),
          },
        },
      },
    });

    return { success: true, bookingId: booking.id, totalAmount: finalTotalAmount, currency };
  } catch (err: unknown) {
    console.error('createBookingDraft server error:', err);
    return { success: false, error: 'Failed to create booking draft' };
  }
}

export async function payBooking(bookingId: string, method: 'wallet_irr' | 'gateway_shetab') {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: 'Unauthorized' };
    const userId = session.user.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.customerId !== userId) return { success: false, error: 'Unauthorized' };
    if (booking.status !== 'DRAFT' && booking.status !== 'PENDING_PAYMENT') {
      return { success: false, error: 'Booking already processed or cancelled' };
    }

    const isDemo = process.env.DEMO_MODE === 'true';

    // Double-entry accounting
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find or create Platform Escrow Account
      let escrowAccount = await tx.account.findFirst({
        where: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency },
      });
      if (!escrowAccount) {
        escrowAccount = await tx.account.create({
          data: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency },
        });
      }

      const idempotencyKey = `pay_${booking.id}_${Date.now()}`;

      if (method === 'wallet_irr') {
        // Find or create Customer Account
        let customerAccount = await tx.account.findFirst({
          where: { ownerType: 'USER', ownerId: userId, currency: booking.currency },
        });

        if (!customerAccount) {
          customerAccount = await tx.account.create({
            data: { ownerType: 'USER', ownerId: userId, currency: booking.currency },
          });

          // Demo funding only if DEMO_MODE is true
          if (isDemo) {
            await tx.ledgerEntry.create({
              data: {
                groupId: `demo_funding_${userId}`,
                accountId: customerAccount.id,
                direction: 'CREDIT',
                amount: 150000000,
                currency: booking.currency,
                referenceType: 'TOPUP',
              },
            });
          }
        }

        // Calculate customer balance from ledger
        const entries = await tx.ledgerEntry.findMany({
          where: { accountId: customerAccount.id },
        });
        const balance = entries.reduce((acc, entry) => {
          return entry.direction === 'CREDIT' ? acc + Number(entry.amount) : acc - Number(entry.amount);
        }, 0);

        if (balance < Number(booking.totalAmount)) {
          throw new Error('Insufficient wallet balance');
        }

        // 1. Debit Customer
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: customerAccount.id,
            direction: 'DEBIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id,
          },
        });

        // 2. Credit Escrow
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: escrowAccount.id,
            direction: 'CREDIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id,
          },
        });
      } else if (method === 'gateway_shetab') {
        // Find or create Gateway Settlement Account
        let gatewayAccount = await tx.account.findFirst({
          where: { ownerType: 'GATEWAY_SETTLEMENT', currency: booking.currency },
        });
        if (!gatewayAccount) {
          gatewayAccount = await tx.account.create({
            data: { ownerType: 'GATEWAY_SETTLEMENT', currency: booking.currency },
          });
        }

        // In simulated gateway settlement:
        // 1. Credit Gateway Settlement (External bank inbound)
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: gatewayAccount.id,
            direction: 'CREDIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id,
          },
        });

        // 2. Debit Gateway Settlement and Credit Escrow
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: gatewayAccount.id,
            direction: 'DEBIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: escrowAccount.id,
            direction: 'CREDIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id,
          },
        });
      }

      // State Machine Transition: -> CONFIRMED
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
      });

      // Outbox Event for async tasks
      await tx.outboxEvent.create({
        data: {
          eventType: 'BOOKING_PAID',
          payload: JSON.stringify({ bookingId: booking.id, method }),
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: 'BOOKING_PAID',
          resource: 'Booking',
          resourceId: booking.id,
          newData: JSON.stringify({ method, amount: Number(booking.totalAmount) }),
        },
      });
    });

    revalidatePath('/my-trips');
    revalidatePath('/wallet');
    return { success: true };
  } catch (err: unknown) {
    console.error('payBooking server error:', err);
    return { success: false, error: 'Payment processing failed' };
  }
}
