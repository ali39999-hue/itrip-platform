// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ReferralsClientPage } from './ReferralsClientPage';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { mockCreate, mockUpdate, mockGetUsers } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetUsers: vi.fn(),
}));

vi.mock('@/actions/admin', () => ({
  settleLeaderRewardAction: vi.fn(),
  createReferralCodeAction: (...args: unknown[]) => mockCreate(...args),
  updateReferralCodeAction: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('@/actions/admin-users', () => ({
  getAdminUsers: (...args: unknown[]) => mockGetUsers(...args),
}));

function renderPage() {
  return render(
    <NextIntlClientProvider locale="fa" messages={{}}>
      <ReferralsClientPage initialData={[]} />
    </NextIntlClientProvider>
  );
}

describe('ReferralsClientPage leader picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsers.mockResolvedValue({
      success: true,
      users: [{ id: 'usr_leader_1', name: 'علی رضایی', email: null, phone: '09123456789', role: 'CUSTOMER', isActive: true, createdAt: '', roles: [] }],
      total: 1,
    });
    mockCreate.mockResolvedValue({ success: true, referralCode: { id: 'rc1' }, resolvedUnmatched: 0 });
  });

  it('searches leaders by name and submits the picked user id (no manual ID needed)', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /تعریف کد معرف جدید/ }));
    fireEvent.change(screen.getByPlaceholderText(/علی رضایی/), { target: { value: 'علی' } });

    await waitFor(() => expect(mockGetUsers).toHaveBeenCalledWith({ search: 'علی', limit: 6 }));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option'));

    // Picked chip shows the full user id (previously only 12 chars in the list).
    expect(screen.getByText('usr_leader_1')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('DAMAVAND1403'), { target: { value: 'kooh99' } });
    fireEvent.click(screen.getByRole('button', { name: /ایجاد کد/ }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ code: 'KOOH99', leaderId: 'usr_leader_1' })
    );
  });

  it('falls back to a pasted ID when search finds nobody (server validates)', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [], total: 0 });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /تعریف کد معرف جدید/ }));
    fireEvent.change(screen.getByPlaceholderText(/علی رضایی/), { target: { value: 'usr_9' } });

    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled());
    expect(screen.getByText(/کاربری یافت نشد/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('DAMAVAND1403'), { target: { value: 'DAM1' } });
    fireEvent.click(screen.getByRole('button', { name: /ایجاد کد/ }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ code: 'DAM1', leaderId: 'usr_9' })
    );
  });

  it('opens edit modal and submits updated variables for an existing referral code', async () => {
    mockUpdate.mockResolvedValue({ success: true, referralCode: { id: 'rc_existing' } });

    const sampleLeader = {
      id: 'rc_existing',
      code: 'LEADER50',
      leaderId: 'usr_leader_1',
      leaderName: 'علی رضایی',
      leaderPhone: '09123456789',
      leaderEmail: 'leader@firuzo.com',
      isActive: true,
      confirmedPax: 3,
      pendingPax: 0,
      cancelledPax: 0,
      discountPercent: 0.05,
      maxDiscountCapIrr: 50_000_000,
      maxUses: null,
      usedCount: 3,
      currentTier: null,
      rewardPercent: 0,
      nextTierDistance: 2,
      nextTierPercent: 0.25,
      estimatedRewardAmount: 0,
      currency: 'IRR',
      settlementStatus: 'NONE' as const,
      travelers: [],
    };

    render(
      <NextIntlClientProvider locale="fa" messages={{}}>
        <ReferralsClientPage initialData={[sampleLeader]} />
      </NextIntlClientProvider>
    );

    // Click on the settings/configure button
    const configBtn = screen.getAllByRole('button', { name: /تنظیمات/ })[0];
    fireEvent.click(configBtn);

    // Edit modal should open with title
    expect(screen.getByText(/تنظیم متغیرهای کد معرف: LEADER50/)).toBeTruthy();

    // Select 10% discount
    const tenPctBtn = screen.getByRole('button', { name: '۱۰٪' });
    fireEvent.click(tenPctBtn);

    // Submit changes
    const saveBtn = screen.getByRole('button', { name: /ذخیره تغییرات/ });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rc_existing',
          isActive: true,
          customTierConfig: expect.stringContaining('"discountPercent":0.1'),
        })
      )
    );
  });
});
