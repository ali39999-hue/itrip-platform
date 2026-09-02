'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KycProfile } from '@/lib/types';
import { verifyOtpAndLogin, logoutUser, type AuthChannel } from '@/actions/auth';

interface User {
  id: string;
  phone: string;
  email?: string;
  names?: {
    fa: { firstName: string; lastName: string };
    en: { firstName: string; lastName: string };
    ar: { firstName: string; lastName: string };
    zh: { firstName: string; lastName: string };
    ru: { firstName: string; lastName: string };
  };
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn?: string;
  lastNameEn?: string;
  kycApproved: boolean;
  role: 'customer' | 'admin';
  channel?: AuthChannel;
  telegramId?: string;
  whatsappPhone?: string;
  wechatId?: string;
}

interface AuthState {
  user: User | null;
  kyc: KycProfile;
  login: (identifier: string, otp: string, channel?: AuthChannel) => Promise<boolean>;
  logout: () => void;
  setKycStep: (step: KycProfile['step']) => void;
  updateKyc: (data: Partial<KycProfile>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      kyc: { step: 'phone' },
      login: async (identifier, otp, channel: AuthChannel = 'phone') => {
        const res = await verifyOtpAndLogin(identifier, otp, channel);
        if (!res.success || !res.user) {
          return false;
        }

        set({
          user: res.user,
          kyc: { step: 'approved', phone: res.user.phone },
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
          const updates: { kyc: KycProfile; user?: User | null } = {
            kyc: { ...s.kyc, ...data },
          };

          if (
            data.firstNameFa ||
            data.lastNameFa ||
            data.firstNameEn ||
            data.lastNameEn
          ) {
            updates.user = s.user
              ? {
                  ...s.user,
                  firstNameFa: data.firstNameFa ?? s.user.firstNameFa,
                  lastNameFa: data.lastNameFa ?? s.user.lastNameFa,
                  firstNameEn: data.firstNameEn ?? s.user.firstNameEn,
                  lastNameEn: data.lastNameEn ?? s.user.lastNameEn,
                  names: {
                    ...(s.user.names || {
                      fa: { firstName: '', lastName: '' },
                      en: { firstName: '', lastName: '' },
                      ar: { firstName: '', lastName: '' },
                      zh: { firstName: '', lastName: '' },
                      ru: { firstName: '', lastName: '' },
                    }),
                    ...(data.firstNameFa || data.lastNameFa
                      ? {
                          fa: {
                            firstName: data.firstNameFa ?? s.user.names?.fa.firstName ?? s.user.firstNameFa,
                            lastName: data.lastNameFa ?? s.user.names?.fa.lastName ?? s.user.lastNameFa,
                          },
                        }
                      : {}),
                    ...(data.firstNameEn || data.lastNameEn
                      ? {
                          en: {
                            firstName: data.firstNameEn ?? s.user.names?.en.firstName ?? s.user.firstNameEn ?? '',
                            lastName: data.lastNameEn ?? s.user.names?.en.lastName ?? s.user.lastNameEn ?? '',
                          },
                        }
                      : {}),
                  },
                }
              : null;
          }

          return updates;
        }),
    }),
    {
      name: 'firuzo-auth',
      version: 3,
      partialize: (state) =>
        ({
          user: state.user
            ? {
                id: state.user.id,
                phone: state.user.phone,
                email: state.user.email,
                firstNameFa: state.user.firstNameFa,
                lastNameFa: state.user.lastNameFa,
                firstNameEn: state.user.firstNameEn,
                lastNameEn: state.user.lastNameEn,
                kycApproved: state.user.kycApproved,
                role: state.user.role,
                channel: state.user.channel,
                telegramId: state.user.telegramId,
                whatsappPhone: state.user.whatsappPhone,
                wechatId: state.user.wechatId,
                names: state.user.names,
              }
            : null,
        }) as unknown as AuthState,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { user?: User };
        if (version < 3) {
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
