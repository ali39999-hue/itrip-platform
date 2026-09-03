import { describe, it, expect } from 'vitest';
import {
  ConsoleNotificationProvider,
  ProductionNotificationProvider,
  getNotificationProvider
} from './NotificationProvider';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';

describe('NotificationProvider Unit Tests', () => {
  it('ConsoleNotificationProvider simulates SMS delivery without errors', async () => {
    const provider = new ConsoleNotificationProvider();
    const res = await provider.sendSms('+989123456789', 'کد تایید ۱۲۳۴');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
    expect(res.messageId).toBeDefined();
  });

  it('ConsoleNotificationProvider simulates email delivery without errors', async () => {
    const provider = new ConsoleNotificationProvider();
    const res = await provider.sendEmail('test@firuzo.com', 'خوش‌آمدید', 'متن ایمیل آزمایشی');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
  });

  it('getNotificationProvider returns ConsoleNotificationProvider in test environment', () => {
    const provider = getNotificationProvider();
    expect(provider.name).toBe('console-simulator');
  });

  it('ProductionNotificationProvider gracefully falls back to console if API key is missing', async () => {
    const prodProvider = new ProductionNotificationProvider('');
    const res = await prodProvider.sendSms('+989120000000', 'تست غیاب کلید');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
  });
});

describe('ReconciliationService Unit Tests', () => {
  it('generates a valid balance report for the current database ledger', async () => {
    const report = await ReconciliationService.reconcileLedger();
    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(typeof report.totalGroupsChecked).toBe('number');
    expect(typeof report.unbalancedGroupsCount).toBe('number');
    expect(Array.isArray(report.mismatches)).toBe(true);
    // Any properly posted double-entry group should have debit === credit
    expect(report.unbalancedGroupsCount).toBe(0);
    expect(report.isBalanced).toBe(true);
  });
});
