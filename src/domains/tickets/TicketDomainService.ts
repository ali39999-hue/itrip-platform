import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/observability/logger';

const logger = createLogger('ticket-domain-service');

interface RelationalSupportTicketDelegate {
  supportTicket?: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  };
  ticketMessage?: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

const dynamicPrisma = prisma as unknown as RelationalSupportTicketDelegate;

export type TicketCategory =
  | 'FLIGHTS'
  | 'HOTELS'
  | 'TOURS'
  | 'REFUNDS'
  | 'FINANCIAL'
  | 'GENERAL';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'RESOLVED'
  | 'CLOSED';

export interface TicketMessageRecord {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorName: string;
  senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  message: string;
  createdAt: string;
}

export interface TicketSlaStatus {
  policyName: string;
  responseDueAt: string;
  resolutionDueAt: string;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  isFirstResponseBreached: boolean;
  isResolutionBreached: boolean;
}

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateTicketAttachment(file: {
  name: string;
  size: number;
  mimeType: string;
}): { valid: boolean; error?: string } {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { valid: false, error: 'حجم فایل نباید بیش از ۱۰ مگابایت باشد.' };
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return { valid: false, error: 'نوع فایل مجاز نیست. فقط تصاویر (JPEG, PNG, WebP) و PDF پذیرفته می‌شوند.' };
  }
  if (/[\\\/]|\.\./.test(file.name)) {
    return { valid: false, error: 'نام فایل نامعتبر است.' };
  }
  return { valid: true };
}

export function computeTicketSla(
  createdAtStr: string,
  priority: TicketPriority,
  messages: TicketMessageRecord[],
  status: TicketStatus
): TicketSlaStatus {
  const created = new Date(createdAtStr).getTime();
  const slaHours =
    priority === 'URGENT'
      ? { resp: 1, res: 4 }
      : priority === 'HIGH'
        ? { resp: 2, res: 12 }
        : priority === 'LOW'
          ? { resp: 8, res: 48 }
          : { resp: 4, res: 24 };

  const responseDue = new Date(created + slaHours.resp * 3600 * 1000);
  const resolutionDue = new Date(created + slaHours.res * 3600 * 1000);

  const firstStaffMsg = messages.find((m) => m.senderType === 'STAFF');
  const firstResponseAt = firstStaffMsg ? firstStaffMsg.createdAt : null;

  const resolvedMsg =
    status === 'RESOLVED' || status === 'CLOSED'
      ? messages[messages.length - 1]?.createdAt || new Date().toISOString()
      : null;

  const now = Date.now();
  const isFirstResponseBreached = firstResponseAt
    ? new Date(firstResponseAt).getTime() > responseDue.getTime()
    : now > responseDue.getTime();

  const isResolutionBreached = resolvedMsg
    ? new Date(resolvedMsg).getTime() > resolutionDue.getTime()
    : status !== 'RESOLVED' && status !== 'CLOSED' && now > resolutionDue.getTime();

  return {
    policyName: `SLA_${priority}`,
    responseDueAt: responseDue.toISOString(),
    resolutionDueAt: resolutionDue.toISOString(),
    firstResponseAt,
    resolvedAt: resolvedMsg,
    isFirstResponseBreached,
    isResolutionBreached,
  };
}

export interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  bookingRef: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageRecord[];
  sla?: TicketSlaStatus;
}

export interface TicketSummaryItem {
  id: string;
  ticketNumber: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  bookingRef: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet: string;
  messageCount: number;
  sla?: TicketSlaStatus;
}

const MANIFEST_KEY = 'tickets:manifest';

export class TicketDomainService {
  /**
   * Generates sequential or timestamped human-readable ticket number (e.g. TCK-2609-1001)
   */
  private static generateTicketNumber(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    const datePart = new Date().toISOString().slice(2, 7).replace('-', '');
    return `TCK-${datePart}-${random}`;
  }

  /**
   * Reads all ticket summaries from persistent manifest
   */
  static async getManifest(): Promise<TicketSummaryItem[]> {
    try {
      const record = await prisma.siteContent.findUnique({
        where: { key: MANIFEST_KEY },
      });
      if (!record || !record.payload) return [];
      return JSON.parse(record.payload) as TicketSummaryItem[];
    } catch (err) {
      logger.error('Failed to read ticket manifest', { err });
      return [];
    }
  }

  /**
   * Saves updated ticket summaries manifest
   */
  private static async saveManifest(items: TicketSummaryItem[], authorId?: string): Promise<void> {
    await prisma.siteContent.upsert({
      where: { key: MANIFEST_KEY },
      create: {
        key: MANIFEST_KEY,
        payload: JSON.stringify(items),
        updatedBy: authorId || 'system',
      },
      update: {
        payload: JSON.stringify(items),
        updatedBy: authorId || 'system',
      },
    });
  }

