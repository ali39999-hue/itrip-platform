import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketDomainService } from './TicketDomainService';
import { prisma } from '@/lib/prisma';

describe('TicketDomainService - CRM & Support Architecture Tests', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.spyOn(prisma.siteContent, 'findUnique').mockImplementation(async ({ where }) => {
      const payload = mockStorage.get(where.key);
      if (!payload) return null as any;
      return {
        key: where.key,
        payload,
        updatedBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    });

    vi.spyOn(prisma.siteContent, 'create').mockImplementation(async ({ data }) => {
      mockStorage.set(data.key, data.payload);
      return data as any;
    });

    vi.spyOn(prisma.siteContent, 'update').mockImplementation(async ({ where, data }) => {
      mockStorage.set(where.key, data.payload as string);
      return { key: where.key, payload: data.payload } as any;
    });

    vi.spyOn(prisma.siteContent, 'upsert').mockImplementation(async ({ where, create, update }) => {
      const payload = mockStorage.has(where.key) ? update.payload : create.payload;
      mockStorage.set(where.key, payload as string);
      return { key: where.key, payload } as any;
    });

    vi.spyOn(prisma.outboxEvent, 'create').mockImplementation(async ({ data }) => {
      return { id: 'outbox_1', ...data } as any;
    });
  });

  it('creates support ticket with valid tracking number and initial message', async () => {
    const ticket = await TicketDomainService.createTicket({
      userId: 'user_123',
      name: 'امیر رضایی',
      phone: '09121111111',
      email: 'amir@example.com',
      subject: 'درخواست تغییر تاریخ پرواز مشهد',
      category: 'FLIGHTS',
      priority: 'HIGH',
      bookingRef: 'ITR-9988',
      message: 'سلام، امکان جابجایی پرواز به روز بعد وجود دارد؟',
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.ticketNumber).toMatch(/^TCK-\d{4}-\d{4}$/);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.priority).toBe('HIGH');
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.messages[0].senderType).toBe('CUSTOMER');
    expect(ticket.messages[0].authorName).toBe('امیر رضایی');
  });

  it('handles staff reply and transitions status to WAITING_USER', async () => {
    const ticket = await TicketDomainService.createTicket({
      name: 'سارا حسینی',
      subject: 'سوال درباره هتل استانبول',
      category: 'HOTELS',
      message: 'ساعت تحویل اتاق چه زمانی است؟',
    });

    const replyResult = await TicketDomainService.addReply({
      ticketId: ticket.id,
      authorName: 'پشتیبانی پرواز فیروزو',
      senderType: 'STAFF',
      message: 'با سلام، ساعت پذیرش و تحویل اتاق ساعت ۱۴:۰۰ به وقت محلی می‌باشد.',
    });

    expect(replyResult.ticket.status).toBe('WAITING_USER');
    expect(replyResult.ticket.messages).toHaveLength(2);
    expect(replyResult.ticket.messages[1].senderType).toBe('STAFF');
  });

  it('handles customer follow-up reply and transitions status to IN_PROGRESS', async () => {
    const ticket = await TicketDomainService.createTicket({
      name: 'مریم احمدی',
      subject: 'استرداد بلیط',
      category: 'REFUNDS',
      message: 'درخواست لغو دارم',
    });

    // Staff responds
    await TicketDomainService.addReply({
      ticketId: ticket.id,
      authorName: 'اپراتور',
      senderType: 'STAFF',
      message: 'درخواست شما بررسی شد.',
    });

    // Customer replies back
    const followUp = await TicketDomainService.addReply({
      ticketId: ticket.id,
      authorName: 'مریم احمدی',
      senderType: 'CUSTOMER',
      message: 'ممنون، وجه چه زمانی واریز می‌شود؟',
    });

    expect(followUp.ticket.status).toBe('IN_PROGRESS');
    expect(followUp.ticket.messages).toHaveLength(3);
  });

  it('updates ticket status to RESOLVED and logs system operator note', async () => {
    const ticket = await TicketDomainService.createTicket({
      name: 'کامبیز راد',
      subject: 'شارژ کیف پول',
      category: 'FINANCIAL',
      message: 'فیش پرداخت ارسال شد',
    });

    const updated = await TicketDomainService.updateTicket(
      ticket.id,
      {
        status: 'RESOLVED',
        adminNote: 'فیش بانکی تایید و کیف پول شارژ شد.',
      },
      'admin_finance_1'
    );

    expect(updated.status).toBe('RESOLVED');
    const systemNotes = updated.messages.filter((m) => m.senderType === 'SYSTEM');
    expect(systemNotes).toHaveLength(1);
    expect(systemNotes[0].message).toContain('فیش بانکی تایید');
  });

  it('retrieves user tickets by userId and phone/email', async () => {
    await TicketDomainService.createTicket({
      userId: 'customer_alpha',
      name: 'Customer Alpha',
      phone: '09120000001',
      subject: 'Ticket 1',
      category: 'GENERAL',
      message: 'Test 1',
    });

    await TicketDomainService.createTicket({
      userId: 'customer_alpha',
      name: 'Customer Alpha',
      phone: '09120000001',
      subject: 'Ticket 2',
      category: 'TOURS',
      message: 'Test 2',
    });

    await TicketDomainService.createTicket({
      userId: 'customer_beta',
      name: 'Customer Beta',
      phone: '09120000002',
      subject: 'Ticket 3',
      category: 'FLIGHTS',
      message: 'Test 3',
    });

    const alphaTickets = await TicketDomainService.getUserTickets('customer_alpha');
    expect(alphaTickets).toHaveLength(2);

    const betaTickets = await TicketDomainService.getUserTickets('customer_beta');
    expect(betaTickets).toHaveLength(1);
  });
});
