import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/observability/logger';

const logger = createLogger('ticket-domain-service');

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
    };

    // 1. Save full ticket record
    await prisma.siteContent.create({
      data: {
        key: `ticket:${id}`,
        payload: JSON.stringify(ticket),
        updatedBy: input.userId || 'guest',
      },
    });

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

    // 1. Save ticket
    await prisma.siteContent.update({
      where: { key: `ticket:${ticket.id}` },
      data: {
        payload: JSON.stringify(ticket),
        updatedBy: input.authorId || 'system',
      },
    });

    // 2. Update manifest
    const manifest = await this.getManifest();
    const idx = manifest.findIndex((m) => m.id === ticket.id);
    if (idx !== -1) {
      manifest[idx].updatedAt = now;
      manifest[idx].status = ticket.status;
      manifest[idx].lastMessageSnippet = newMessage.message.slice(0, 100);
      manifest[idx].messageCount = ticket.messages.length;
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

    await prisma.siteContent.update({
      where: { key: `ticket:${ticket.id}` },
      data: {
        payload: JSON.stringify(ticket),
        updatedBy: staffId,
      },
    });

    const manifest = await this.getManifest();
    const idx = manifest.findIndex((m) => m.id === ticket.id);
    if (idx !== -1) {
      manifest[idx].updatedAt = now;
      if (updates.status) manifest[idx].status = updates.status;
      if (updates.priority) manifest[idx].priority = updates.priority;
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
