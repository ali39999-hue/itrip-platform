import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  escapeCsvCell,
  formatAccountingJalaliDate,
  buildAccountingCsv,
  AccountingExportRow,
} from '@/domains/ledger/AccountingExportService';
import {
  ApprovalChainDomainService,
  MakerCheckerSelfApprovalError,
  InsufficientApprovalAuthorityError,
  ApprovalRequestItem,
} from '@/domains/erp/ApprovalChainDomainService';
import {
  computeFieldDiff,
} from '@/domains/erp/EntityChangeTracker';

describe('ERP Enhanced Capabilities Suite (aroux30/site doctrine)', () => {
  describe('AccountingExportService - Iranian Accounting Standard Feeds', () => {
    it('escapes cells against CSV formula injection (OWASP / RFC 4180)', () => {
      expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(escapeCsvCell('+989123456789')).toBe(`"'+989123456789"`);
      expect(escapeCsvCell('-50000')).toBe(`"'-50000"`);
      expect(escapeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(escapeCsvCell('عادی')).toBe(`"عادی"`);
      expect(escapeCsvCell(null)).toBe('""');
    });

    it('formats Jalali date for Iranian accounting software (YYYY/MM/DD)', () => {
      // 2026-03-21 is 1405/01/01
      const d1 = new Date('2026-03-21T08:00:00Z');
      expect(formatAccountingJalaliDate(d1)).toBe('۱۴۰۵/۰۱/۰۱');
    });

    it('builds CSV with UTF-8 BOM and correct column order for Holoo/Sepidar', () => {
      const rows: AccountingExportRow[] = [
        {
          entryNumber: 'JE-1405-001',
          jalaliDate: '۱۴۰۵/۰۱/۰۱',
          isoDate: '2026-03-21T08:00:00.000Z',
          fiscalPeriod: '1405',
          accountCode: '1003',
          accountName: 'حسابهای دریافتنی',
          entryDescription: 'سند فروش بلیط پرواز',
          lineDescription: 'بدهکار دریافتنی مشتری',
          debit: 20000000,
          credit: 0,
          currency: 'IRR',
          referenceType: 'BOOKING',
          referenceId: 'BKG-123',
          status: 'POSTED',
        },
      ];

      const csv = buildAccountingCsv(rows);
      // UTF-8 BOM must be the very first character
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      // Contains the standard Iranian header
      expect(csv).toContain('شماره سند');
      expect(csv).toContain('تاریخ (شمسی)');
      expect(csv).toContain('بدهکار');
      expect(csv).toContain('بستانکار');
      // Contains the entry
      expect(csv).toContain('JE-1405-001');
      expect(csv).toContain('20000000');
    });
  });

  describe('ApprovalChainDomainService - Maker-Checker & Policy Chains', () => {
    it('evaluates approval tier by amount thresholds in Rials', () => {
      // <= 50M IRR -> LOW (Operator)
      expect(ApprovalChainDomainService.evaluateApprovalTier(30_000_000).tier).toBe('LOW');
      // 50M to 200M IRR -> MEDIUM (Branch Manager)
      expect(ApprovalChainDomainService.evaluateApprovalTier(100_000_000).tier).toBe('MEDIUM');
      // > 200M IRR -> HIGH (Financial Director)
      expect(ApprovalChainDomainService.evaluateApprovalTier(500_000_000).tier).toBe('HIGH');
    });

    it('enforces Separation of Duties (Maker cannot be Checker)', () => {
      expect(() => {
        ApprovalChainDomainService.assertSeparationOfDuties('user_123', 'user_123');
      }).toThrow(MakerCheckerSelfApprovalError);

      expect(() => {
        ApprovalChainDomainService.assertSeparationOfDuties('user_maker', 'user_checker');
      }).not.toThrow();
    });

    it('validates approver authority role against designated tier', () => {
      expect(ApprovalChainDomainService.validateApproverRole('HIGH', 'OPERATOR')).toBe(false);
      expect(ApprovalChainDomainService.validateApproverRole('HIGH', 'FINANCE_DIRECTOR')).toBe(true);
      expect(ApprovalChainDomainService.validateApproverRole('HIGH', 'SUPER_ADMIN')).toBe(true);
      expect(ApprovalChainDomainService.validateApproverRole('MEDIUM', 'BRANCH_MANAGER')).toBe(true);
      expect(ApprovalChainDomainService.validateApproverRole('LOW', 'OPERATOR')).toBe(true);
    });

    it('processes approval step transitions (PENDING -> APPROVED / IN_REVIEW / REJECTED)', () => {
      const mockRequest: ApprovalRequestItem = {
        id: 'req_1',
        type: 'REFUND',
        entityType: 'Refund',
        entityId: 'rfd_123',
        requesterUserId: 'user_agent_1',
        amount: new Prisma.Decimal('30000000'),
        currency: 'IRR',
        tier: 'LOW',
        status: 'PENDING',
        reason: 'کنسلی پرواز طبق درخواست مسافر',
        approvals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Operator attempts self-approval -> throws
      expect(() => {
        ApprovalChainDomainService.evaluateApprovalStep({
          request: mockRequest,
          approverUserId: 'user_agent_1',
          approverRole: 'OPERATOR',
          action: 'APPROVE',
        });
      }).toThrow(MakerCheckerSelfApprovalError);

      // Operator with insufficient authority attempts to approve high tier -> throws InsufficientApprovalAuthorityError
      expect(() => {
        ApprovalChainDomainService.evaluateApprovalStep({
          request: { ...mockRequest, tier: 'HIGH' },
          approverUserId: 'user_junior_op',
          approverRole: 'AGENT',
          action: 'APPROVE',
        });
      }).toThrow(InsufficientApprovalAuthorityError);

      // 2. Legitimate checker approves -> becomes APPROVED
      const result = ApprovalChainDomainService.evaluateApprovalStep({
        request: mockRequest,
        approverUserId: 'user_checker_2',
        approverRole: 'SUPERVISOR',
        action: 'APPROVE',
        notes: 'مورد تایید است',
      });

      expect(result.nextStatus).toBe('APPROVED');
      expect(result.record.approvals.length).toBe(1);

      // 3. High tier requires 2-step review
      const highValueRequest: ApprovalRequestItem = {
        ...mockRequest,
        amount: new Prisma.Decimal('300000000'),
        tier: 'HIGH',
        status: 'PENDING',
        approvals: [],
      };

      const step1 = ApprovalChainDomainService.evaluateApprovalStep({
        request: highValueRequest,
        approverUserId: 'user_mgr_1',
        approverRole: 'FINANCE_DIRECTOR',
        action: 'APPROVE',
      });

      expect(step1.nextStatus).toBe('IN_REVIEW');

      const step2 = ApprovalChainDomainService.evaluateApprovalStep({
        request: step1.record,
        approverUserId: 'user_cfo_2',
        approverRole: 'CFO',
        action: 'APPROVE',
      });

      expect(step2.nextStatus).toBe('APPROVED');
      expect(step2.record.approvals.length).toBe(2);
    });
  });

  describe('EntityChangeTracker - Field-Level Audit Diff Engine', () => {
    it('detects precise field modifications between states', () => {
      const oldState = {
        status: 'CONFIRMED',
        sellPrice: 20000000,
        passengerName: 'علی محمدی',
        updatedAt: new Date('2026-03-20'),
      };

      const newState = {
        status: 'CANCELLED',
        sellPrice: 18000000,
        passengerName: 'علی محمدی',
        updatedAt: new Date('2026-03-21'),
      };

      const diff = computeFieldDiff(oldState, newState);

      expect(diff.hasChanges).toBe(true);
      // updatedAt is ignored
      expect(diff.changedFields.length).toBe(2);
      expect(diff.changedFields.map((f) => f.field).sort()).toEqual(['sellPrice', 'status']);
      expect(diff.summary).toContain('تغییر در 2 فیلد');
    });

    it('redacts sensitive credentials in audit change logs', () => {
      const oldState = {
        password: 'oldSecretPassword123',
        otp: '123456',
        email: 'test@example.com',
      };

      const newState = {
        password: 'newSecretPassword456',
        otp: '654321',
        email: 'test@example.com',
      };

      const diff = computeFieldDiff(oldState, newState);

      expect(diff.hasChanges).toBe(true);
      const pwChange = diff.changedFields.find((f) => f.field === 'password');
      expect(pwChange?.oldValue).toBe('[REDACTED]');
      expect(pwChange?.newValue).toBe('[REDACTED]');

      const otpChange = diff.changedFields.find((f) => f.field === 'otp');
      expect(otpChange?.oldValue).toBe('[REDACTED]');
      expect(otpChange?.newValue).toBe('[REDACTED]');
    });

    it('returns hasChanges false when states are identical', () => {
      const state = { title: 'تور استانبول', capacity: 20 };
      const diff = computeFieldDiff(state, { ...state });
      expect(diff.hasChanges).toBe(false);
      expect(diff.changedFields.length).toBe(0);
    });
  });
});
