'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KycProfile } from '@/lib/types';

interface User {
  id: string;
  phone: string;
  names: {
    fa: { firstName: string; lastName: string };
    en: { firstName: string; lastName: string };
    ar: { firstName: string; lastName: string };
    zh: { firstName: string; lastName: string };
    ru: { firstName: string; lastName: string };
  };
  // Legacy fields for backward compatibility
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
            names: {
              fa: { firstName: '', lastName: '' },
              en: { firstName: '', lastName: '' },
              ar: { firstName: '', lastName: '' },
              zh: { firstName: '', lastName: '' },
              ru: { firstName: '', lastName: '' },
            },
            firstNameFa: '',
            lastNameFa: '',
            kycApproved: false,
            role: isAdmin ? 'admin' : 'customer',
          },
          kyc: { step: 'name_info', phone },
        });
        return true;
      },
      logout: () => set({ user: null, kyc: { step: 'phone' } }),
      setKycStep: (step) => set((s) => ({ kyc: { ...s.kyc, step } })),
      updateKyc: (data) =>
        set((s) => {
          const updates: { kyc: KycProfile; user?: User | null } = { kyc: { ...s.kyc, ...data } };
          
          if (data.firstNameFa || data.lastNameFa || data.firstNameEn || data.lastNameEn) {
            updates.user = s.user ? {
              ...s.user,
              firstNameFa: data.firstNameFa ?? s.user.firstNameFa,
              lastNameFa: data.lastNameFa ?? s.user.lastNameFa,
              firstNameEn: data.firstNameEn ?? s.user.firstNameEn,
              lastNameEn: data.lastNameEn ?? s.user.lastNameEn,
              names: {
                ...s.user.names,
                ...(data.firstNameFa || data.lastNameFa ? {
                  fa: {
                    firstName: data.firstNameFa ?? s.user.names.fa.firstName,
                    lastName: data.lastNameFa ?? s.user.names.fa.lastName,
                  },
                } : {}),
                ...(data.firstNameEn || data.lastNameEn ? {
                  en: {
                    firstName: data.firstNameEn ?? s.user.names.en.firstName,
                    lastName: data.lastNameEn ?? s.user.names.en.lastName,
                  },
                } : {}),
              },
            } : null;
          }
          
          return updates;
        }),
    }),
    { name: 'firuzo-auth' }
  )
);
