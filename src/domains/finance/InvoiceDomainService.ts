import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';

export interface CreateInvoiceParams {
  bookingId: string;
  customerId: string;
  organizationId?: string | null;
  branchId?: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: Money | Prisma.Decimal | number | string; // MONEY-101: Money is canonical financial input
    taxAmount?: Money | Prisma.Decimal | number | string;
  }>;
  currency?: string;
  dueDays?: number;
}

/**
 * DEMO/default seller identity — used ONLY when no production seller
 * configuration is present (§76-5: production invoices must never silently
 * render placeholder merchant identity). Real operation requires the
 * INVOICE_SELLER_* environment variables.
 */
export const STATUTORY_SELLER_INFO = {
  legalName: 'شرکت خدمات مسافرت هوایی و جهانگردی فیروزه (سهامی خاص)',
  brandName: 'فیروزه (Firuzo Platform)',
  economicCode: '411589364125',
  nationalId: '14009876543',
  registrationNo: '584920',
  vatRegistrationNo: '9841257410',
  postalCode: '1997834512',
  address: 'تهران، خیابان ولیعصر، بالاتر از پارک وی، برج سرو، طبقه ۱۲، واحد ۱۲۰۴',
  phone: '۰۲۱-۹۱۰۰۹۸۷۶',
  website: 'https://firuzo.com',
};

type StatutorySellerInfo = typeof STATUTORY_SELLER_INFO;

/**
 * Resolves the invoice seller identity. In production (fail-closed) the real
 * legal identity MUST come from environment configuration; the demo defaults
 * above are refused to avoid placing fabricated merchant identity on invoices.
 */
export function getStatutorySellerInfo(): StatutorySellerInfo {
  const legalName = process.env.INVOICE_SELLER_LEGAL_NAME;
  const nationalId = process.env.INVOICE_SELLER_NATIONAL_ID;
  const economicCode = process.env.INVOICE_SELLER_ECONOMIC_CODE;

  const isProduction = process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true';
  const configured = Boolean(legalName && nationalId && economicCode);

  if (isProduction && !configured) {
    throw new Error(
      'Seller identity is not configured: set INVOICE_SELLER_LEGAL_NAME, INVOICE_SELLER_NATIONAL_ID and INVOICE_SELLER_ECONOMIC_CODE before issuing official-format invoices in production.'
    );
  }

  if (configured) {
    return {
      ...STATUTORY_SELLER_INFO,
      legalName: legalName!,
      nationalId: nationalId!,
      economicCode: economicCode!,
      registrationNo: process.env.INVOICE_SELLER_REGISTRATION_NO || STATUTORY_SELLER_INFO.registrationNo,
      vatRegistrationNo: process.env.INVOICE_SELLER_VAT_NO || STATUTORY_SELLER_INFO.vatRegistrationNo,
      postalCode: process.env.INVOICE_SELLER_POSTAL_CODE || STATUTORY_SELLER_INFO.postalCode,
      address: process.env.INVOICE_SELLER_ADDRESS || STATUTORY_SELLER_INFO.address,
      phone: process.env.INVOICE_SELLER_PHONE || STATUTORY_SELLER_INFO.phone,
    };
  }

  return STATUTORY_SELLER_INFO; // demo/dev defaults
}

export interface OfficialTaxInvoicePayload {
  invoice: {
    id: string;
    invoiceNumber: string;
    fiscalSerial: string;
    status: string;
    issuedAt: Date;
    issuedAtJalali: string;
    dueAt: Date | null;
    currency: string;
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
    totalInWordsFa: string;
  };
  seller: typeof STATUTORY_SELLER_INFO;
  buyer: {
    isCorporate: boolean;
    name: string;
    legalName?: string | null;
    nationalId: string | null;
    economicCode: string | null;
    phone: string | null;
    email: string | null;
    address?: string | null;
    organizationName?: string | null;
  };
  lines: Array<{
    rowNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountAmount: number;
    taxRatePercent: number;
    taxAmount: number;
    finalAmount: number;
  }>;
  bookingReference: string | null;
  qrCodePayload: string;
}

