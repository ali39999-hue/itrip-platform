'use server';

import { z } from 'zod';
import { safeAuth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { requirePermission, hasErpRole } from '@/domains/identity/permission-service';
import {
  TicketDomainService,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SupportTicketRecord,
  TicketSummaryItem,
} from '@/domains/tickets/TicketDomainService';

const createTicketSchema = z.object({
  name: z.string().trim().min(2, 'نام باید حداقل ۲ حرف باشد').max(100),
  email: z.string().trim().email('ایمیل معتبر نیست').optional().or(z.literal('')),
  phone: z.string().trim().min(8, 'شماره تماس معتبر نیست').optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'موضوع پیام باید حداقل ۳ حرف باشد').max(200),
  category: z.enum(['FLIGHTS', 'HOTELS', 'TOURS', 'REFUNDS', 'FINANCIAL', 'GENERAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  bookingRef: z.string().trim().max(50).optional().or(z.literal('')),
  message: z.string().trim().min(5, 'متن پیام باید حداقل ۵ حرف باشد').max(5000),
});

export async function createSupportTicketAction(
  rawInput: z.infer<typeof createTicketSchema>
): Promise<{ success: boolean; ticket?: SupportTicketRecord; error?: string }> {
  try {
    const validated = createTicketSchema.parse(rawInput);
    const session = await safeAuth();

    const ticket = await TicketDomainService.createTicket({
      userId: session?.user?.id || null,
      name: validated.name,
      email: validated.email || session?.user?.email || null,
      phone: validated.phone || (session?.user as { phone?: string | null })?.phone || null,
      subject: validated.subject,
      category: validated.category as TicketCategory,
      priority: (validated.priority as TicketPriority) || 'MEDIUM',
      bookingRef: validated.bookingRef || null,
      message: validated.message,
    });

    revalidatePath('/support');
    revalidatePath('/account');
    revalidatePath('/admin/tickets');
    return { success: true, ticket };
  } catch (err: unknown) {
    console.error('[createSupportTicketAction] error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در ثبت تیکت پشتیبانی',
    };
  }
}

export async function getUserTicketsAction(): Promise<{
  success: boolean;
  tickets: TicketSummaryItem[];
  error?: string;
}> {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return { success: true, tickets: [] };
    }

    const tickets = await TicketDomainService.getUserTickets(
      session.user.id,
      ((session.user as { phone?: string | null })?.phone || session.user.email || undefined)
    );
    return { success: true, tickets };
  } catch (err: unknown) {
    return {
      success: false,
      tickets: [],
      error: err instanceof Error ? err.message : 'خطا در دریافت تیکت‌ها',
    };
  }
}

export async function getTicketDetailsAction(
  ticketId: string
): Promise<{ success: boolean; ticket?: SupportTicketRecord; error?: string }> {
  try {
    const session = await safeAuth();
    const ticket = await TicketDomainService.getTicketById(ticketId);
    if (!ticket) {
      return { success: false, error: 'تیکت مورد نظر یافت نشد' };
    }

    const isOwner = session?.user?.id && ticket.userId === session.user.id;
    const isStaff = await hasErpRole(session?.user?.id);

    // Allow owner or staff, or guest if created in this session
    if (!isOwner && !isStaff && ticket.userId) {
      return { success: false, error: 'عدم دسترسی به این تیکت' };
    }

    return { success: true, ticket };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در بارگذاری جزئیات تیکت',
    };
  }
}

export async function addTicketReplyAction(
  ticketId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!message?.trim()) {
      return { success: false, error: 'متن پاسخ نمی‌تواند خالی باشد' };
    }

    const session = await safeAuth();
    const ticket = await TicketDomainService.getTicketById(ticketId);
    if (!ticket) {
      return { success: false, error: 'تیکت یافت نشد' };
    }

    const isStaff = await hasErpRole(session?.user?.id);

    const authorName = isStaff
      ? session?.user?.name || 'پشتیبانی فیروزو'
      : session?.user?.name || ticket.name;

    await TicketDomainService.addReply({
      ticketId,
      authorId: session?.user?.id || null,
      authorName,
      senderType: isStaff ? 'STAFF' : 'CUSTOMER',
      message,
    });

    revalidatePath('/support');
    revalidatePath(`/admin/tickets`);
    revalidatePath('/account');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در ارسال پاسخ',
    };
  }
}

export async function getAdminTicketsAction(params?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<{
  success: boolean;
  tickets: TicketSummaryItem[];
  counts: { total: number; open: number; inProgress: number; waitingUser: number; resolved: number };
  error?: string;
}> {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);

    let items = await TicketDomainService.getManifest();

    const counts = {
      total: items.length,
      open: items.filter((i) => i.status === 'OPEN').length,
      inProgress: items.filter((i) => i.status === 'IN_PROGRESS').length,
      waitingUser: items.filter((i) => i.status === 'WAITING_USER').length,
      resolved: items.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    };

    if (params?.status && params.status !== 'ALL') {
      items = items.filter((i) => i.status === params.status);
    }

    if (params?.category && params.category !== 'ALL') {
      items = items.filter((i) => i.category === params.category);
    }

    if (params?.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.ticketNumber.toLowerCase().includes(q) ||
          i.subject.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.phone && i.phone.includes(q)) ||
          (i.email && i.email.toLowerCase().includes(q)) ||
          (i.bookingRef && i.bookingRef.toLowerCase().includes(q))
      );
    }

    return { success: true, tickets: items, counts };
  } catch (err: unknown) {
    console.error('[getAdminTicketsAction] error:', err);
    return {
      success: false,
      tickets: [],
      counts: { total: 0, open: 0, inProgress: 0, waitingUser: 0, resolved: 0 },
      error: err instanceof Error ? err.message : 'عدم دسترسی به تیکت‌های پشتیبانی',
    };
  }
}

export async function updateAdminTicketStatusAction(params: {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission(['booking:view:all', 'ops:override:cancel']);

    await TicketDomainService.updateTicket(
      params.ticketId,
      {
        status: params.status,
        priority: params.priority,
        adminNote: params.adminNote,
      },
      admin.id
    );

    revalidatePath('/admin/tickets');
    revalidatePath('/support');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در به‌روزرسانی وضعیت تیکت',
    };
  }
}
