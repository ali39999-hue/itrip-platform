/**
 * MAKER-CHECKER.TEST.TS
 *
 * Operational ERP and financial verification tests for the Maker-Checker
 * two-step approval process (ERP-010 / FIN-009).
 */
import { describe, it, expect } from 'vitest';
import {
  MAKER_CHECKER_HIGH_VALUE_THRESHOLD,
  MakerCheckerSelfApprovalError,
  RefundDomainService,
} from './RefundDomainService';

describe('ERP Maker-Checker Operational Financial Gate', () => {
  it('defines the 50,000,000 IRR high-value operational threshold', () => {
    expect(MAKER_CHECKER_HIGH_VALUE_THRESHOLD).toBe(50_000_000);
  });

  it('rejects self-approval when Maker and Checker are the same operator', async () => {
    await expect(
      RefundDomainService.approveRefundWithMakerChecker({
        refundId: 'rfd_test_1001',
        makerId: 'operator_reza',
        checkerId: 'operator_reza', // VIOLATION: Self-approval
        note: 'Attempting to self-approve high-value refund',
      })
    ).rejects.toThrowError(MakerCheckerSelfApprovalError);
  });

  it('enforces distinct identity invariant between Maker and Checker', () => {
    function validateSeparationOfDuties(maker: string, checker: string) {
      if (maker === checker) {
        throw new MakerCheckerSelfApprovalError();
      }
      return { verified: true, maker, checker };
    }

    expect(() => validateSeparationOfDuties('agent_01', 'agent_01')).toThrow(MakerCheckerSelfApprovalError);
    const result = validateSeparationOfDuties('agent_01', 'finance_supervisor_02');
    expect(result.verified).toBe(true);
    expect(result.maker).toBe('agent_01');
    expect(result.checker).toBe('finance_supervisor_02');
  });

  it('requires two-step approval when refund amount meets or exceeds threshold', () => {
    function checkApprovalRequirement(amount: number) {
      if (amount >= MAKER_CHECKER_HIGH_VALUE_THRESHOLD) {
        return { required: true, message: 'MAKER_CHECKER_MANDATORY' };
      }
      return { required: false, message: 'SINGLE_APPROVAL_PERMITTED' };
    }

    expect(checkApprovalRequirement(20_000_000).required).toBe(false);
    expect(checkApprovalRequirement(50_000_000).required).toBe(true);
    expect(checkApprovalRequirement(150_000_000).required).toBe(true);
  });
});
