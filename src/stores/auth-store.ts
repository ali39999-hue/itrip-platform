'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KycProfile } from '@/lib/types';

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
        if (otp !== OTP_CODE) return false;
        const isAdmin = phone.endsWith('0000');
        set({
          user: {
            id: 'u-' + phone.slice(-4),
            phone,
            firstNameFa: 'کاربر',
            lastNameFa: 'فیروز',
            kycApproved: true,
            role: isAdmin ? 'admin' : 'customer',
          },
          kyc: { step: 'approved', phone },
        });
        return true;
      },
      logout: () => set({ user: null, kyc: { step: 'phone' } }),
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
    { name: 'firuzo-auth' }
  )
);