export class InvoiceDomainService {
  /**
   * Generates a commercial invoice for confirmed bookings (FIN-006, MONEY-101, MONEY-104, IAM-103)
   */
  static async createInvoice(
    params: CreateInvoiceParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const firstLinePrice = params.lines[0]?.unitPrice;
    const detectedCurrency =
      firstLinePrice && typeof (firstLinePrice as Money).currency === 'string'
        ? (firstLinePrice as Money).currency
        : 'IRR';
    const currency = params.currency || detectedCurrency;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let totalNet = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const toDecimal = (
      val: Money | Prisma.Decimal | number | string | undefined
    ): Prisma.Decimal => {
      if (!val) return new Prisma.Decimal(0);
      if (typeof (val as Money).toDecimal === 'function') return (val as Money).toDecimal();
      if (val instanceof Prisma.Decimal) return val;
      return new Prisma.Decimal(val.toString());
    };

    const formattedLines = params.lines.map((l) => {
      const uPrice = toDecimal(l.unitPrice);
      const tax = toDecimal(l.taxAmount);
      const lineTotal = uPrice.mul(l.quantity);

      totalNet = totalNet.add(lineTotal);
      totalTax = totalTax.add(tax);

      return {
        description: l.description,
        quantity: l.quantity,
        unitPrice: uPrice,
        totalPrice: lineTotal,
        taxAmount: tax,
      };
    });

    const totalAmount = totalNet.add(totalTax);
    const dueAt = new Date(Date.now() + (params.dueDays || 7) * 24 * 60 * 60 * 1000);

    let orgId = params.organizationId;
    let brId = params.branchId;
    if (orgId === undefined && params.bookingId) {
      const bkg = await client.booking.findUnique({
        where: { id: params.bookingId },
        select: { organizationId: true, branchId: true },
      });
      if (bkg) {
        orgId = bkg.organizationId;
        brId = bkg.branchId;
      }
    }

    const invoice = await client.invoice.create({
      data: {
        invoiceNumber,
        bookingId: params.bookingId,
        customerId: params.customerId,
        organizationId: orgId || null,
        branchId: brId || null,
        netAmount: totalNet,
        taxAmount: totalTax,
        totalAmount,
        currency,
        status: 'ISSUED',
        dueAt,
        lines: {
          create: formattedLines,
        },
      },
      include: {
        lines: true,
      },
    });

    return {
      ...invoice,
      netMoney: new Money(invoice.netAmount, invoice.currency),
      taxMoney: new Money(invoice.taxAmount, invoice.currency),
      totalMoney: new Money(invoice.totalAmount, invoice.currency),
    };
  }

