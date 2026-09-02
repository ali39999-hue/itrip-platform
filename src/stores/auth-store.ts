'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KycProfile } from '@/lib/types';
import { verifyOtpAndLogin, logoutUser } from '@/actions/auth';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      kyc: { step: 'phone' },
      login: async (phone, otp) => {
        const res = await verifyOtpAndLogin(phone, otp);
        if (!res.success || !res.user) {
          return false;
        }

        set({
<<<<<<< HEAD
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
=======
          user: res.user,
          kyc: { step: 'approved', phone },
>>>>>>> 18d50a2e8c73fd47bf64739b52ba0272b11cc043
        });
        return true;
      },
      logout: () => {
        logoutUser().catch((e) => console.error('NextAuth logout failed', e));
        set({ user: null, kyc: { step: 'phone' } });
      },
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
