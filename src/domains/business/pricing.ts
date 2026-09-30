/**
 * Business pricing — the only place a Business amount is computed.
 *
 * Money rule: every amount is whole Rial held in an Int, per the spec
 * ("همه مبالغ به ریال و به‌صورت عدد صحیح ذخیره شوند"). All arithmetic here is
 * therefore integer arithmetic — there is no rounding step to get wrong, and no
 * float to drift. Never introduce Number() float math, parseFloat, or
 * Math.round on a money value: that is the violation this file exists to prevent.
 *
 * The deposit percentage is configurable (never hardcoded) because the spec
 * requires "درصد باید تنظیم‌پذیر باشد، نه ثابت در کد".
 */

import { InvalidBusinessMoneyError } from './money-errors';

export type Rial = number;

export const DEPOSIT_PERCENT_DEFAULT = 30;

export interface QuoteInput {
  /** Package base price per person, in Rial. */
  basePrice: Rial;
  paxCount: number;
  /** Add-ons chosen on the request. */
  addons?: Array<{ price: Rial; quantity: number; unit: 'per_person' | 'per_group' }>;
}

export interface Quote {
  totalAmount: Rial;
  depositAmount: Rial;
  /** Amount still owed at settlement = total − deposit − grant. */
  remainingAmount: Rial;
  depositPercent: number;
}

function assertNonNegativeInt(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidBusinessMoneyError(`${field} must be a non-negative integer number of Rial`, field, value);
  }
}

function assertPositiveInt(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new InvalidBusinessMoneyError(`${field} must be a positive integer`, field, value);
  }
}

/**
 * Computes the quote for a request.
 *
 * `per_person` add-ons scale with paxCount; `per_group` add-ons are charged
 * once for the whole group.
 */
export function computeQuote(input: QuoteInput, depositPercent: number = DEPOSIT_PERCENT_DEFAULT): Quote {
  assertNonNegativeInt(input.basePrice, 'basePrice');
  assertPositiveInt(input.paxCount, 'paxCount');
  assertNonNegativeInt(depositPercent, 'depositPercent');
  if (depositPercent > 100) {
    throw new InvalidBusinessMoneyError('depositPercent must be between 0 and 100', 'depositPercent', depositPercent);
  }

  let total = input.basePrice * input.paxCount;

  for (const [index, addon] of (input.addons ?? []).entries()) {
    assertNonNegativeInt(addon.price, `addons[${index}].price`);
    assertPositiveInt(addon.quantity, `addons[${index}].quantity`);
    total += addon.unit === 'per_group' ? addon.price * addon.quantity : addon.price * addon.quantity * input.paxCount;
  }

  // Integer half-up rounding on the percentage only — the total is never rounded.
  const depositAmount = Math.trunc((total * depositPercent) / 100);

  return {
    totalAmount: total,
    depositAmount,
    remainingAmount: total - depositAmount,
    depositPercent,
  };
}

/**
 * Final settlement, deducting the government grant (کمک‌هزینه) and everything
 * already paid. The grant is only deducted once it has actually been recorded —
 * before that it shows as "pending" and must not reduce the amount owed.
 *
 * `paidAmount` is CUMULATIVE: once the deposit is paid it is already included.
 * So the deposit is NOT subtracted a second time — doing so would bill the
 * customer for the deposit twice.
 */
export function computeSettlement(args: {
  totalAmount: Rial;
  depositAmount: Rial;
  grantAmount: Rial;
  paidAmount: Rial;
}): { payableAmount: Rial; grantApplied: boolean } {
  assertNonNegativeInt(args.totalAmount, 'totalAmount');
  assertNonNegativeInt(args.depositAmount, 'depositAmount');
  assertNonNegativeInt(args.grantAmount, 'grantAmount');
  assertNonNegativeInt(args.paidAmount, 'paidAmount');

  if (args.grantAmount > args.totalAmount) {
    throw new InvalidBusinessMoneyError('grantAmount cannot exceed totalAmount', 'grantAmount', args.grantAmount);
  }
  if (args.depositAmount > args.totalAmount) {
    throw new InvalidBusinessMoneyError('depositAmount cannot exceed totalAmount', 'depositAmount', args.depositAmount);
  }
  if (args.paidAmount < args.depositAmount) {
    throw new InvalidBusinessMoneyError(
      'paidAmount cannot be less than the deposit already collected',
      'paidAmount',
      args.paidAmount,
    );
  }

  const grantApplied = args.grantAmount > 0;
  const payable = args.totalAmount - (grantApplied ? args.grantAmount : 0) - args.paidAmount;
  // Never go negative: an over-payment is a refund case, not a negative invoice.
  const payableAmount = Math.max(0, payable);

  return { payableAmount, grantApplied };
}

/**
 * The single authority on whether a voucher may be issued:
 * `paid_amount == total_amount − grant_amount`.
 */
export function isVoucherIssuable(args: {
  totalAmount: Rial;
  grantAmount: Rial;
  paidAmount: Rial;
}): boolean {
  assertNonNegativeInt(args.totalAmount, 'totalAmount');
  assertNonNegativeInt(args.grantAmount, 'grantAmount');
  assertNonNegativeInt(args.paidAmount, 'paidAmount');
  return args.paidAmount === args.totalAmount - args.grantAmount;
}

/** Formats whole Rial for display; conversion to Toman happens only here. */
export function rialToToman(rial: Rial): number {
  return Math.trunc(rial / 10);
}