  /**
   * Retrieves an invoice by primary ID or invoice number with ownership verification.
   */
  static async getInvoiceById(invoiceIdOrNumber: string, callerUserId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ id: invoiceIdOrNumber }, { invoiceNumber: invoiceIdOrNumber }],
      },
      include: {
        lines: true,
        organization: true,
        branch: true,
      },
    });

    if (!invoice) return null;

    if (callerUserId && invoice.customerId !== callerUserId) {
      // Check if caller belongs to the organization
      if (invoice.organizationId) {
        const isMember = await prisma.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invoice.organizationId,
              userId: callerUserId,
            },
          },
        });
        if (!isMember) {
          throw new Error('شما دسترسی به این فاکتور را ندارید.');
        }
      } else {
        throw new Error('شما دسترسی به این فاکتور را ندارید.');
      }
    }

    return {
      ...invoice,
      netMoney: new Money(invoice.netAmount, invoice.currency),
      taxMoney: new Money(invoice.taxAmount, invoice.currency),
      totalMoney: new Money(invoice.totalAmount, invoice.currency),
    };
  }

  /**
   * Retrieves an invoice by its associated booking ID.
   */
  static async getInvoiceByBookingId(bookingId: string, callerUserId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { bookingId },
      include: {
        lines: true,
        organization: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) return null;

    if (callerUserId && invoice.customerId !== callerUserId) {
      if (invoice.organizationId) {
        const isMember = await prisma.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invoice.organizationId,
              userId: callerUserId,
            },
          },
        });
        if (!isMember) throw new Error('عدم دسترسی به فاکتور این رزرو.');
      } else {
        throw new Error('عدم دسترسی به فاکتور این رزرو.');
      }
    }

    return {
      ...invoice,
      netMoney: new Money(invoice.netAmount, invoice.currency),
      taxMoney: new Money(invoice.taxAmount, invoice.currency),
      totalMoney: new Money(invoice.totalAmount, invoice.currency),
    };
  }

  /**
   * Synthesizes official statutory tax invoice data snapshot (صورتحساب الکترونیکی فروش کالا و خدمات ماده ۱۶۹ م.م)
   */
  static async getOfficialTaxInvoiceData(
    invoiceIdOrNumber: string,
    callerUserId?: string
  ): Promise<OfficialTaxInvoicePayload | null> {
    const invoice = await this.getInvoiceById(invoiceIdOrNumber, callerUserId);
    if (!invoice) return null;

    const [customer, booking] = await Promise.all([
      prisma.user.findUnique({
        where: { id: invoice.customerId },
        select: {
          id: true,
          name: true,
          firstNameFa: true,
          lastNameFa: true,
          email: true,
          phone: true,
          nationalId: true,
        },
      }),
      invoice.bookingId
        ? prisma.booking.findUnique({
            where: { id: invoice.bookingId },
            select: { reference: true },
          })
        : null,
    ]);

    // Jalali Date
    const jDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(invoice.issuedAt));

    // Buyer Information
    const isCorporate = Boolean(invoice.organizationId && invoice.organization);
    const buyerName = isCorporate
      ? invoice.organization!.displayName
      : customer?.firstNameFa && customer?.lastNameFa
      ? `${customer.firstNameFa} ${customer.lastNameFa}`
      : customer?.name || 'خریدار محترم';

    const buyerNationalId = isCorporate
      ? invoice.organization?.taxNo || invoice.organization?.registrationNo || null
      : customer?.nationalId || null;

    const buyerEconomicCode = isCorporate ? invoice.organization?.taxNo || null : null;

    const netAmountNum = Number(invoice.netAmount);
    const taxAmountNum = Number(invoice.taxAmount);
    const totalAmountNum = Number(invoice.totalAmount);

    // Internal fiscal tracking reference (§22): this is a LOCAL, Firuzo-side
    // sequential reference for traceability. It is NOT a Moadian/authority-
    // issued tax serial and must never be presented as one — the platform has
    // no tax-authority integration yet (capability: OFFICIAL_FORMAT only).
    const fiscalSerial = `TX-${invoice.issuedAt.getFullYear()}-${invoice.invoiceNumber.slice(-8)}`;

    const totalInWordsFa = this.numberToPersianWords(totalAmountNum, invoice.currency);

    const lines = invoice.lines.map((l, index) => {
      const uPrice = Number(l.unitPrice);
      const tPrice = Number(l.totalPrice);
      const taxAmt = Number(l.taxAmount);
      const taxRate = tPrice > 0 ? Math.round((taxAmt / tPrice) * 100) : 0;

      return {
        rowNumber: index + 1,
        description: l.description,
        quantity: l.quantity,
        unitPrice: uPrice,
        totalPrice: tPrice,
        discountAmount: 0,
        taxRatePercent: taxRate,
        taxAmount: taxAmt,
        finalAmount: tPrice + taxAmt,
      };
    });

    const qrCodePayload = `https://firuzo.com/verify-invoice?num=${encodeURIComponent(invoice.invoiceNumber)}&total=${totalAmountNum}&cur=${invoice.currency}&sec=${fiscalSerial}`;

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        fiscalSerial,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        issuedAtJalali: jDate,
        dueAt: invoice.dueAt,
        currency: invoice.currency,
        netAmount: netAmountNum,
        taxAmount: taxAmountNum,
        totalAmount: totalAmountNum,
        totalInWordsFa,
      },
      seller: getStatutorySellerInfo(),
      buyer: {
        isCorporate,
        name: buyerName,
        legalName: invoice.organization?.legalName || null,
        nationalId: buyerNationalId,
        economicCode: buyerEconomicCode,
        phone: customer?.phone || null,
        email: customer?.email || null,
        organizationName: invoice.organization?.displayName || null,
      },
      lines,
      bookingReference: booking?.reference || null,
      qrCodePayload,
    };
  }

  /**
   * Converts numbers into Persian words representation for formal financial bills.
   */
  static numberToPersianWords(amount: number, currency = 'IRR'): string {
    if (!amount || amount === 0) return 'صفر ریال';

    // Display in Toman if IRR
    const isRial = currency === 'IRR';
    const numToConvert = isRial ? Math.floor(amount / 10) : amount;
    const unit = isRial ? 'تومان' : currency;

    const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
    const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
    const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
    const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
    const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

    function convertGroup(n: number): string {
      let str = '';
      const c = Math.floor(n / 100);
      const remainder = n % 100;
      const b = Math.floor(remainder / 10);
      const a = remainder % 10;

      if (c > 0) {
        str += hundreds[c];
      }

      if (remainder > 0) {
        if (str.length > 0) str += ' و ';
        if (remainder < 10) {
          str += ones[remainder];
        } else if (remainder < 20) {
          str += teens[remainder - 10];
        } else {
          str += tens[b];
          if (a > 0) {
            str += ' و ' + ones[a];
          }
        }
      }
      return str;
    }

    const chunks: number[] = [];
    let n = Math.abs(numToConvert);
    while (n > 0) {
      chunks.push(n % 1000);
      n = Math.floor(n / 1000);
    }

    const words: string[] = [];
    for (let i = chunks.length - 1; i >= 0; i--) {
      const chunk = chunks[i];
      if (chunk > 0) {
        const text = convertGroup(chunk);
        const scale = scales[i];
        words.push(scale ? `${text} ${scale}` : text);
      }
    }

    return `${words.join(' و ')} ${unit}`;
  }
}
