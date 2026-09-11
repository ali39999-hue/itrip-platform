'use server';

import { safeAuth } from '@/auth';
import {
  InvoiceDomainService,
  OfficialTaxInvoicePayload,
} from '@/domains/finance/InvoiceDomainService';
import { hasErpRole } from '@/domains/identity/permission-service';

export async function getOfficialTaxInvoiceAction(invoiceIdOrNumber: string): Promise<{
  success: boolean;
  data?: OfficialTaxInvoicePayload;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'برای مشاهده فاکتور رسمی ابتدا وارد حساب کاربری خود شوید.' };
    }

    const isStaff = await hasErpRole(session.user.id);
    const taxData = await InvoiceDomainService.getOfficialTaxInvoiceData(
      invoiceIdOrNumber,
      isStaff ? undefined : session.user.id
    );

    if (!taxData) {
      return { success: false, error: 'صورتحساب مورد نظر یافت نشد.' };
    }

    return { success: true, data: taxData };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در بارگذاری صورتحساب رسمی';
    return { success: false, error: msg };
  }
}

export async function getBookingInvoiceAction(bookingId: string): Promise<{
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    const isStaff = await hasErpRole(session.user.id);
    const invoice = await InvoiceDomainService.getInvoiceByBookingId(
      bookingId,
      isStaff ? undefined : session.user.id
    );

    if (!invoice) {
      return { success: false, error: 'فاکتور این رزرو هنوز صادر نشده است.' };
    }

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در واکشی فاکتور رزرو';
    return { success: false, error: msg };
  }
}
