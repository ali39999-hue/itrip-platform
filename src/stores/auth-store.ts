'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KycProfile } from '@/lib/types';
import { loginWithCredentials, logoutUser } from '@/actions/auth';

interface User {
  id: string;
  phone: string;
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn?: string;
  lastNameEn?: string;
  kycApproved: boolean;
  role: 'customer' | 'admin';
}

interface AuthState {
  user: User | null;
  kyc: KycProfile;
  login: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  setKycStep: (step: KycProfile['step']) => void;
  updateKyc: (data: Partial<KycProfile>) => void;
}

const OTP_CODE = '12345';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      kyc: { step: 'phone' },
      login: async (phone, otp) => {
        await new Promise((r) => setTimeout(r, 600));

        const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

        // In production / non-demo mode, mock OTP bypasses are completely disabled
        if (!isDemo) {
          return false;
        }

        if (otp !== OTP_CODE && otp !== '1234' && otp.length !== 4 && otp.length !== 5) return false;
        const isAdmin = phone.endsWith('0000');

        // Sync with NextAuth (Server side)
        try {
          const email = isAdmin ? 'admin@firuzo.com' : 'user@firuzo.com';
          await loginWithCredentials(email, 'demo');
        } catch (e) {
          console.error('NextAuth login failed', e);
        }

        set({
          user: {
            id: isAdmin ? 'clr_admin_123' : 'clr_mock_user_123',
            phone,
            firstNameFa: isAdmin ? 'ادمین' : 'کاربر',
            lastNameFa: 'فیروز',
            kycApproved: true,
            role: isAdmin ? 'admin' : 'customer',
          },
          kyc: { step: 'approved', phone },
        });
        return true;
      },
      logout: () => {
        logoutUser().catch((e) => console.error('NextAuth logout failed', e));
        set({ user: null, kyc: { step: 'phone' } });
      },
      setKycStep: (step) => set((s) => ({ kyc: { ...s.kyc, step } })),
      updateKyc: (data) =>
        set((s) => ({
          kyc: { ...s.kyc, ...data },
          ...(data.firstNameFa
            ? {
                user: s.user
                  ? { ...s.user, firstNameFa: data.firstNameFa, lastNameFa: data.lastNameFa ?? s.user.lastNameFa }
                  : null,
              }
            : {}),
        })),
    }),
    {
      name: 'firuzo-auth',
      version: 2,
      partialize: (state) => ({
        user: state.user
          ? {
              id: state.user.id,
              phone: state.user.phone,
              firstNameFa: state.user.firstNameFa,
              lastNameFa: state.user.lastNameFa,
              firstNameEn: state.user.firstNameEn,
              lastNameEn: state.user.lastNameEn,
              kycApproved: state.user.kycApproved,
              role: state.user.role,
            }
          : null,
      }) as unknown as AuthState,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { user?: User };
        if (version < 2) {
          return {
            user: state?.user || null,
            kyc: { step: 'phone' },
          } as unknown as AuthState;
        }
        return persistedState as AuthState;
      },
    }
  )
);