  /**
   * Reads full ticket details including full message history
   */
  static async getTicketById(id: string): Promise<SupportTicketRecord | null> {
    try {
      const key = `ticket:${id}`;
      const record = await prisma.siteContent.findUnique({
        where: { key },
      });
      if (!record || !record.payload) return null;
      return JSON.parse(record.payload) as SupportTicketRecord;
    } catch (err) {
      logger.error('Failed to get ticket by id', { id, err });
      return null;
    }
  }

  /**
   * Creates a new support ticket and logs outbox event
   */
  static async createTicket(input: {
    userId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    subject: string;
    category: TicketCategory;
    priority?: TicketPriority;
    bookingRef?: string | null;
    message: string;
  }): Promise<SupportTicketRecord> {
    const now = new Date().toISOString();
    const id = `tck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ticketNumber = this.generateTicketNumber();

    const initialMessage: TicketMessageRecord = {
      id: `msg_${Date.now()}_1`,
      ticketId: id,
      authorId: input.userId || null,
      authorName: input.name,
      senderType: 'CUSTOMER',
      message: input.message.trim(),
      createdAt: now,
    };

    const sla = computeTicketSla(now, input.priority || 'MEDIUM', [initialMessage], 'OPEN');

    const ticket: SupportTicketRecord = {
      id,
      ticketNumber,
      userId: input.userId || null,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      subject: input.subject.trim(),
      category: input.category,
      priority: input.priority || 'MEDIUM',
      status: 'OPEN',
      bookingRef: input.bookingRef?.trim() || null,
      createdAt: now,
      updatedAt: now,
      messages: [initialMessage],
      sla,
    };

    // 1. Save full ticket record to siteContent (manifest cache)
    await prisma.siteContent.create({
      data: {
        key: `ticket:${id}`,
        payload: JSON.stringify(ticket),
        updatedBy: input.userId || 'guest',
      },
    });

    // 1.5. Dual-write to relational PostgreSQL SupportTicket & TicketMessage tables (CRM-001)
    try {
      if (dynamicPrisma.supportTicket) {
        await dynamicPrisma.supportTicket.create({
          data: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            userId: ticket.userId,
            name: ticket.name,
            email: ticket.email,
            phone: ticket.phone,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            bookingRef: ticket.bookingRef,
            messages: {
              create: {
                id: initialMessage.id,
                authorId: initialMessage.authorId,
                authorName: initialMessage.authorName,
                senderType: initialMessage.senderType,
                message: initialMessage.message,
                createdAt: new Date(initialMessage.createdAt),
              },
            },
          },
        }).catch(() => null);
      }
    } catch {
      // Best-effort relational write
    }

    // 2. Update manifest index
    const manifest = await this.getManifest();
    const summary: TicketSummaryItem = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      bookingRef: ticket.bookingRef,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastMessageSnippet: ticket.messages[0].message.slice(0, 100),
      messageCount: 1,
      sla,
    };
    manifest.unshift(summary);
    await this.saveManifest(manifest, input.userId || 'guest');

    // 3. Emit outbox event for staff notification
    try {
      await prisma.outboxEvent.create({
        data: {
          eventType: 'TICKET_CREATED',
          aggregateType: 'SUPPORT_TICKET',
          aggregateId: ticket.id,
          payload: JSON.stringify({
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            category: ticket.category,
            customerName: ticket.name,
            customerPhone: ticket.phone,
          }),
        },
      });
    } catch {
      // Non-blocking outbox event
    }

    return ticket;
  }

  /**
   * Adds reply to an existing ticket (by customer or staff)
   */
  static async addReply(input: {
    ticketId: string;
    authorId?: string | null;
    authorName: string;
    senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
    message: string;
  }): Promise<{ ticket: SupportTicketRecord; message: TicketMessageRecord }> {
    const ticket = await this.getTicketById(input.ticketId);
    if (!ticket) {
      throw new Error('تیکت یافت نشد');
    }

    const now = new Date().toISOString();
    const newMessage: TicketMessageRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticketId: ticket.id,
      authorId: input.authorId || null,
      authorName: input.authorName,
      senderType: input.senderType,
      message: input.message.trim(),
      createdAt: now,
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = now;

    // Transition status based on responder
    if (input.senderType === 'STAFF') {
      ticket.status = 'WAITING_USER';
    } else if (input.senderType === 'CUSTOMER') {
      ticket.status = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED' ? 'OPEN' : 'IN_PROGRESS';
    }

    // Recompute operational SLA
    ticket.sla = computeTicketSla(ticket.createdAt, ticket.priority, ticket.messages, ticket.status);

    // 1. Save ticket to cache/manifest
    await prisma.siteContent.update({
      where: { key: `ticket:${ticket.id}` },
      data: {
        payload: JSON.stringify(ticket),
        updatedBy: input.authorId || 'system',
      },
    });

    // 1.5. Dual-write to relational PostgreSQL SupportTicket & TicketMessage tables (CRM-001)
    try {
      if (dynamicPrisma.ticketMessage) {
        await dynamicPrisma.ticketMessage.create({
          data: {
            id: newMessage.id,
            ticketId: ticket.id,
            authorId: newMessage.authorId,
            authorName: newMessage.authorName,
            senderType: newMessage.senderType,
            message: newMessage.message,
            createdAt: new Date(newMessage.createdAt),
          },
        }).catch(() => null);
      }
      if (dynamicPrisma.supportTicket) {
        await dynamicPrisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: ticket.status,
            updatedAt: new Date(now),
          },
        }).catch(() => null);
      }
    } catch {}

    // 2. Update manifest
    const manifest = await this.getManifest();
    const idx = manifest.findIndex((m) => m.id === ticket.id);
    if (idx !== -1) {
      manifest[idx].updatedAt = now;
      manifest[idx].status = ticket.status;
      manifest[idx].lastMessageSnippet = newMessage.message.slice(0, 100);
      manifest[idx].messageCount = ticket.messages.length;
      manifest[idx].sla = ticket.sla;
      // Bring updated ticket to top
      const item = manifest.splice(idx, 1)[0];
      manifest.unshift(item);
      await this.saveManifest(manifest, input.authorId || 'system');
    }

    // 3. Emit notification outbox event
    try {
      await prisma.outboxEvent.create({
        data: {
          eventType: 'TICKET_REPLIED',
          aggregateType: 'SUPPORT_TICKET',
          aggregateId: ticket.id,
          payload: JSON.stringify({
            ticketNumber: ticket.ticketNumber,
            senderType: input.senderType,
            authorName: input.authorName,
            recipientPhone: input.senderType === 'STAFF' ? ticket.phone : undefined,
            messageSnippet: newMessage.message.slice(0, 80),
          }),
        },
      });
    } catch {}

    return { ticket, message: newMessage };
  }

  /**
   * Updates status or priority of a ticket
   */
  static async updateTicket(
    id: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      adminNote?: string;
    },
    staffId: string
  ): Promise<SupportTicketRecord> {
    const ticket = await this.getTicketById(id);
    if (!ticket) {
      throw new Error('تیکت یافت نشد');
    }

    const now = new Date().toISOString();
    if (updates.status) ticket.status = updates.status;
    if (updates.priority) ticket.priority = updates.priority;
    ticket.updatedAt = now;

    if (updates.adminNote?.trim()) {
      ticket.messages.push({
        id: `msg_${Date.now()}_sys`,
        ticketId: ticket.id,
        authorId: staffId,
        authorName: 'سیستم پشتیبانی',
        senderType: 'SYSTEM',
        message: `[یادداشت اپراتور]: ${updates.adminNote.trim()}`,
        createdAt: now,
      });
    }

    // Recompute operational SLA
    ticket.sla = computeTicketSla(ticket.createdAt, ticket.priority, ticket.messages, ticket.status);

    await prisma.siteContent.update({
      where: { key: `ticket:${ticket.id}` },
      data: {
        payload: JSON.stringify(ticket),
        updatedBy: staffId,
      },
    });

    // Dual-write to relational PostgreSQL SupportTicket (CRM-001)
    try {
      if (dynamicPrisma.supportTicket) {
        await dynamicPrisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: ticket.status,
            priority: ticket.priority,
            updatedAt: new Date(now),
          },
        }).catch(() => null);
      }
    } catch {}

    const manifest = await this.getManifest();
    const idx = manifest.findIndex((m) => m.id === ticket.id);
    if (idx !== -1) {
      manifest[idx].updatedAt = now;
      if (updates.status) manifest[idx].status = updates.status;
      if (updates.priority) manifest[idx].priority = updates.priority;
      manifest[idx].sla = ticket.sla;
      await this.saveManifest(manifest, staffId);
    }

    return ticket;
  }

  /**
   * Fetches tickets for a specific customer by userId or phone/email
   */
  static async getUserTickets(userId: string, phoneOrEmail?: string): Promise<TicketSummaryItem[]> {
    const manifest = await this.getManifest();
    return manifest.filter(
      (t) =>
        t.userId === userId ||
        (phoneOrEmail && (t.phone === phoneOrEmail || t.email === phoneOrEmail))
    );
  }
}
