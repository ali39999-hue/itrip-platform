import { describe, it, expect } from 'vitest';
import { BookingStateMachine, BookingState } from '@/domains/booking/state-machine';
import { ROLE_DEFAULT_PERMISSIONS } from '@/domains/identity/permissions';

describe('ERP Domain Tests: State Machine Transitions', () => {
  it('allows valid state machine progressions', () => {
    expect(BookingStateMachine.canTransition('DRAFT', 'HELD')).toBe(true);
    expect(BookingStateMachine.canTransition('HELD', 'PENDING_PAYMENT')).toBe(true);
    expect(BookingStateMachine.canTransition('PENDING_PAYMENT', 'PAYMENT_CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransition('PAYMENT_CONFIRMED', 'CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransition('CONFIRMED', 'CANCEL_REQUESTED')).toBe(true);
  });

  it('rejects invalid state machine skips', () => {
    expect(BookingStateMachine.canTransition('DRAFT', 'CONFIRMED')).toBe(false);
    expect(BookingStateMachine.canTransition('DRAFT', 'REFUNDED')).toBe(false);
    expect(BookingStateMachine.canTransition('CONFIRMED', 'DRAFT')).toBe(false);
  });

  it('throws an error on illegal transitions via assertTransition', () => {
    expect(() => {
      BookingStateMachine.assertTransition('DRAFT' as BookingState, 'CONFIRMED' as BookingState);
    }).toThrow(/Invalid state transition/);
  });
});

describe('ERP Domain Tests: RBAC Permissions', () => {
  it('assigns full operational and financial permissions to SUPER_ADMIN', () => {
    const adminPerms = ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN;
    expect(adminPerms).toContain('booking:view:all');
    expect(adminPerms).toContain('finance:reports:view');
    expect(adminPerms).toContain('booking:refund:approve');
    expect(adminPerms).toContain('inventory:manage');
  });

  it('restricts customer permissions to basic booking creations', () => {
    const customerPerms = ROLE_DEFAULT_PERMISSIONS.CUSTOMER;
    expect(customerPerms).toContain('booking:create');
    expect(customerPerms).not.toContain('finance:reports:view');
    expect(customerPerms).not.toContain('booking:refund:approve');
  });
});
